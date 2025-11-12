/**
 * Utility functions for reclamation chatbot
 */

import Groq from 'groq-sdk';

/**
 * Analyze reclamation message with GROQ and return insights
 */
export async function analyzeReclamationWithGroq(message, reclamationContext = {}) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return getDefaultAnalysis(message);
  }

  try {
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are an expert customer support analyst for RiseUP, an e-learning platform.
Analyze the customer's message and provide:

1. Classification: bug, feature-request, support, billing, or other
2. Priority: low, medium, or high
3. Sentiment: positive, negative, or neutral
4. Key issues mentioned
5. Suggested solutions

Respond ONLY with a JSON object, no markdown:
{
  "classification": "category",
  "priority": "level",
  "sentiment": "emotion",
  "key_issues": ["issue1", "issue2"],
  "suggested_solutions": ["solution1", "solution2"],
  "confidence": 0.85
}`;

    const response = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const responseText = response.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse analysis response:', e);
    }

    return getDefaultAnalysis(message);
  } catch (e) {
    console.error('GROQ analysis error:', e);
    return getDefaultAnalysis(message);
  }
}

/**
 * Generate solutions for a reclamation
 */
export async function generateSolutions(title, description, category) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return getDefaultSolutions(category);
  }

  try {
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a support specialist. Generate 3-5 practical solutions for the customer issue.

Respond ONLY with a JSON object:
{
  "solutions": ["solution1", "solution2", "solution3"],
  "priority_actions": ["action1", "action2"]
}`;

    const userMessage = `Category: ${category}
Title: ${title}
Description: ${description}

Generate helpful solutions.`;

    const response = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const responseText = response.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          solutions: parsed.solutions || [],
          priority_actions: parsed.priority_actions || [],
        };
      }
    } catch (e) {
      console.error('Failed to parse solutions:', e);
    }

    return getDefaultSolutions(category);
  } catch (e) {
    console.error('GROQ solutions error:', e);
    return getDefaultSolutions(category);
  }
}

/**
 * Generate a professional response for a reclamation
 */
export async function generateResponse(message, chatHistory = []) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return 'Thank you for your message. Our support team will review your concern shortly.';
  }

  try {
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a professional customer support representative for RiseUP, an e-learning platform.
Provide a helpful, empathetic response to the customer. Keep responses concise and actionable.
Respond in the same language as the user.`;

    // Build message history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((msg) => ({
        role: msg.role === 'admin' ? 'assistant' : msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    return response.choices?.[0]?.message?.content || getDefaultResponse();
  } catch (e) {
    console.error('GROQ response generation error:', e);
    return getDefaultResponse();
  }
}

/**
 * Classify reclamation priority based on keywords
 */
export function classifyPriorityHeuristic(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const highPriorityKeywords = [
    'urgent', 'critical', 'crash', 'broken', 'not working', 'emergency',
    'data loss', 'security', 'billing error', 'account locked', 'can\'t login'
  ];

  const lowPriorityKeywords = [
    'enhancement', 'cosmetic', 'suggestion', 'idea', 'small change', 'minor'
  ];

  if (highPriorityKeywords.some(kw => text.includes(kw))) {
    return 'high';
  }

  if (lowPriorityKeywords.some(kw => text.includes(kw))) {
    return 'low';
  }

  return 'medium';
}

/**
 * Classify reclamation category based on keywords
 */
export function classifyCategoryHeuristic(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (/bug|issue|error|crash|not working|broken|doesn't work|problem/.test(text)) {
    return 'bug';
  }
  if (/feature|request|add|implement|would like|could you/.test(text)) {
    return 'feature-request';
  }
  if (/billing|payment|charge|money|credit|price/.test(text)) {
    return 'billing';
  }
  if (/how|help|guide|tutorial|confused|don't understand/.test(text)) {
    return 'support';
  }

  return 'other';
}

/**
 * Default analysis when GROQ is unavailable
 */
export function getDefaultAnalysis(message) {
  return {
    classification: classifyCategoryHeuristic(message, ''),
    priority: classifyPriorityHeuristic(message, ''),
    sentiment: detectSentiment(message),
    key_issues: extractKeywords(message),
    suggested_solutions: [
      'Contact our support team for detailed assistance',
      'Check our help documentation',
      'Try clearing your browser cache',
      'Contact support at support@riseup.com'
    ],
    confidence: 0.6,
  };
}

/**
 * Default solutions when GROQ is unavailable
 */
export function getDefaultSolutions(category = 'other') {
  const categoryMap = {
    bug: [
      'Clear your browser cache and cookies',
      'Try a different browser or device',
      'Disable browser extensions',
      'Contact technical support',
      'Check system status page'
    ],
    'feature-request': [
      'Thank you for the suggestion!',
      'Vote on similar feature requests',
      'Share your use case details',
      'Check our roadmap for upcoming features'
    ],
    billing: [
      'Review your invoice in account settings',
      'Contact billing support',
      'Check payment method details',
      'View billing history'
    ],
    support: [
      'Check our help documentation',
      'View tutorials and guides',
      'Contact support team',
      'Join our community forum'
    ],
  };

  return {
    solutions: categoryMap[category] || categoryMap.other,
    priority_actions: [
      'Document the issue',
      'Contact support',
      'Follow up within 24 hours'
    ],
  };
}

/**
 * Default response when GROQ is unavailable
 */
export function getDefaultResponse() {
  return 'Thank you for your message. Our support team has been notified and will respond to your concern shortly.';
}

/**
 * Detect sentiment from text (simple heuristic)
 */
export function detectSentiment(text) {
  const t = text.toLowerCase();

  const positiveWords = [
    'good', 'great', 'awesome', 'thanks', 'happy', 'satisfied', 'love',
    'perfect', 'excellent', 'amazing', 'wonderful', '😊', '👍'
  ];

  const negativeWords = [
    'bad', 'terrible', 'hate', 'angry', 'frustrated', 'disappointed', 'worse',
    'broken', 'don\'t work', 'doesn\'t work', 'awful', 'horrible', '😞', '👎'
  ];

  let positiveCount = positiveWords.filter(w => t.includes(w)).length;
  let negativeCount = negativeWords.filter(w => t.includes(w)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text, limit = 3) {
  // Simple keyword extraction: exclude common words
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'is', 'are', 'was', 'were', 'be', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !commonWords.has(w));

  // Count frequency
  const freq = {};
  words.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });

  // Return top keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Format chat message for display
 */
export function formatChatMessage(message) {
  return {
    role: message.role,
    content: message.content,
    timestamp: message.timestamp ? new Date(message.timestamp).toLocaleString() : new Date().toLocaleString(),
    source: message.sourceModel || 'system',
  };
}

/**
 * Validate reclamation message
 */
export function validateReclamationMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }

  if (message.trim().length < 3) {
    return { valid: false, error: 'Message must be at least 3 characters' };
  }

  if (message.length > 2000) {
    return { valid: false, error: 'Message must not exceed 2000 characters' };
  }

  return { valid: true };
}
