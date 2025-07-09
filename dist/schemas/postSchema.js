import z from "zod";
const createPostSchema = z.object({
    caption: z.string().min(1, "Name is required").optional(),
    isAcrchived: z.boolean().optional(),
});
export { createPostSchema };
