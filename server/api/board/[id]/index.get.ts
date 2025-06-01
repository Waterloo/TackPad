import { customAlphabet } from "nanoid";
import { getRandomBoardName } from "~/server/utils/boardNames";
import {
  BOARDS,
  BOARD_ACCESS,
  PROFILE,
  BoardAccessRole,
  BoardAccessLevel,
} from "~/server/database/schema";
import { useDrizzle } from "~/server/utils/drizzle";
import { eq, and, sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { navigateTo } from "nuxt/app";

// Define types
type Board = InferSelectModel<typeof BOARDS>;
type NewBoard = InferInsertModel<typeof BOARDS>;
type BoardAccess = InferSelectModel<typeof BOARD_ACCESS>;
type NewBoardAccess = InferInsertModel<typeof BOARD_ACCESS>;

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

export default defineEventHandler(async (event) => {
  const requestedId = decodeURIComponent(event.context.params?.id || "");
  if (!requestedId) {
    throw createError({
      statusCode: 400,
      message: "Board ID is required",
    });
  }

  // --- INPUT VALIDATION ---
  const profileId = event.context.session?.secure?.profileId;
  if (profileId !== undefined && (typeof profileId !== 'string' || !profileId.trim())) {
    throw createError({
      statusCode: 401,
      message: "Invalid session data",
    });
  }

  const db = useDrizzle();
  let boardData: Board | null = null;
  let userAccessData: BoardAccess | null = null;
  let isOwner = false;
  let boardId = requestedId;
  let canEdit = false; // Flag to indicate if user can edit the board

  const now = new Date().toISOString();

  // --- 2. Fetch existing board OR handle creation intent ---
  if (requestedId !== "create") {
    boardId = makeUrlSafe(requestedId);
    if (!boardId) {
        throw createError({
          statusCode: 400,
          message: "Board ID is required and cannot be empty",
        });
    }

    console.debug(`[Board GET] Looking up board: ${boardId}`);
    const result = await db
      .select()
      .from(BOARDS)
      .where(eq(BOARDS.board_id, boardId))
      .limit(1);
     boardData = result[0] ?? null;

   }else {
    boardData = null; // Signal that we need to create
  }

  // --- 3. Handle Board Existence ---
  if (boardData) {
    console.debug(`[Board GET] Found board: ${boardData.board_id}`);

    // --- CHECK FOR ORPHANED BOARD ---
    // An orphaned board has no owner_id or references a non-existent profile
    let isOrphanedBoard = false;

    if (!boardData.owner_id) {
      isOrphanedBoard = true;
      console.log(`[Board GET] Found orphaned board (no owner_id): ${boardData.board_id}`);
    } else {
      // Check if owner profile exists
      try {
        const ownerProfile = await db.query.PROFILE.findFirst({
          where: eq(PROFILE.id, boardData.owner_id)
        });
        if (!ownerProfile) {
          isOrphanedBoard = true;
          console.log(`[Board GET] Found orphaned board (invalid owner_id): ${boardData.board_id}`);
        }
      } catch (error: any) {
        console.error(`[Board GET] Error checking owner profile for board ${boardData.board_id}:`, error.message);
        // Treat as orphaned if we can't verify the owner
        isOrphanedBoard = true;
        console.log(`[Board GET] Treating board as orphaned due to profile lookup error: ${boardData.board_id}`);
      }
    }

    // --- CLAIM ORPHANED BOARD if authenticated ---
    if (isOrphanedBoard && profileId) {
      console.log(`[Board GET] Claiming orphaned board ${boardData.board_id} for profile ${profileId}`);

      try {
        // Use conditional update - only claim if still orphaned
        const claimResult = await db.update(BOARDS)
          .set({ owner_id: profileId })
          .where(and(
            eq(BOARDS.board_id, boardData.board_id),
            sql`owner_id IS NULL` // Only update if still null
          ))
          .returning();

        if (claimResult.length > 0) {
          boardData = claimResult[0];
          console.log(`[Board GET] Successfully claimed board ${boardData.board_id}`);
        } else {
          // Board was already claimed, re-fetch current state
          console.log(`[Board GET] Board was already claimed by someone else`);
          const refreshedResult = await db
            .select()
            .from(BOARDS)
            .where(eq(BOARDS.board_id, boardData.board_id))
            .limit(1);
          boardData = refreshedResult[0];
        }
      } catch (claimError: any) {
        console.error(`[Board GET] Error during board claiming:`, claimError.message);
        // Re-fetch current state on error
        const refreshedResult = await db
          .select()
          .from(BOARDS)
          .where(eq(BOARDS.board_id, boardData.board_id))
          .limit(1);
        boardData = refreshedResult[0];
      }
    }

    // Determine ownership (now includes claimed boards)
    isOwner = !!profileId && boardData.owner_id === profileId;

    // --- 3a. Access Control Check ---
    const hasAccess = await checkBoardAccess(db, boardData, profileId);

    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: "Forbidden: You do not have access to this board.",
      });
    }
    console.debug(
      `[Board GET] Access granted for profile ${profileId || "anonymous"} to board ${boardData.board_id}`,
    );

    // --- 3b. Determine Edit Permissions ---
    canEdit = await canEditBoard(db, boardData, profileId);
    console.debug(
      `[Board GET] Edit permissions for profile ${profileId || "anonymous"}: ${canEdit}`,
    );

    // --- 3c. Fetch and Update User's Access Record (if authenticated) ---
    if (profileId) {
      console.debug(
        `[Board GET] Profile identified: ${profileId}. Fetching/updating access record for board ${boardData.board_id}.`,
      );
      try {
        // Fetch existing access record to determine the correct role to maintain
        const existingAccess = await db.query.BOARD_ACCESS.findFirst({
          where: and(
            eq(BOARD_ACCESS.board_id, boardData.board_id),
            eq(BOARD_ACCESS.profile_id, profileId),
          ),
        });

        // Determine the appropriate role securely
        let role: string;
        if (isOwner) {
          // Owner always gets OWNER role
          role = BoardAccessRole.OWNER;
        } else if (existingAccess?.role && existingAccess.role !== BoardAccessRole.OWNER) {
          // Preserve existing role for non-owners (but never allow OWNER for non-owners)
          role = existingAccess.role;
        } else {
          // Default for new non-owner access
          role = BoardAccessRole.VIEWER;
        }

        // Attempt to insert/update the access record and set last_accessed
        const updateResult = await db
          .insert(BOARD_ACCESS)
          .values({
            board_id: boardData.board_id,
            profile_id: profileId,
            role: role,
            last_accessed: now,
            created_at: existingAccess ? existingAccess.created_at : now,
          })
          .onConflictDoUpdate({
            target: [BOARD_ACCESS.board_id, BOARD_ACCESS.profile_id],
            set: {
              last_accessed: now,
              // Only allow role updates for owners, preserve existing role for others
              ...(isOwner ? { role: BoardAccessRole.OWNER } : {}),
            },
          })
          .returning();

        if (updateResult && updateResult.length > 0) {
          userAccessData = updateResult[0];
          console.debug(
            `[Board GET] Upserted and fetched access record for profile ${profileId} on board ${boardData.board_id}. Role: ${userAccessData?.role}, LastAccessed: ${userAccessData?.last_accessed}`,
          );
        } else {
          // Fallback: If returning() is not supported or didn't return, query separately
          console.warn(
            `[Board GET] Upsert did not return data. Querying access record separately.`,
          );
          const accessResult = await db
            .select()
            .from(BOARD_ACCESS)
            .where(
              and(
                eq(BOARD_ACCESS.board_id, boardData.board_id),
                eq(BOARD_ACCESS.profile_id, profileId),
              ),
            )
            .limit(1);
          userAccessData = accessResult[0] ?? null;
          if (!userAccessData) {
            console.error(
              `[Board GET] CRITICAL: Failed to find access record after upsert attempt.`,
            );
          }
        }
      } catch (accessError: any) {
        console.error(
          `[Board GET] Error upserting/fetching BOARD_ACCESS:`,
          accessError.message,
        );
        userAccessData = null;
      }
    } else {
      console.debug(
        `[Board GET] No profileId identified. Cannot fetch/update access record.`,
      );
    }  } else {
    // --- Scenario: Board Does Not Exist (Create Request or Invalid ID) ---

    // Handle case where a specific ID was requested but not found
    if (requestedId !== "create") {
      console.warn(`[Board GET] Board not found with requested ID: ${boardId}`);
      throw createError({
        statusCode: 404,
        message: `Board not found with ID: ${boardId}`,
      });
    }

    // Proceed with creation only if requestedId was 'create'
    console.log(`[Board GET] 'create' requested. Attempting creation.`);

    if (!profileId) {
      console.error(
        "[Board GET] Cannot create board: No profileId identified.",
      );
      throw createError({
        statusCode: 401,
        message: "Cannot create board without identified user.",
      });
    }

    boardId = `BOARD-${nanoid(10)}`; // Generate new ID for 'create'

    try {
      // Create the board entry
      boardData = await createAndSaveNewBoard(makeUrlSafe(boardId), profileId);
      isOwner = true; // Creator is the owner
      canEdit = true; // Creator can edit
      console.log(`[Board GET] Created new board ${boardData.board_id}`);

      // Create the initial OWNER access record
      const initialAccessValues: NewBoardAccess = {
        board_id: boardData.board_id,
        profile_id: profileId,
        role: BoardAccessRole.OWNER,
        created_at: now,
        last_accessed: now,
      };
      await db.insert(BOARD_ACCESS).values(initialAccessValues);

      // Fetch the just-created access record
      const accessResult = await db
        .select()
        .from(BOARD_ACCESS)
        .where(
          and(
            eq(BOARD_ACCESS.board_id, boardData.board_id),
            eq(BOARD_ACCESS.profile_id, profileId),
          ),
        )
        .limit(1);
      userAccessData = accessResult[0] ?? null;

      if (!userAccessData) {
        console.error(
          `[Board GET] CRITICAL: Failed to fetch newly created access record.`,
        );
      }
    } catch (creationError: any) {
      console.error(
        `[Board GET] Error during board creation process:`,
        creationError.message,
      );
      throw createError({
        statusCode: 500,
        message: `Failed to create board: ${creationError.message}`,
      });
    }
  }

  // --- 4. Return Response ---
  if (!boardData) {
    console.error("[Board GET] Reached end of handler but boardData is null.");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: Failed to load or create board data.",
    });
  }

  // Return the main board data, ownership status, and access information
  return {
    data: {
      board_id: boardData.board_id,
      owner_id: boardData.owner_id,
      access_level: boardData.access_level,
      data: boardData.data,
    },
    isOwner: isOwner,
    canEdit: canEdit,
    settings: userAccessData,
  };
});

