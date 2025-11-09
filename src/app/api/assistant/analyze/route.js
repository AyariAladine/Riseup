import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimiter';
// Gemini removed: using Groq only for AI grading
import Groq from 'groq-sdk';
let __groqModelsCache = null;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    console.log('[Assistant] ===== NEW REQUEST TO /api/assistant/analyze =====');
    
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rl = rateLimit(`assistant:${ip}`, 8, 60_000);
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });

    const form = await req.formData();
    const message = (form.get('message') || '').toString();
    const screenshot = form.get('screenshot');
    const file = form.get('file');
    const taskContext = form.get('taskContext'); // Get task context from form data
    
    console.log('[Assistant] Request data:', {
      hasMessage: !!message,
      hasScreenshot: !!screenshot,
      hasFile: !!file,
      hasTaskContext: !!taskContext,
      taskContextPreview: taskContext ? taskContext.substring(0, 100) : null
    });
    
    // Parse task context if available
    let taskLanguage = null;
    let taskTitle = '';
    let taskDescription = '';
    if (taskContext) {
      try {
        const task = JSON.parse(taskContext);
        taskTitle = task.title || '';
        taskDescription = task.description || '';
        
        // Detect expected language from task title and description
        const taskText = `${taskTitle} ${taskDescription}`.toLowerCase();
        if (/\b(javascript|js|node|react|vue|angular|typescript|ts)\b/.test(taskText)) {
          taskLanguage = 'javascript';
        } else if (/\b(python|py|django|flask|pandas)\b/.test(taskText)) {
          taskLanguage = 'python';
        } else if (/\b(java|spring|maven)\b/.test(taskText)) {
          taskLanguage = 'java';
        } else if (/\b(c\+\+|cpp|c)\b/.test(taskText)) {
          taskLanguage = 'cpp';
        } else if (/\b(php|laravel)\b/.test(taskText)) {
          taskLanguage = 'php';
        } else if (/\b(ruby|rails)\b/.test(taskText)) {
          taskLanguage = 'ruby';
        } else if (/\b(go|golang)\b/.test(taskText)) {
          taskLanguage = 'go';
        } else if (/\b(rust)\b/.test(taskText)) {
          taskLanguage = 'rust';
        }
      } catch (e) {
        console.error('Failed to parse task context:', e);
      }
    }
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

      // Detect submitted file language
      let submittedLanguage = null;
      if (ext === 'py' || /def\s+\w+\(|import\s+\w+|print\(/.test(text)) {
        submittedLanguage = 'python';
      } else if (['js', 'jsx', 'ts', 'tsx', 'mjs'].includes(ext) || /(function|=>|console\.log|import\s+.*from|export\s+(default|const)|const\s+\w+\s*=)/.test(text)) {
        submittedLanguage = 'javascript';
      } else if (ext === 'java' || /public\s+class|System\.out\.println|import\s+java\./.test(text)) {
        submittedLanguage = 'java';
      } else if (['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(ext) || /#include\s*<|std::|cout\s*<</.test(text)) {
        submittedLanguage = 'cpp';
      } else if (ext === 'php' || /<\?php|echo\s+|\$\w+\s*=/.test(text)) {
        submittedLanguage = 'php';
      } else if (ext === 'rb' || /def\s+\w+|puts\s+|require\s+/.test(text)) {
        submittedLanguage = 'ruby';
      } else if (ext === 'go' || /package\s+main|func\s+\w+|import\s+\(/.test(text)) {
        submittedLanguage = 'go';
      } else if (ext === 'rs' || /fn\s+\w+|let\s+mut|use\s+std::/.test(text)) {
        submittedLanguage = 'rust';
      }

      // Check for language mismatch
      if (taskLanguage && submittedLanguage && taskLanguage !== submittedLanguage) {
        const languageNames = {
          javascript: 'JavaScript/TypeScript',
          python: 'Python',
          java: 'Java',
          cpp: 'C/C++',
          php: 'PHP',
          ruby: 'Ruby',
          go: 'Go',
          rust: 'Rust'
        };
        return NextResponse.json({
          analysis: `❌ **Wrong Language Detected**\n\nThis task requires ${languageNames[taskLanguage] || taskLanguage.toUpperCase()}, but you submitted ${languageNames[submittedLanguage] || submittedLanguage.toUpperCase()} code.\n\nTask: ${taskTitle}\n${taskDescription ? `Description: ${taskDescription}\n` : ''}\nPlease resubmit your solution in the correct programming language.`,
          score: 0,
          passed: false,
          hints: [
            `Read the task requirements carefully - it specifies ${languageNames[taskLanguage] || taskLanguage.toUpperCase()}`,
            `Your submitted file (${file.name}) contains ${languageNames[submittedLanguage] || submittedLanguage.toUpperCase()} code`,
            `Rewrite your solution using ${languageNames[taskLanguage] || taskLanguage.toUpperCase()} before resubmitting`
          ],
          source: 'validation'
        }, { status: 200 });
      }

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
        
        // Build rubric with task context if available
        let rubric = `You are a strict grader. Based on the user's challenge description and the provided evidence (screenshot summary and/or code sample), provide:
1) analysis: whether the submission meets the challenge requirements (concise).
2) score: number from 0 to 100 (objective, tough but fair).
3) passed: boolean (>= 60 is pass).
4) hints: 3-5 concrete, actionable improvements.`;
        
        if (taskTitle) {
          rubric += `\n\nIMPORTANT - This is a specific task challenge:
Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}
${taskLanguage ? `Required Language: ${taskLanguage.toUpperCase()}` : ''}

Verify that:
- The solution addresses the specific task requirements
- The code is in the correct programming language (if specified)
- The implementation matches what the task is asking for
- If the language is wrong, give 0 points immediately`;
        }
        
        rubric += `\n\nReturn only JSON with fields: { analysis: string, score: number, passed: boolean, hints: string[] }.`;
        
        const screenshotNote = screenshot ? `Screenshot attached by user (size ~${screenshot?.size ? Math.round(screenshot.size/1024) + ' KB' : 'unknown'}). Describe what you infer from a typical task screenshot; actual image bytes are not included.` : 'No screenshot.';
        const fileNote = req.__fileName ? `Submitted file: ${req.__fileName}. Sample:
--- BEGIN SAMPLE ---
${req.__fileTextSample || ''}
--- END SAMPLE ---` : 'No file attached.';
        const history = [];
        if (message) history.push({ role: 'user', content: `Challenge description:\n${message}` });
        history.push({ role: 'user', content: `${screenshotNote}\n\n${fileNote}` });
        let lastErr;
        let groqResponse = null;
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
            groqResponse = r.choices?.[0]?.message?.content || '';
            const txt = groqResponse;
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
        // Store the conversation for later use
        req.__gradingHistory = history;
        req.__groqResponse = groqResponse;
        // Removed early return here - continue to task completion logic
        if (lastErr && verbose) console.error('Groq grading ultimate failure:', lastErr);
      } catch (e) {
        if (verbose) console.error('Groq grading outer failure:', e);
      }
    }
    // Gemini path removed: rely on Groq or heuristics

  const passed = score >= 60;
  const out = { analysis, score, passed, hints, source };
  
  console.log(`[Assistant] Grading complete. Score: ${score}, Passed: ${passed}, Task context present: ${!!taskContext}`);
  
  // If score >= 70 and we have a task context, complete the task and mint NFT
  if (score >= 70 && taskContext) {
    try {
      const task = JSON.parse(taskContext);
      const taskId = task._id;
      
      console.log(`[Assistant] Task ${taskId} scored ${score} (≥70). Attempting to complete...`);
      
      // Build comprehensive conversation from the grading session
      const conversation = [
        { 
          role: 'user', 
          content: message || 'Submitted solution for grading',
          timestamp: new Date().toISOString()
        },
        ...(req.__gradingHistory || []).map((msg) => ({
          ...msg,
          timestamp: new Date().toISOString()
        })),
        { 
          role: 'assistant', 
          content: req.__groqResponse || analysis,
          timestamp: new Date().toISOString()
        },
        { 
          role: 'system', 
          content: `Final Grade: ${score}/100 - ${passed ? 'PASSED ✅' : 'FAILED ❌'}\n\nAnalysis: ${analysis}\n\nHints: ${hints.join(', ') || 'None'}`,
          timestamp: new Date().toISOString()
        }
      ];
      
      // Get user from request
      const { getUserFromRequest } = await import('@/lib/auth');
      const { user } = await getUserFromRequest(req);
      
      if (user && taskId) {
        console.log(`[Assistant] User authenticated: ${user.id}. Calling grade endpoint...`);
        
        // Call the grade endpoint to complete the task
        const gradeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks/${taskId}/grade`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            conversation,
            score,
            notes: `Completed via Challenge Bot. ${hints.length > 0 ? 'Hints: ' + hints.join(', ') : ''}`
          })
        });
        
        if (gradeResponse.ok) {
          const gradeData = await gradeResponse.json();
          console.log(`[Assistant] ✅ Task completed successfully!`, gradeData);
          out.taskCompleted = true;
          out.message = '🎉 Task completed! NFT badge is being minted...';
        } else {
          const errorText = await gradeResponse.text();
          console.error('[Assistant] ❌ Failed to complete task:', gradeResponse.status, errorText);
          out.taskCompletionError = errorText;
        }
      } else {
        console.error('[Assistant] Missing user or taskId:', { hasUser: !!user, taskId });
      }
    } catch (error) {
      console.error('[Assistant] Error completing task:', error);
      out.taskCompletionError = error.message;
    }
  }
  
  return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// fallback helpers moved to src/lib/assistant-fallbacks.js
