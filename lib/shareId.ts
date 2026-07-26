/**
 * Generates a cryptographically random, URL-safe share ID.
 * Format: 8 characters from a 62-char alphabet.
 * Collision probability at 1M shares: ~0.000001% — acceptable.
 * Never sequential, never guessable, never exposes database IDs.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 8;

export function generateShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}