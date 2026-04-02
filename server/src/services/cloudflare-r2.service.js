import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const mimeExtensionMap = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

const trimSlashes = (value = "") => String(value).trim().replace(/^\/+|\/+$/g, "");
const sanitizeToken = (value = "", { fallback = "item", maxLength = 80 } = {}) => {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);

  return normalized || fallback;
};

const normalizeMetadata = (metadata = {}) =>
  Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [sanitizeToken(key, { fallback: "meta", maxLength: 40 }), String(value)]),
  );

const resolveFileExtension = (file) => {
  const originalExtension = path.extname(file?.originalname || "").toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  return mimeExtensionMap[file?.mimetype] || "";
};

const buildProductObjectKey = (file, metadata = {}) => {
  const extension = resolveFileExtension(file);
  const vendorId = sanitizeToken(metadata.vendorId, { fallback: "vendor" });
  const productId = sanitizeToken(metadata.productId, { fallback: "draft" });
  const productName = sanitizeToken(metadata.productName || path.parse(file?.originalname || "").name, {
    fallback: "product-image",
  });
  const slotSuffix =
    metadata.slot === undefined || metadata.slot === null ? "" : `-${Number(metadata.slot) + 1}`;
  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  return path.posix.join(
    "products",
    vendorId,
    `${productId}-${productName}${slotSuffix}-${uniqueSuffix}${extension}`,
  );
};

let r2Client;

const getR2Client = () => {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.cloudflareR2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.cloudflareR2AccessKeyId,
        secretAccessKey: env.cloudflareR2SecretAccessKey,
      },
    });
  }

  return r2Client;
};

export const hasCloudflareR2Config = () =>
  Boolean(
    env.cloudflareR2AccountId &&
      env.cloudflareR2AccessKeyId &&
      env.cloudflareR2SecretAccessKey &&
      env.cloudflareR2BucketName &&
      env.cloudflareR2PublicBaseUrl,
  );

export const uploadProductImageToR2 = async (file, metadata = {}) => {
  if (!hasCloudflareR2Config()) {
    throw new ApiError(
      500,
      "Cloudflare R2 is not configured. Add the R2 account, bucket, key, secret, and public URL env vars.",
    );
  }

  if (!file?.path) {
    throw new ApiError(400, "Uploaded product image is missing a temporary file path.");
  }

  const objectKey = buildProductObjectKey(file, metadata);
  const fileBody = await fs.readFile(file.path);

  try {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: env.cloudflareR2BucketName,
        Key: objectKey,
        Body: fileBody,
        ContentType: file.mimetype || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: normalizeMetadata({
          type: "product",
          vendorId: metadata.vendorId,
          productId: metadata.productId,
          productName: metadata.productName,
          originalName: file.originalname,
        }),
      }),
    );
  } catch (error) {
    throw new ApiError(502, error?.message || "Failed to upload product image to Cloudflare R2.");
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }

  return {
    key: objectKey,
    url: `${env.cloudflareR2PublicBaseUrl}/${trimSlashes(objectKey)}`,
  };
};

export const uploadProductImagesToR2 = async (files, metadataFactory = () => ({})) =>
  Promise.all(
    (files || []).map((file, index) => uploadProductImageToR2(file, metadataFactory(file, index))),
  );
