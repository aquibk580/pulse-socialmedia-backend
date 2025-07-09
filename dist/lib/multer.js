import multer from "multer";
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/")) {
        cb(null, true);
    }
    else {
        cb(new Error("Only image and video files are allowed."));
    }
};
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter,
});
export { upload };
