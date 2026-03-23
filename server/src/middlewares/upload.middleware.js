import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const folder =
      file.fieldname === "idDocument"
        ? "vendor-docs"
        : file.fieldname === "avatar"
          ? "avatars"
          : "products";
    const uploadPath = path.join(__dirname, "../../uploads", folder);
    ensureDirectory(uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

export const upload = multer({ storage });
