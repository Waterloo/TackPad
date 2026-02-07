import { customAlphabet } from "nanoid";
import { eq, and, or } from "drizzle-orm";
import {
  BOARDS,
  BOARD_ACCESS,
  BoardAccessLevel,
  BoardAccessRole,
} from "~/server/database/schema";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

export const generateItemId = (prefix: string) => `${prefix}-${nanoid()}`;
export const generateBoardId = () => `BOARD-${nanoid()}`;

export const ITEM_DIMENSIONS = {
  note: { width: 300, height: 300 },
  todo: { width: 300, height: 400 },
  bookmark: { width: 300, height: 320 },
  image: { width: 300, height: 200 },
};

export async function checkOAuthEditPermission(
  db: any,
  boardId: string,
  profileId: string,
): Promise<boolean> {
  const board = await db.query.BOARDS.findFirst({
    where: eq(BOARDS.board_id, boardId),
  });

  if (!board) {
    return false;
  }

  if (board.owner_id === profileId) {
    return true;
  }

  switch (board.access_level) {
    case BoardAccessLevel.PUBLIC:
      return true;

    case BoardAccessLevel.LIMITED_EDIT: {
      const accessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, boardId),
          eq(BOARD_ACCESS.profile_id, profileId),
          or(
            eq(BOARD_ACCESS.role, BoardAccessRole.EDITOR),
            eq(BOARD_ACCESS.role, BoardAccessRole.OWNER),
          ),
        ),
      });
      return !!accessRecord;
    }

    case BoardAccessLevel.PRIVATE_SHARED: {
      const accessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, boardId),
          eq(BOARD_ACCESS.profile_id, profileId),
        ),
      });
      return (
        accessRecord &&
        (accessRecord.role === BoardAccessRole.EDITOR ||
          accessRecord.role === BoardAccessRole.OWNER)
      );
    }

    case BoardAccessLevel.VIEW_ONLY:
    case BoardAccessLevel.ADMIN_ONLY:
      return false;

    default:
      return false;
  }
}

export async function loadBoardData(db: any, boardId: string) {
  const board = await db.query.BOARDS.findFirst({
    where: eq(BOARDS.board_id, boardId),
  });

  if (!board) {
    return null;
  }

  return {
    ...board,
    data: (board.data as {
      title?: string;
      items?: Record<string, any>;
    } | null) || {
      title: "Untitled Board",
      items: {},
    },
  };
}

export async function saveBoardData(db: any, boardId: string, data: any) {
  await db.update(BOARDS).set({ data }).where(eq(BOARDS.board_id, boardId));
}

export function getExtension(file: File): string {
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/ico": "ico",
    "image/svg+xml": "svg",
  };

  const extension = mimeToExtension[file.type || ""];
  if (extension) return extension;

  const filenameParts = (file.name || "").split(".");
  if (filenameParts.length > 1) {
    const ext = filenameParts[filenameParts.length - 1];
    return ext ? ext.toLowerCase() : "jpg";
  }

  return "jpg";
}
