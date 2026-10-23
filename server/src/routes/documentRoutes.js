import express from "express";
import {
  uploadDocument,
  getMyDocuments,
  getDocument,
  deleteDocument,
} from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";
import uploadPdf from "../middleware/uploadPdf.js";

const router = express.Router();

router.post("/", protect, uploadPdf.single("file"), uploadDocument);
router.get("/", protect, getMyDocuments);
router.get("/:id", protect, getDocument);
router.delete("/:id", protect, deleteDocument);

export default router;
