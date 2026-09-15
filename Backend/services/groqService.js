import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import dotenv from "dotenv";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { SUMMARY_PROMPT } from "../prompts/summaryPrompt.js";

dotenv.config();

function buildOptimizePrompt(prompt, summary) {
    if (!summary || summary.trim() === "") {
        return prompt;
    }

    return `Conversation Summary

${summary}

Current Prompt

${prompt}`;
}

function buildSummaryInput(oldSummary, buffer) {
    const promptsText = buffer
        .map((prompt, index) => `${index + 1}. ${prompt}`)
        .join("\n\n");

    return `Old Summary

${oldSummary || "(none)"}

Recent Prompts (optimized versions — infer the user's underlying intent and current focus; do not over-weight implementation details)

${promptsText}`;
}

export const optimizePrompt = async (prompt, summary = "") => {
    try {
        const { text } = await generateText({
            model: groq("openai/gpt-oss-120b"),
            system: SYSTEM_PROMPT,
            prompt: buildOptimizePrompt(prompt, summary),
            temperature: 0,
        });
        return text.trim();
    } catch (error) {
        console.error("Groq Service Error:", error);
        throw error;
    }
};

export const updateConversationSummary = async (oldSummary, buffer) => {
    try {
        const { text } = await generateText({
            model: groq("openai/gpt-oss-120b"),
            system: SUMMARY_PROMPT,
            prompt: buildSummaryInput(oldSummary, buffer),
            temperature: 0,
        });
        return text.trim();
    } catch (error) {
        console.error("Groq Summary Service Error:", error);
        throw error;
    }
};
