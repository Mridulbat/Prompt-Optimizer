import { updateConversationSummary } from "../services/groqService.js";

export const updateSummary = async (req, res) => {
    try {
        const { summary, buffer } = req.body;

        if (!Array.isArray(buffer) || buffer.length !== 5) {
            return res.status(400).json({
                success: false,
                message: "Buffer must contain exactly 5 prompts.",
            });
        }

        if (buffer.some((item) => typeof item !== "string" || item.trim() === "")) {
            return res.status(400).json({
                success: false,
                message: "Each buffer item must be a non-empty string.",
            });
        }

        const newSummary = await updateConversationSummary(summary || "", buffer);

        return res.status(200).json({
            success: true,
            summary: newSummary,
        });
    } catch (error) {
        console.error("Error updating summary:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update summary.",
        });
    }
};
