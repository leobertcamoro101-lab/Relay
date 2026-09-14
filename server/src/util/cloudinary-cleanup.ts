import cloudinary from "../config/cloudinary.js";

const extractPublicId = (url: string): string | null => {
  const match = url.match(/relay\/([^/.]+)/);
  return match ? `relay/${match[1]}` : null;
};

const deleteCloudinaryImage = async (publicId?: string | null): Promise<void> => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.log("Failed to clean up orphaned Cloudinary image:", err);
  }
};

export { deleteCloudinaryImage, extractPublicId };