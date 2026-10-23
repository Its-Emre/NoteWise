import express from "express";
import { retrieve } from "../controllers/retrieveController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, retrieve);

export default router;
