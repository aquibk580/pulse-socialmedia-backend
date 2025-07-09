import { db } from "../../lib/db.js";
async function getAllPosts(req, res) {
    try {
        const take = parseInt(req.query.take) || 10;
        const skip = parseInt(req.query.skip) || 0;
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
export { getAllPosts };
