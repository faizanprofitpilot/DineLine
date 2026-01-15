/**
 * Pre-cached filler phrases to eliminate dead air
 * These should be generated and cached at startup
 */
export const FILLER_PHRASES = [
  "One moment.",
  "Okay.",
  "Got it.",
  "Thanks. Let me note that.",
  "Sure.",
  "I understand.",
  "Right.",
];

/**
 * Get a random filler phrase (can be used to rotate)
 */
export function getRandomFillerPhrase(): string {
  return FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
}

/**
 * Get the first filler phrase (consistent, cached)
 * This is what we'll use for immediate response
 */
export function getFillerPhrase(): string {
  return FILLER_PHRASES[0]; // "One moment." - simple and quick
}

