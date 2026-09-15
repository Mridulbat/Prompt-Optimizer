/**
 * Lightweight, dependency-free similarity utilities used by the
 * prompt-caching layer. Uses bag-of-words term-frequency vectors and
 * cosine similarity — cheap enough to run against a bounded candidate
 * set on every cache lookup, with no external embedding API required.
 */

// Standard English stopwords, extended with question/instruction words
// that are near-universal in this app's domain ("what", "how", "does",
// "explain", "can", etc). Without these, two UNRELATED prompts that both
// happen to start with "explain how X works" or "what is Y" look
// artificially similar to a bag-of-words model, purely from shared
// sentence scaffolding rather than shared topic. This is the main
// lever for reducing false positives without raising the threshold
// (raising the threshold instead would also suppress true matches).
const STOPWORDS = new Set([
    "a", "an", "the", "of", "to", "in", "on", "for", "and", "or",
    "is", "are", "was", "were", "be", "been", "being", "with", "as", "that",
    "this", "it", "its", "at", "by", "from", "into", "about", "than",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
    "them", "their", "what", "which", "who", "whom", "these", "those",
    "am", "have", "has", "had", "having", "do", "does", "did", "doing",
    "but", "if", "because", "until", "while", "against", "between",
    "through", "during", "before", "after", "above", "below", "up",
    "down", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all",
    "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "too",
    "very", "can", "will", "just", "should", "now", "explain",
    "please", "could", "would", "tell", "show", "give",
]);

/**
 * Lowercases, strips punctuation, and collapses whitespace.
 */
export const normalizeText = (text = "") =>
    text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();


const stemWord = (word) => {
    if (word.length <= 3) return word;
    if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
    if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
    if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
    if (word.endsWith("es") && word.length > 4 && !word.endsWith("ss")) return word.slice(0, -2);
    if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
    return word;
};


export const tokenize = (normalizedText) =>
    normalizedText
        .split(" ")
        .filter((word) => word.length > 1 && !STOPWORDS.has(word))
        .map(stemWord);

/**
 * Builds a term-frequency map: { word: count }.
 */
export const termFrequency = (tokens) => {
    const freq = {};
    for (const token of tokens) {
        freq[token] = (freq[token] || 0) + 1;
    }
    return freq;
};

/**
 * Cosine similarity between two term-frequency maps.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
export const cosineSimilarity = (freqA, freqB) => {
    const keysA = Object.keys(freqA);
    const keysB = Object.keys(freqB);

    if (keysA.length === 0 || keysB.length === 0) return 0;

    let dotProduct = 0;
    for (const key of keysA) {
        if (freqB[key]) {
            dotProduct += freqA[key] * freqB[key];
        }
    }

    const magnitudeA = Math.sqrt(keysA.reduce((sum, k) => sum + freqA[k] ** 2, 0));
    const magnitudeB = Math.sqrt(keysB.reduce((sum, k) => sum + freqB[k] ** 2, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
};


export const buildSimilarityProfile = (rawText) => {
    const normalized = normalizeText(rawText);
    const tokens = tokenize(normalized);
    const freq = termFrequency(tokens);
    return { normalized, tokens, freq, tokenCount: tokens.length };
};