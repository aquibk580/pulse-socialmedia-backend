import { Router } from "express";
import { addPost } from "../../controllers/user/post.js";
import { isLoggedIn } from "../../middlewares/auth.js";
import { upload } from "../../lib/multer.js";

const router: Router = Router();

router.post(
  "/addpost",
  isLoggedIn,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  addPost
);

export default router;
