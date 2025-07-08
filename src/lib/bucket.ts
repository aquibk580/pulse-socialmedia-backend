import { nanoid } from "nanoid";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToBucket(
  file: Express.Multer.File
): Promise<string> {
  const fileExt = path.extname(file.originalname);
  const baseName = path
    .basename(file.originalname, fileExt)
    .replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${baseName}-${nanoid()}${fileExt}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}
