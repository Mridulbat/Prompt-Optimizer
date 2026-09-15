import { optimizePrompt } from "../services/groqService.js";
import { findSimilarCachedPrompt, saveToCache } from "../services/cacheService.js";

export const optimize = async (req, res) => {
    try {
        const { prompt, summary } = req.body;

        if (!prompt || prompt.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Prompt is required."
            });
        }

        
        const cacheResult = await findSimilarCachedPrompt(prompt, summary || "");

        if (cacheResult) {
            return res.status(200).json({
                success: true,
                optimizedPrompt: cacheResult.optimizedPrompt,
                cache: {
                    hit: true,
                    similarity: Number(cacheResult.score.toFixed(4)),
                },
            });
        }

        // 2. Cache miss 
        const optimizedPrompt = await optimizePrompt(prompt, summary || "");

        // 3. Populate the cache for next time 
        saveToCache(prompt, summary || "", optimizedPrompt);

        // Send response
        return res.status(200).json({
            success: true,
            optimizedPrompt,
            cache: {
                hit: false,
            },
        });

    } catch (error) {
        console.error("Error optimizing prompt:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to optimize prompt."
        });
    }
};