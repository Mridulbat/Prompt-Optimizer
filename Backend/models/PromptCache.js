import mongoose from "mongoose";


const PromptCacheSchema = new mongoose.Schema(
    {
        rawPrompt: {
            type: String,
            required: true,
        },
        normalizedPrompt: {
            type: String,
            required: true,
        },
        summaryHash: {
            type: String,
            required: true,
            index: true,
        },
        tokenFreq: {
            type: Map,
            of: Number,
            required: true,
        },
        tokenCount: {
            type: Number,
            required: true,
        },
        optimizedPrompt: {
            type: String,
            required: true,
        },
        hitCount: {
            type: Number,
            default: 0,
        },
        lastUsedAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// TTL index — MongoDB automatically deletes documents once expiresAt passes.
PromptCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PromptCache ||
    mongoose.model("PromptCache", PromptCacheSchema);