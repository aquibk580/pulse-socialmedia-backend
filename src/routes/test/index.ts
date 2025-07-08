import { Request, Response, Router } from "express";
import { uploadToBucket } from "../../lib/bucket.js";
import { upload } from "../../lib/multer.js";

const router: Router = Router();

router.post(
  "/upload",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        res.status(400).json({ message: "File is required" });
        return;
      }

      const url = await uploadToBucket(file);
      res.status(200).json({ message: "File uploaded successfully", url });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
  }
);

export default router;
