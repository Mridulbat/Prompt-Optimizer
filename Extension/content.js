console.log("Prompt Optimizer Loaded");

const STORAGE_KEY = "conversations";
const BUFFER_SIZE = 5;
const API_BASE = "http://localhost:3000/api";

let activeConversationId = null;

function getConversationId() {
    return `${window.location.hostname}${window.location.pathname}`;
}

async function loadAllConversations() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
}

async function loadConversation() {
    const conversationId = getConversationId();
    const all = await loadAllConversations();
    return all[conversationId] || { summary: "", buffer: [] };
}

async function saveConversation(state) {
    const conversationId = getConversationId();
    const all = await loadAllConversations();
    all[conversationId] = state;
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
}

function addPromptToBuffer(state, optimizedPrompt) {
    return {
        ...state,
        buffer: [...state.buffer, optimizedPrompt],
    };
}

function clearBuffer(state) {
    return {
        ...state,
        buffer: [],
    };
}

function resetConversation() {
    return { summary: "", buffer: [] };
}

function checkConversationChanged() {
    const conversationId = getConversationId();
    const changed = activeConversationId !== null && activeConversationId !== conversationId;
    activeConversationId = conversationId;
    return changed;
}

async function updateSummary(state) {
    const response = await fetch(`${API_BASE}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            summary: state.summary,
            buffer: state.buffer,
        }),
    });

    if (!response.ok) {
        throw new Error("Summary update failed");
    }

    const data = await response.json();
    return {
        summary: data.summary,
        buffer: [],
    };
}

function getInputBox() {
    const claudeInput = document.querySelector('[data-testid="chat-input"]');
    if (claudeInput) return claudeInput;

    const chatgptInput = document.querySelector("#prompt-textarea");
    if (chatgptInput) return chatgptInput;

    return null;
}

function getPromptText(input) {
    if ("value" in input) {
        return input.value.trim();
    }
    return input.innerText.trim();
}

function replacePrompt(input, text) {
    input.focus();

    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
        ).set;
        nativeSetter.call(input, text);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
    }
}

const button = document.createElement("button");
button.id = "promptOptimizerButton";
button.innerText = "Optimize";
document.body.appendChild(button);

async function optimizePrompt() {
    const input = getInputBox();

    if (!input) {
        alert("Couldn't find the chat input on this page.");
        return;
    }

    const prompt = getPromptText(input);

    if (prompt.length === 0) {
        alert("Prompt is empty.");
        return;
    }

    checkConversationChanged();

    button.classList.add("loading");
    button.innerText = "Optimizing...";

    try {
        let state = await loadConversation();

        const response = await fetch(`${API_BASE}/optimize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt,
                summary: state.summary,
            }),
        });

        if (!response.ok) {
            throw new Error("Optimization failed");
        }

        const data = await response.json();
        replacePrompt(input, data.optimizedPrompt);

        state = addPromptToBuffer(state, data.optimizedPrompt);
        await saveConversation(state);

        if (state.buffer.length >= BUFFER_SIZE) {
            try {
                state = await updateSummary(state);
                await saveConversation(state);
            } catch (error) {
                console.error("Summary update failed, resetting conversation:", error);
                state = resetConversation();
                await saveConversation(state);
            }
        }
    } catch (error) {
        console.error(error);
        alert("Backend unavailable.");
    }

    button.classList.remove("loading");
    button.innerText = "✨ Optimize";
}

button.addEventListener("click", optimizePrompt);