// Helper function to sanitize board IDs
function makeUrlSafe(str: string): string {
  return str
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Function to create and save a new board
async function createAndSaveNewBoard(
  board_id: string,
  owner_id: string,
): Promise<Board> {
  const db = useDrizzle();
  const newBoardData: NewBoard = {
    board_id: board_id,
    owner_id: owner_id,
    data: {
      /* ... default content ... */
    },
  };

  // Default content definition
  newBoardData.data = {
    title: getRandomBoardName(),
    items: [
      {
        id: `STICKY-${nanoid(10)}`,
        kind: "note",
        content: {
          text: ` <h1>Welcome to your board!</h1>
      <p>Try adding more notes and todo lists.</p>
      <h2>Quick Tips:</h2>
      <ul>
        <li>
          <p>Double-click to edit notes</p>
        </li>
        </ul>`,
          color: "#FFD700",
        },
        x_position: 100,
        y_position: 48,
        width: 300,
        height: 300,
      },
      {
        id: `TODO-${nanoid(10)}`,
        kind: "todo",
        content: {
          title: "Getting Started",
          tasks: [
            { task_id: "1", content: "Add a new note", completed: false },
            { task_id: "2", content: "Create a todo list", completed: false },
            {
              task_id: "3",
              content: "Try panning and zooming",
              completed: false,
            },
          ],
        },
        x_position: 420,
        y_position: 48,
        width: 300,
        height: 400,
      },
    ],
  };

  await db.insert(BOARDS).values(newBoardData).onConflictDoNothing();
  const result = await db
    .select()
    .from(BOARDS)
    .where(eq(BOARDS.board_id, board_id))
    .limit(1);
  if (!result[0]) {
    throw new Error(`Failed to retrieve newly created board: ${board_id}`);
  }
  return result[0];
}

/**
 * Checks if a user has access to view a board based on access level and permissions
 */
async function checkBoardAccess(
  db: any,
  board: Board,
  profileId: string | undefined,
): Promise<boolean> {
  // If the user is the owner, they always have access
  if (profileId && board.owner_id === profileId) {
    return true;
  }

  // Check access based on the board's access level
  switch (board.access_level) {
    case BoardAccessLevel.PUBLIC:
    case BoardAccessLevel.VIEW_ONLY:
    case BoardAccessLevel.LIMITED_EDIT:
      // These are publicly viewable by anyone
      return true;

    case BoardAccessLevel.PRIVATE_SHARED:
    case BoardAccessLevel.ADMIN_ONLY:
      // These require specific access rights
      if (!profileId) {
        return false; // Anonymous users cannot access private boards
      }

      // Check if the user has been granted access
      const accessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, board.board_id),
          eq(BOARD_ACCESS.profile_id, profileId),
        ),
      });

      return !!accessRecord; // Return true if a record exists

    default:
      console.warn(`[Board GET] Unknown access level: ${board.access_level}`);
      return false; // Default to denying access for unknown levels
  }
}

