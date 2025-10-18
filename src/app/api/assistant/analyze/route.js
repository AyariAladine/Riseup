import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimiter';
// Gemini removed: using Groq only for AI grading
import Groq from 'groq-sdk';
let __groqModelsCache = null;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rl = rateLimit(`assistant:${ip}`, 8, 60_000);
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });

    const form = await req.formData();
    const message = (form.get('message') || '').toString();
  const screenshot = form.get('screenshot');
  const file = form.get('file');
  // mode is locked to grader by product decision (kept as a concept, not needed as a variable)

  let analysis = '';
  let score = 0;
  const hints = [];

    if (message) {
      if (message.length < 20) hints.push('Add more context to your description so I can grade accurately.');
      analysis += `Challenge summary: ${message.slice(0, 500)}`;
    }

    // Image heuristic: check basic presence and size
    if (screenshot && typeof screenshot.arrayBuffer === 'function') {
      if (screenshot.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Screenshot too large. Max 5MB.' }, { status: 413 });
      }
      const sizeKb = Math.round(screenshot.size / 1024);
      analysis += (analysis ? '\n\n' : '') + `Screenshot received (${sizeKb} KB). I will verify what I can heuristically.`;
      // Baseline credit for providing visual evidence, even if small
      score += 10;
    }

    // Capture limited text sample from file for LLM prompt and heuristics
    if (file && typeof file.arrayBuffer === 'function') {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 413 });
      }
      const max = 200_000;
      const ab = await file.arrayBuffer();
      const slice = new Uint8Array(ab).slice(0, max);
      const text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      analysis += (analysis ? '\n\n' : '') + `File received: ${file.name} (${Math.round(file.size/1024)} KB).`;

      // naive language detections and scoring rubric
      if (/(function|=>|console\.log|import |export )/.test(text)) {
        score += 25; // JS/TS presence
      }
      // use extension as a small signal (prevents unused-var warnings and gives tiny heuristic boost)
      if (ext === 'py') score += 5;
    if (/class\s+\w+\s*\{/.test(text)) score += 5;
      if (/TODO|FIXME/i.test(text)) hints.push('Remove TODO/FIXME markers before final submission.');
    if (/\b(describe|it|test)\(|assert\(|expect\(/.test(text)) score += 10; // tests present
      if (/sql|SELECT|INSERT|CREATE\s+TABLE/i.test(text)) score += 10;
      if (/def\s+\w+\(|print\(/.test(text)) score += 15; // Python
      if (/public\s+class|System\.out\.println/.test(text)) score += 10; // Java
      if (/echo\s+|\$\w+\s*=/.test(text)) score += 8; // PHP

      // simplistic formatting quality signals
      const longLines = text.split(/\r?\n/).filter((l) => l.length > 120).length;
      if (longLines > 10) hints.push('Consider breaking long lines to improve readability.');
      const hasReadme = /#\s*readme|##\s*usage/i.test(text);
      if (hasReadme) score += 5;
      // Preserve a small sample to pass to Gemini
      req.__fileTextSample = text.slice(0, 8000);
      req.__fileName = file.name;
    }

    // Intent-based heuristics (useful when only a screenshot is provided)
    const intentAdd = /(\badd|\bsum|\bplus|\+)/i.test(message);
    const mentionsTwo = /(two|2)/i.test(message);
    const mentionsPython = /python/i.test(message);
    if (intentAdd && mentionsTwo) score += 10;
    if (mentionsPython) score += 5;

    // Base score and bounds
    if (!file && !screenshot) hints.push('Attach a screenshot or your solution file for a fair grade.');
    // If the user described a basic addition task and provided a screenshot, grant a passing baseline
    if (screenshot && intentAdd && mentionsTwo) {
      score = Math.max(score, 60);
      hints.push('Auto-graded basic addition from screenshot. Attach code for full marks.');
    }
    score = Math.max(0, Math.min(100, score));

    // If Gemini API key available, ask Gemini to grade/guide with a rubric
  const groqKey = process.env.GROQ_API_KEY;
  const verbose = (process.env.AI_VERBOSE || process.env.GEMINI_VERBOSE || '').toLowerCase() === 'true' || process.env.AI_VERBOSE === '1' || process.env.GEMINI_VERBOSE === '1';
    let source = 'heuristic';
    // Try Groq first (text-only; screenshot will be summarized rather than attached)
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const envModels = (process.env.GROQ_MODEL || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!__groqModelsCache) {
          try {
            const list = await groq.models.list();
            __groqModelsCache = (list?.data || []).map(m => m.id);
          } catch (e) {
            if (verbose) console.error('Groq models.list failed:', e?.message || e);
            __groqModelsCache = [];
          }
        }
        const discovered = Array.isArray(__groqModelsCache) ? __groqModelsCache : [];
        const rank = (id) => {
          const s = id.toLowerCase();
          let score = 0;
          if (s.includes('llama-3.3')) score += 100;
          if (s.includes('llama-3.2')) score += 90;
          if (s.includes('llama3')) score += 80;
          if (s.includes('llama')) score += 70;
          if (s.includes('mixtral')) score += 60;
          if (s.includes('gemma') || s.includes('deepseek') || s.includes('qwen')) score += 50;
          if (s.includes('text') || s.includes('instruct') || s.includes('versatile') || s.includes('instant')) score += 10;
          return -score;
        };
        const orderedDiscovered = [...discovered].sort((a,b) => rank(a) - rank(b));
        const candidate = Array.from(new Set([...envModels, ...orderedDiscovered])).slice(0, 8);
        const rubric = `You are a strict grader. Based on the user's challenge description and the provided evidence (screenshot summary and/or code sample), provide:
1) analysis: whether the submission meets the challenge requirements (concise).
2) score: number from 0 to 100 (objective, tough but fair).
3) passed: boolean (>= 60 is pass).
4) hints: 3-5 concrete, actionable improvements.
Return only JSON with fields: { analysis: string, score: number, passed: boolean, hints: string[] }.`;
        const screenshotNote = screenshot ? `Screenshot attached by user (size ~${screenshot?.size ? Math.round(screenshot.size/1024) + ' KB' : 'unknown'}). Describe what you infer from a typical task screenshot; actual image bytes are not included.` : 'No screenshot.';
        const fileNote = req.__fileName ? `Submitted file: ${req.__fileName}. Sample:
--- BEGIN SAMPLE ---
${req.__fileTextSample || ''}
--- END SAMPLE ---` : 'No file attached.';
        const history = [];
        if (message) history.push({ role: 'user', content: `Challenge description:\n${message}` });
        history.push({ role: 'user', content: `${screenshotNote}\n\n${fileNote}` });
        let lastErr;
        for (const m of candidate) {
          try {
            const r = await groq.chat.completions.create({
              model: m,
              messages: [
                { role: 'system', content: rubric },
                ...history,
              ],
              temperature: 0.2,
            });
            const txt = r.choices?.[0]?.message?.content || '';
            const match = String(txt).match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed && typeof parsed === 'object') {
                if (parsed.analysis) analysis = parsed.analysis;
                if (typeof parsed.score === 'number') score = Math.max(0, Math.min(100, parsed.score));
                if (Array.isArray(parsed.hints)) hints.push(...parsed.hints);
                source = 'groq';
                break;
              }
            }
          } catch (err) {
            lastErr = err;
            if (verbose) console.error('Groq grading failed with model:', m, err?.message || err);
          }
        }
        if (source === 'groq') {
          const passed = score >= 60;
          return NextResponse.json({ analysis, score, passed, hints, source });
        }
        if (lastErr && verbose) console.error('Groq grading ultimate failure:', lastErr);
      } catch (e) {
        if (verbose) console.error('Groq grading outer failure:', e);
      }
    }
    // Gemini path removed: rely on Groq or heuristics

  const passed = score >= 60;
  const out = { analysis, score, passed, hints, source };
  return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// fallback helpers moved to src/lib/assistant-fallbacks.js
