import { Storage } from "@google-cloud/storage";

// Lazy initialization - only create when needed
let storage: Storage | null = null;
let bucket: any = null;

function getStorage() {
  if (!storage) {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || "estimagent",
    });
  }
  return storage;
}

function getBucket() {
  if (!bucket) {
    const bucketName = process.env.GCS_BUCKET || "estimagent-uploads";
    bucket = getStorage().bucket(bucketName);
  }
  return bucket;
}

/**
 * Generate a signed URL for direct browser upload to GCS
 * Browser will PUT file directly to this URL
 */
export async function generateSignedUploadUrl(
  filename: string,
  contentType: string = "application/octet-stream"
): Promise<{ signedUrl: string; publicUrl: string }> {
  try {
    const bucketObj = getBucket();
    const file = bucketObj.file(filename);

    // Generate signed URL valid for 15 minutes
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    // Public URL for reading the file
    const bucketName = process.env.GCS_BUCKET || "estimagent-uploads";
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    console.log(`[GCS] Generated signed URL for ${filename}`);
    return { signedUrl, publicUrl };
  } catch (error) {
    console.error("[GCS] Error generating signed URL:", error);
    throw error;
  }
}

/**
 * Delete a file from GCS
 */
export async function deleteFile(filename: string): Promise<void> {
  try {
    await getBucket().file(filename).delete();
    console.log(`[GCS] Deleted ${filename}`);
  } catch (error) {
    console.error("[GCS] Error deleting file:", error);
    throw error;
  }
}

/**
 * List files in bucket
 */
export async function listFiles(prefix?: string): Promise<string[]> {
  try {
    const [files] = await getBucket().getFiles({ prefix });
    return files.map((f: any) => f.name);
  } catch (error) {
    console.error("[GCS] Error listing files:", error);
    throw error;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(filename: string): Promise<any> {
  try {
    const [metadata] = await getBucket().file(filename).getMetadata();
    return metadata;
  } catch (error) {
    console.error("[GCS] Error getting metadata:", error);
    throw error;
  }
}
