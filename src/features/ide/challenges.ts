export type Challenge = {
  id: string;
  title: string;
  prompt: string;
  functionName: string;
  starterCode: string;
  tests: Array<{ name: string; args: unknown[]; expected: unknown }>;
};

export const challenges: Challenge[] = [
  {
    id: 'sum',
    title: 'Sum of Two Numbers',
    prompt: 'Implement a function sum(a, b) that returns the sum of two numbers.',
    functionName: 'sum',
    starterCode: `// Implement sum(a, b)
export function sum(a, b) {
  // your code here
}
`,
    tests: [
      { name: 'adds positives', args: [2, 3], expected: 5 },
      { name: 'adds negatives', args: [-2, -3], expected: -5 },
      { name: 'adds mixed', args: [10, -3], expected: 7 },
    ],
  },
  {
    id: 'factorial',
    title: 'Factorial',
    prompt: 'Implement factorial(n) using iteration or recursion. Assume n is a non-negative integer.',
    functionName: 'factorial',
    starterCode: `// Implement factorial(n)
export function factorial(n) {
  // your code here
}
`,
    tests: [
      { name: '0! = 1', args: [0], expected: 1 },
      { name: '1! = 1', args: [1], expected: 1 },
      { name: '5! = 120', args: [5], expected: 120 },
    ],
  },
  {
    id: 'palindrome',
    title: 'Palindrome',
    prompt: 'Implement isPalindrome(s) that returns true if s reads the same backward as forward, ignoring non-alphanumerics and case.',
    functionName: 'isPalindrome',
    starterCode: `// Implement isPalindrome(s)
export function isPalindrome(s) {
  // your code here
}
`,
    tests: [
      { name: 'racecar', args: ['racecar'], expected: true },
      { name: 'A man, a plan, a canal: Panama', args: ['A man, a plan, a canal: Panama'], expected: true },
      { name: 'hello', args: ['hello'], expected: false },
    ],
  },
];

export default challenges;
