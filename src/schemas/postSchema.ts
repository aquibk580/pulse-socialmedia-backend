import z, { ZodSchema } from "zod";

const createPostSchema: ZodSchema = z.object({
  caption: z.string().min(1, "Name is required").optional(),
  isAcrchived: z.boolean().optional(),
});


export { createPostSchema }