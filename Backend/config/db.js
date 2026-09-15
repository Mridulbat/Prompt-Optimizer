import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;


export const connectDB = async () => {
    if (isConnected) return;

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.warn(
            "[db] MONGODB_URI is not set. Similarity-based prompt caching will be disabled."
        );
        return;
    }

    try {
        await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        console.log("[db] Connected to MongoDB.");
    } catch (error) {
        isConnected = false;
        console.error("[db] MongoDB connection failed:", error.message);
        console.warn("[db] Continuing without caching — requests will always hit the LLM.");
    }
};

export const isDBConnected = () => isConnected && mongoose.connection.readyState === 1;

export default connectDB;