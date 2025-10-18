// Small rule-based fallback helpers for assistant grading and setup guidance
export function fallbackCodingGuide(msg) {
  const m = (msg || '').toLowerCase();
  // OOP in Python
  if (/\boop\b|object\s*-?oriented|classes?\b/.test(m) && /python/.test(m)) {
    return {
      analysis: [
        'Goal: Learn OOP in Python. Here is a concise learning path:',
        '1) Core concepts: class, object, attribute, method. Understand __init__, self, and instance vs class attributes.',
        '2) Encapsulation: private-like convention (_name) and properties (using @property).',
        '3) Inheritance: subclassing, super().__init__, method overriding.',
        '4) Polymorphism: duck typing, defining common interfaces.',
        '5) Composition vs inheritance: prefer composition for flexibility.',
        '',
        'Example:',
        'class Animal:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        raise NotImplementedError()',
        '',
        'class Dog(Animal):\n    def speak(self):\n        return f"{self.name} says woof"',
        '',
        'd = Dog("Rex"); print(d.speak())  # Rex says woof',
        '',
        'Practice tasks: (a) Create a Shape base class with area(), subclasses for Rectangle/Circle. (b) Add __str__ to provide readable output. (c) Use @property for validation.',
        'Verification: write 2-3 unit tests with pytest to check behaviors.'
      ].join('\n')
    };
  }
  // Sum two numbers in Python
  if (/(sum|add|\+)/.test(m) && /python/.test(m)) {
    return {
      analysis: [
        'Task: Sum two numbers in Python and print the result.',
        'Steps:',
        '1) Read or define the two numbers.',
        '2) Add them using the + operator.',
        '3) Print the result.',
        '',
        'Example:',
        'a, b = 1, 2\nprint(a + b)  # 3',
        '',
        'Extension: read numbers from input()',
        'a = int(input())\nb = int(input())\nprint(a + b)'
      ].join('\n')
    };
  }
  // Generic coding plan
  return {
    analysis: [
      'Coding guide outline:',
      '1) Clarify inputs, outputs, and constraints.',
      '2) Sketch an algorithm and identify edge cases.',
      '3) Write a minimal working example; test on simple inputs.',
      '4) Add error handling and input validation.',
      '5) Refactor into functions/classes, add docstrings.',
      '6) Add 2-3 unit tests and run them.',
    ].join('\n')
  };
}

export function fallbackSetupGuide(msg) {
  const m = (msg || '').toLowerCase();
  const wantsVSCode = /vsc|vs\s*code|visual\s*studio\s*code/.test(m);
  const wantsPython = /python/.test(m);
  const wantsGit = /\bgit\b/.test(m);
  const wantsNode = /node\.js|\bnode\b|npm|pnpm|yarn/.test(m);
  const steps = ['Setup guide (Windows):'];
  if (wantsVSCode || (!wantsPython && !wantsGit && !wantsNode)) {
    steps.push(
      'VS Code: Download from https://code.visualstudio.com/ (official). Install with defaults. Launch VS Code and install the Python extension if needed.'
    );
  }
  if (wantsPython) {
    steps.push(
      'Python 3.x: Download from https://www.python.org/downloads/. During setup, check "Add Python to PATH". Verify in PowerShell: python --version'
    );
  }
  if (wantsGit) {
    steps.push(
      'Git: Download from https://git-scm.com/downloads. Install with recommended options. Verify: git --version'
    );
  }
  if (wantsNode) {
    steps.push(
      'Node.js LTS: Download from https://nodejs.org/en/. Install and verify: node -v and npm -v'
    );
  }
  steps.push('Optional: Install Windows Terminal (Microsoft Store) for a better shell experience.');
  steps.push('After installing, restart VS Code to pick up new PATH values.');
  return { analysis: steps.join('\n') };
}
