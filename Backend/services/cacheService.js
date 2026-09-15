import crypto from "crypto";
import dotenv from "dotenv";
import PromptCache from "../models/PromptCache.js";
import { isDBConnected } from "../config/db.js";
import { normalizeText, buildSimilarityProfile, cosineSimilarity } from "../utils/textSimilarity.js";

dotenv.config();


const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";


const SIMILARITY_THRESHOLD = Number(process.env.CACHE_SIMILARITY_THRESHOLD || 0.85);


const CANDIDATE_LIMIT = Number(process.env.CACHE_CANDIDATE_LIMIT || 200);


const CACHE_TTL_DAYS = Number(process.env.CACHE_TTL_DAYS || 30);

const hashSummary = (summary = "") =>
    crypto.createHash("sha256").update(normalizeText(summary)).digest("hex");


export const findSimilarCachedPrompt = async (prompt, summary = "") => {
    if (!CACHE_ENABLED || !isDBConnected()) return null;

    try {
        const summaryHash = hashSummary(summary);
        const { normalized, freq, tokenCount } = buildSimilarityProfile(prompt);

        if (tokenCount === 0) return null;

        const candidates = await PromptCache.find({ summaryHash })
            .sort({ lastUsedAt: -1 })
            .limit(CANDIDATE_LIMIT)
            .lean();

        let bestMatch = null;
        let bestScore = 0;

        for (const candidate of candidates) {
            // Fast path: identical text after normalization.
            if (candidate.normalizedPrompt === normalized) {
                bestMatch = candidate;
                bestScore = 1;
                break;
            }

            const candidateFreq = candidate.tokenFreq;
            const score = cosineSimilarity(freq, candidateFreq);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidate;
            }
        }

        if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
            // Fire-and-forget hit-tracking update; a failure here shouldn't
            // block returning the cached result to the user.
            PromptCache.updateOne(
                { _id: bestMatch._id },
                { $inc: { hitCount: 1 }, $set: { lastUsedAt: new Date() } }
            ).catch((err) => console.error("[cache] Failed to update hit stats:", err.message));

            return {
                optimizedPrompt: bestMatch.optimizedPrompt,
                score: bestScore,
                cacheId: bestMatch._id,
            };
        }

        return null;
    } catch (error) {
        console.error("[cache] Lookup failed, falling back to LLM:", error.message);
        return null;
    }
};

/**
 * Persists a newly optimized prompt so future similar/duplicate requests
 * can be served from cache. Best-effort — errors are logged, never thrown,
 * so a cache write failure never breaks the API response already sent.
 */
export const saveToCache = async (prompt, summary = "", optimizedPrompt) => {
    if (!CACHE_ENABLED || !isDBConnected()) return;

    try {
        const summaryHash = hashSummary(summary);
        const { normalized, freq, tokenCount } = buildSimilarityProfile(prompt);

        if (tokenCount === 0) return;

        const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

        await PromptCache.create({
            rawPrompt: prompt,
            normalizedPrompt: normalized,
            summaryHash,
            tokenFreq: freq,
            tokenCount,
            optimizedPrompt,
            expiresAt,
        });
    } catch (error) {
        console.error("[cache] Failed to write cache entry:", error.message);
    }
};

export const cacheConfig = {
    enabled: CACHE_ENABLED,
    similarityThreshold: SIMILARITY_THRESHOLD,
    candidateLimit: CANDIDATE_LIMIT,
    ttlDays: CACHE_TTL_DAYS,
};