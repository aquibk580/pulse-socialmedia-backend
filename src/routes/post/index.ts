import { Router } from "express";
import { getAllPosts } from "../../controllers/post/index.js";

const router:Router = Router();

// Get All Posts
router.get("/", getAllPosts);



export default router;