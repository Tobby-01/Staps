import { readFile, unlink } from "fs/promises";
import path from "path";

import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export const hasCloudflareImagesConfig = () =>
  Boolean(env.cloudflareImagesAccountId && env.cloudflareImagesApiToken);

const resolveVariantUrl = (result) => {
  if (!Array.isArray(result?.variants) || !result.variants.length) {
    return "";
  }

  if (env.cloudflareImagesVariant) {
    const matchedVariant = result.variants.find((value) =>
      value.endsWith(`/${env.cloudflareImagesVariant}`),
    );
    if (matchedVariant) {
      return matchedVariant;
    }
  }

  return result.variants[0];
};

const deleteTempUpload = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (_error) {
    // Ignore cleanup errors for temporary upload files.
  }
};

export const uploadImageToCloudflare = async (file, metadata = {}) => {
  if (!hasCloudflareImagesConfig()) {
    throw new ApiError(
      500,
      "Cloudflare Images is not configured. Add CLOUDFLARE_IMAGES_ACCOUNT_ID and CLOUDFLARE_IMAGES_API_TOKEN.",
    );
  }

  if (!file?.path) {
    throw new ApiError(400, "Image upload file is missing.");
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.cloudflareImagesAccountId}/images/v1`;

  try {
    const fileBuffer = await readFile(file.path);
    const formData = new FormData();
    const filename = file.originalname || path.basename(file.path);

    formData.append(
      "file",
      new Blob([fileBuffer], { type: file.mimetype || "application/octet-stream" }),
      filename,
    );

    if (Object.keys(metadata).length) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.cloudflareImagesApiToken}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false || !payload.result?.id) {
      throw new ApiError(
        response.status || 500,
        payload.errors?.[0]?.message || payload.message || "Cloudflare image upload failed.",
      );
    }

    const imageUrl = resolveVariantUrl(payload.result);
    if (!imageUrl) {
      throw new ApiError(500, "Cloudflare image upload succeeded but no delivery URL was returned.");
    }

    return {
      id: payload.result.id,
      url: imageUrl,
      filename: payload.result.filename,
    };
  } finally {
    await deleteTempUpload(file.path);
  }
};

export const uploadImagesToCloudflare = async (files, metadataFactory = () => ({})) =>
  Promise.all(
    (files || []).map((file, index) => uploadImageToCloudflare(file, metadataFactory(file, index))),
  );
