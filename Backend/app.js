import express from "express";
import optimizeRoute from "./routes/optimizeRoute.js";
import cors from "cors"
const app = express();

app.use(cors());

app.use(express.json());

app.use("/api", optimizeRoute);

export default app;