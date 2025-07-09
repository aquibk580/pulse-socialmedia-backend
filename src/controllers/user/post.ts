import { Request, Response } from "express";
import { createPostSchema } from "../../schemas/postSchema.js";
import { uploadToBucket } from "../../lib/bucket.js";
import { db } from "../../lib/db.js";
import { UserPayload } from "../../types/Payload.js";
import { Image } from "@prisma/client";

interface CustomMulterFiles {
  images?: Express.Multer.File[];
  video?: Express.Multer.File[];
}

async function addPost(req: Request, res: Response) {
  try {
    const userId = (req.user as UserPayload).id;
    const postData = await createPostSchema.parse(req.body);
    const files = req.files as CustomMulterFiles;
    const images = files.images || [];
    const video = files.video?.[0] || null;

    let videoUrl: string | null = null;
    let createdImages: Array<Image> = [];

    if (video) {
      videoUrl = await uploadToBucket(video);
    }

    const post = await db.post.create({
      data: {
        authorId: userId,
        videoUrl,
        ...postData,
      },
    });

    if (images.length > 0) {
      createdImages = await Promise.all(
        images.map(async (image) => {
          const imgurl = await uploadToBucket(image);
          return db.image.create({
            data: { postId: post.id, imgurl },
          });
        })
      );
    }

    res.status(201).json({
      message: "Post created Successfully",
      post,
      images: createdImages,
    });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}

export { addPost };
