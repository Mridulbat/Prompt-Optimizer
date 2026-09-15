/**
 * Benchmark: measures cache hit rate against a realistic workload.
 *
 * Models real usage: a set of "topics" a developer might repeatedly
 * return to across sessions (debugging, explaining a concept, asking
 * for code, etc.), each revisited with paraphrased wording multiple
 * times, mixed in with one-off unique prompts. This is close to what
 * production traffic for this tool would actually look like — someone
 * re-asks about the same handful of things in slightly different words
 * across a work session, rather than sending 100% unique prompts.
 *
 * Usage:
 *   node benchmark-hit-rate.js
 *   node benchmark-hit-rate.js --url http://localhost:3000/api/optimize
 */

const BASE_URL =
    process.argv.includes("--url")
        ? process.argv[process.argv.indexOf("--url") + 1]
        : "http://localhost:3000/api/optimize";

// 15 topics, each with 3-5 paraphrased ways of asking about it.
// Total: ~55 requests, ~40 of which are repeats/paraphrases of an
// earlier topic (should hit), ~15 of which are the first-ever mention
// of a topic (must miss — nothing cached yet).
const TOPICS = [
    ["explain how express middleware works", "how does middleware work in express", "what is express middleware", "can you explain express.js middleware"],
    ["what is the useEffect hook in react", "explain react's useEffect hook", "how does useEffect work", "what does useEffect do in react"],
    ["how do indexes work in mongodb", "explain mongodb indexing", "how do mongodb indexes work", "what are indexes in mongodb"],
    ["what are python decorators", "explain python decorators", "how do decorators work in python"],
    ["explain the difference between let and const", "what's the difference between let and const in javascript", "let vs const explained"],
    ["how does async await work in javascript", "explain async await", "what is async await used for"],
    ["what is a rest api", "explain rest apis", "how do rest apis work", "what does rest stand for in apis"],
    ["explain dependency injection", "what is dependency injection", "how does dependency injection work"],
    ["what is a race condition", "explain race conditions in programming", "how do race conditions happen"],
    ["how does jwt authentication work", "explain jwt tokens", "what is jwt used for"],
    ["what is the event loop in node.js", "explain the node.js event loop", "how does the event loop work"],
    ["explain sql joins", "what are the different types of sql joins", "how do sql joins work"],
    ["what is a closure in javascript", "explain closures", "how do closures work in js"],
    ["what is docker used for", "explain docker containers", "how does docker work"],
    ["explain the observer pattern", "what is the observer design pattern", "how does the observer pattern work"],
];

// Genuinely unrelated one-off prompts — should always miss, and must
// NEVER hit anything above. Any hit here is a false positive.
const UNIQUE_PROMPTS = [
    "write a haiku about autumn",
    "summarize the plot of Dune",
    "draft an email declining a meeting",
    "compare postgres and mysql for a fintech app",
    "explain the CAP theorem",
    "what's a good name for a coffee shop",
    "outline a workout plan for beginners",
    "explain how photosynthesis works",
];

const callOptimize = async (prompt) => {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    });
    return res.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
    let totalRequests = 0;
    let totalHits = 0;
    let expectedHitTotal = 0, expectedHitActual = 0;
    let expectedMissTotal = 0, falsePositives = 0;

    console.log(`Running benchmark against ${BASE_URL}\n`);

    for (const topic of TOPICS) {
        for (let i = 0; i < topic.length; i++) {
            const prompt = topic[i];
            const data = await callOptimize(prompt);
            const hit = data?.cache?.hit === true;

            totalRequests++;
            if (hit) totalHits++;

            if (i === 0) {
                expectedMissTotal++;
                if (hit) falsePositives++;
            } else {
                expectedHitTotal++;
                if (hit) expectedHitActual++;
            }

            await sleep(120);
        }
    }

    for (const prompt of UNIQUE_PROMPTS) {
        const data = await callOptimize(prompt);
        const hit = data?.cache?.hit === true;

        totalRequests++;
        if (hit) totalHits++;
        expectedMissTotal++;
        if (hit) falsePositives++;

        await sleep(120);
    }

    const overallHitRate = ((totalHits / totalRequests) * 100).toFixed(1);
    const trueHitRate = ((expectedHitActual / expectedHitTotal) * 100).toFixed(1);
    const falsePositiveRate = ((falsePositives / expectedMissTotal) * 100).toFixed(1);

    console.log("=== Benchmark Results ===");
    console.log(`Total requests:         ${totalRequests}`);
    console.log(`Total cache hits:       ${totalHits}`);
    console.log(`Overall hit rate:       ${overallHitRate}%`);
    console.log(`True-positive hit rate: ${trueHitRate}% (${expectedHitActual}/${expectedHitTotal} paraphrases correctly matched)`);
    console.log(`False positive rate:    ${falsePositiveRate}% (${falsePositives}/${expectedMissTotal} unrelated prompts wrongly matched)`);
};

run().catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
});