import { nanoid } from "nanoid";
import {
  USAGE_QUOTA,
  USER_UPLOADS,
  type InsertUserUpload,
} from "~/server/database/schema";
import { sql } from "drizzle-orm";

function getExtension(file: File) {
  // More comprehensive MIME type to extension mapping
  const mimeToExtension: Record<string, string> = {
    // Images
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/ico": "ico",
    "image/svg+xml": "svg",

    // Audio
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/aac": "aac",
    "audio/x-m4a": "m4a",

    // Video
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",

    // Documents
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "text/plain": "txt",
    "text/csv": "csv",

    // Compressed
    "application/zip": "zip",
    "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
    "application/gzip": "gz",
    "application/x-tar": "tar",
  };

  // Fallback method if MIME type is not in the mapping
  const extension = mimeToExtension[file.type];
  if (extension) return extension;

  // If no extension found, try to extract from filename
  const filenameParts = file.name.split(".");
  if (filenameParts.length > 1) {
    return filenameParts[filenameParts.length - 1].toLowerCase();
  }

  // Last resort: return a generic extension or null
  return "bin"; // Binary file as a fallback
}

export default defineEventHandler(async (event) => {
  const body = await readFormData(event);
  const board_id = decodeURIComponent(event.context.params?.id || "");
  const profile_id = event.context.session.secure.profileId;

  // Removed strict filtering to match original behavior
  const files = [...body.entries()].filter(
    ([_, entry]) => entry instanceof File
  ) as [string, File][];

  const fids = files.map(([_, file]) => {
    return `${nanoid()}.${getExtension(file)}`;
  });

  const filePromises = files.map(async ([id, file], index) => {
    const fileName = fids[index];
    return useStorage("tackpad").setItemRaw(
      fileName,
      Buffer.from(await file.arrayBuffer())
    );
  });

  const results = await Promise.allSettled(filePromises);

  const response = results.reduce(
    (acc, result, index) => {
      const key = files[index][0];
      if (result.status === "fulfilled") {
        acc.data.push({
          board_id,
          profile_id,
          file_url: `https://assets.tackpad.xyz/${fids[index]}`,
          file_name: fids[index],
          file_type: files[index][1].type,
          file_size: files[index][1].size,
          created_at: new Date().toISOString(),
        });
        acc.keys[files[index][0]] = `https://assets.tackpad.xyz/${fids[index]}`;
      } else {
        acc.keys[files[index][0]] = null;
      }
      return acc;
    },
    { data: [], keys: {} } as {
      data: InsertUserUpload[];
      keys: Record<string, string | null>;
    }
  );

  try {
    const db = useDrizzle();
    if (response.data.length > 0) {
      const consumption = response.data.reduce((acc, file) => {
        return acc + (file?.file_size || 0);
      }, 0);

      await db.insert(USER_UPLOADS).values(response.data);
      await db
        .insert(USAGE_QUOTA)
        .values({
          profile_id,
          consumption,
          updated_at: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: USAGE_QUOTA.profile_id,
          set: {
            consumption: sql`${USAGE_QUOTA.consumption} + ${consumption}`,
          },
        });
    }
  } catch (error) {
    console.error("Error uploading files:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to upload files",
    });
  }

  return response.keys;
});