/**
 * Determines if a user can edit a board based on access level and permissions
 */
async function canEditBoard(
  db: any,
  board: Board,
  profileId: string | undefined,
): Promise<boolean> {
  // If the user is the owner, they always have edit rights
  if (profileId && board.owner_id === profileId) {
    return true;
  }

  // Anonymous users cannot edit boards except PUBLIC ones
  if (!profileId) {
    return board.access_level === BoardAccessLevel.PUBLIC;
  }

  // Check edit rights based on the board's access level
  switch (board.access_level) {
    case BoardAccessLevel.PUBLIC:
      // Anyone can edit
      return true;

    case BoardAccessLevel.LIMITED_EDIT: {
      // Need to check if user has EDITOR or OWNER role
      const editorAccessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, board.board_id),
          eq(BOARD_ACCESS.profile_id, profileId),
          sql`${BOARD_ACCESS.role} IN ('editor', 'owner')`,
        ),
      });
      return !!editorAccessRecord;
    }

    case BoardAccessLevel.PRIVATE_SHARED:
      // Need to check user's role in BOARD_ACCESS
      const privateAccessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, board.board_id),
          eq(BOARD_ACCESS.profile_id, profileId),
        ),
      });

      // Can edit if role is EDITOR or OWNER
      return (
        privateAccessRecord &&
        (privateAccessRecord.role === BoardAccessRole.EDITOR ||
          privateAccessRecord.role === BoardAccessRole.OWNER)
      );

    case BoardAccessLevel.VIEW_ONLY:
      // Only admin/owner can edit
      return false; // Regular users cannot edit VIEW_ONLY boards

    case BoardAccessLevel.ADMIN_ONLY:
      // Only admin/owner can view and edit
      // This is actually redundant since we've already checked for owner
      return false;

    default:
      console.warn(`[Board GET] Unknown access level: ${board.access_level}`);
      return false; // Default to denying edit access for unknown levels
  }
}
