import { createPostSchema } from "../../schemas/postSchema.js";
import { uploadToBucket } from "../../lib/bucket.js";
import { db } from "../../lib/db.js";
async function addPost(req, res) {
    try {
        const userId = req.user.id;
        const postData = await createPostSchema.parse(req.body);
        const files = req.files;
        const images = files.images || [];
        const video = files.video?.[0] || null;
        let imageUrls = [];
        let videoUrl = null;
        if (images.length > 0) {
            for (const image of images) {
                imageUrls.push(await uploadToBucket(image));
            }
        }
        if (video) {
            videoUrl = await uploadToBucket(video);
        }
        const post = await db.post.create({
            data: {
                ...postData,
                authorId,
            },
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }
}
export { addPost };
