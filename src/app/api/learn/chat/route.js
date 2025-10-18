import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Cache discovered Groq models for this process (per server instance)
let __groqModelsCache = null;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const groqKey = process.env.GROQ_API_KEY;
    const verbose = (process.env.AI_VERBOSE || process.env.GEMINI_VERBOSE || '').toLowerCase() === 'true' || process.env.AI_VERBOSE === '1' || process.env.GEMINI_VERBOSE === '1';

    const sys = 'You are a friendly coding and setup tutor. Be detailed and structured: numbered steps, short paragraphs, code examples, verification commands, exercises, and next steps. Prefer official docs links.';

    // 1) Groq-first path
    let groqFailedMsg = '';
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
          if (s.includes('qwen') || s.includes('gemma') || s.includes('deepseek')) score += 50;
          if (s.includes('text') || s.includes('instruct') || s.includes('versatile') || s.includes('instant')) score += 10;
          return -score;
        };
        const orderedDiscovered = [...discovered].sort((a, b) => rank(a) - rank(b));
        const models = Array.from(new Set([...envModels, ...orderedDiscovered])).slice(0, 8);

        const history = messages.map(m => ({ role: m.role, content: m.content }));
        let lastErr;
        for (const m of models) {
          try {
            const r = await groq.chat.completions.create({
              model: m,
              messages: [
                { role: 'system', content: sys },
                ...history,
              ],
              temperature: 0.2,
            });
            const reply = r.choices?.[0]?.message?.content?.trim();
            if (reply) return NextResponse.json({ reply, source: 'groq' });
          } catch (err) {
            lastErr = err;
            if (verbose) console.error('Groq model attempt failed:', m, err?.message || err);
          }
        }
        if (lastErr) throw lastErr;
      } catch (e) {
        groqFailedMsg = e?.message || 'Groq request failed';
        if (verbose) console.error('Learn tutor Groq failed:', e);
      }
    }

    // 2) Offline fallback tutor (simple topic-aware version)
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const txt = (lastUser || '').toLowerCase();
    const isOOP = /(\boop\b|object oriented|object-oriented|opp)/i.test(txt);
    const isPython = /python|py\b/.test(txt);
    const isJs = /javascript|node|js\b/.test(txt);
    let fallback = 'Tutor (offline): Could you share a bit more detail? For setup, include OS (Windows/macOS/Linux). For coding, describe inputs/outputs and paste a small snippet if you have one.';
    if (isOOP && isPython) {
      fallback = [
        'Learn OOP in Python — detailed steps:',
        '1) Core concepts',
        '   • Encapsulation: keep state on the object; expose methods.',
        '   • Inheritance: reuse behavior via a base class.',
        '   • Polymorphism: same call, different behavior on subclasses.',
        '   • Abstraction: hide implementation; define clear interfaces.',
        '2) Starter code',
        '   class Animal:',
        '       def __init__(self, name):',
        '           self.name = name',
        '       def speak(self):',
        '           raise NotImplementedError()',
        '',
        '   class Dog(Animal):',
        '       def speak(self):',
        '           return f"{self.name} says woof"',
        '',
        "   rex = Dog('Rex')",
        '   print(rex.speak())  # Rex says woof',
        '3) Exercise 1 (15 min)',
        '   • Add a Cat subclass returning "meow".',
        '   • Add a __str__ method to Animal to show the name.',
        '4) Exercise 2 (20 min)',
        '   • Create Shape (abstract), Rectangle(w,h), Circle(r) with area().',
        '   • Verify polymorphism: for s in [Rectangle(2,3), Circle(1)]: print(s.area())',
        '5) Verify',
        '   • Run: python -m unittest (if you add tests).',
        '   • Lint: pip install ruff ; ruff .',
        '6) Next steps',
        '   • Use @property for getters.',
        '   • Explore abc.ABC for abstract base classes.',
        '   • Read: https://docs.python.org/3/tutorial/classes.html',
        'Ask me for a quiz or more exercises when you’re ready.'
      ].join('\n');
    } else if (isOOP && isJs) {
      fallback = [
        'OOP in JavaScript — detailed steps:',
        '1) Class syntax',
        '   class Animal {',
        '     constructor(name){ this.name = name }',
        "     speak(){ throw new Error('abstract') }",
        '   }',
        '   class Dog extends Animal {',
        "     speak(){ return this.name + ' says woof' }",
        '   }',
        "   console.log(new Dog('Rex').speak());",
        '2) Encapsulation',
        '   • Use #private fields in modern JS.',
        '   • In TypeScript, use private/protected + interfaces.',
        '3) Exercise (20 min)',
        '   • Build Shape, Rectangle, Circle with area().',
        '   • Verify: [new Rectangle(2,3), new Circle(1)].forEach(s => console.log(s.area()))',
        '4) Tooling',
        '   • ESLint + Prettier; run: npm run lint',
        '5) Next steps',
        '   • Learn prototypes under the hood.',
        '   • TS docs OOP: https://www.typescriptlang.org/docs/handbook/2/classes.html',
        'Ask for a quiz or a mini-project idea next!'
      ].join('\n');
    } else if (/install|setup|configure|how to/i.test(txt)) {
      fallback = [
        'Detailed setup (Windows example):',
        '1) Install VS Code: https://code.visualstudio.com/',
        '2) Install Python: https://www.python.org/downloads/ (check "Add Python to PATH").',
        '3) Install Node.js LTS: https://nodejs.org/en',
        '4) Verify in PowerShell:',
        '   python --version ; pip --version ; node --version ; npm --version',
        '5) VS Code extensions: Python, Pylance, ESLint, Prettier.',
        '6) Test run',
        '   • Python: echo "print(\'hello\')" > hello.py ; python hello.py',
        '   • Node:  node -e "console.log(\'hello\')"',
        '7) Next steps',
        '   • Create a virtualenv, pip install requests.',
        '   • Try a small project folder and git init.',
        'Tell me your OS and exact goal; I’ll tailor the steps.'
      ].join('\n');
    } else if (isOOP) {
      fallback = [
        'OOP quick overview — detailed:',
        'Core ideas:',
        '• Encapsulation: keep state private, expose behavior via methods.',
        '• Inheritance: base class -> derived class.',
        '• Polymorphism: override behavior; same call, different result.',
        '• Abstraction: hide internals; focus on essential interface.',
        'Python example:',
        '  class Animal:',
        '    def speak(self):',
        '      raise NotImplementedError()',
        '  class Dog(Animal):',
        '    def speak(self):',
        "      return 'woof'",
        '  print(Dog().speak())',
        'JavaScript example:',
        '  class Animal{ speak(){ throw new Error(\'abstract\') } }',
        "  class Dog extends Animal{ speak(){ return 'woof' } }",
        '  console.log(new Dog().speak())',
        'Exercises:',
        '• Build Shape (abstract), Rectangle, Circle with area().',
        '• Add toString()/__str__ to show details.',
        '• Write 2-3 tests and run them.',
        'Tell me your language to tailor solutions and quizzes.'
      ].join('\n');
    }

    let note = '';
    const partsNotes = [];
    if (!groqKey) partsNotes.push('Groq key missing');
    else if (groqFailedMsg) partsNotes.push(`Groq: ${groqFailedMsg}`);
    const noteMsg = partsNotes.join(' | ');
    note = noteMsg;
    if (note) fallback = fallback + `\n\nNote: ${note}`;
    return NextResponse.json({ reply: fallback, source: 'offline', note });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
