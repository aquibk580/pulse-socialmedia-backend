import { Request, Response } from "express";
import { db } from "../../lib/db.js";

async function getAllPosts(req: Request, res: Response) {
  try {
    const take = parseInt(req.query.take as string) || 10;
    const skip = parseInt(req.query.skip as string) || 0;

    const posts = await db.post.findMany({
      include: {
        author: true,
        images: true,
      },
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
export { getAllPosts };
