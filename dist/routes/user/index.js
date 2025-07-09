import { Router } from "express";
import authRoutes from "./auth.js";
import postRoutes from "./post.js";
const router = Router();
// Auth routes
router.use("/auth", authRoutes);
// Post routes
router.use("/post", postRoutes);
export default router;
