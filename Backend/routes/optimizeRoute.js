import express from "express";
import { optimize } from "../controllers/optimizeController.js";
import { updateSummary } from "../controllers/summaryController.js";

const router = express.Router();

router.post("/optimize", optimize);
router.post("/summary", updateSummary);

export default router;