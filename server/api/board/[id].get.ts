import { customAlphabet } from "nanoid";
import { getRandomBoardName } from "~/server/utils/boardNames";
import {
  BOARDS,
  BOARD_ACCESS,
  BoardAccessRole,
} from "~/server/database/schema";
import { useDrizzle } from "~/server/utils/drizzle";
import { eq, and, sql } from "drizzle-orm"; // Import 'and'
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

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

  // --- 1. Get Profile ID from Middleware Context ---
  const profileId = event.context.session?.secure?.profileId;
  // const isAnonymousUser = event.context.session?.secure?.isAnonymous ?? true; // Keep if needed elsewhere

  const db = useDrizzle();
  let boardData: Board | null = null;
  let userAccessData: BoardAccess | null = null; // <-- To store the user's specific access record
  let isOwner = false;
  let boardId = requestedId;

  const now = new Date(); // Use consistent timestamp for updates if needed manually

  // --- 2. Fetch existing board OR handle creation intent ---
  if (requestedId !== "create") {
    boardId = makeUrlSafe(requestedId);
    console.debug(`[Board GET] Looking up board: ${boardId}`);
    const result = await db
      .select()
      .from(BOARDS)
      .where(eq(BOARDS.board_id, boardId))
      .limit(1);
    boardData = result[0] ?? null;
  } else {
    boardData = null; // Signal that we need to create
  }

  // --- 3. Handle Board Existence ---
  if (boardData) {
    // --- Scenario: Board Exists ---
    console.debug(`[Board GET] Found board: ${boardData.board_id}`);

    // --- 3a. Access Control Check (Placeholder) ---
    // TODO: Implement proper access control based on boardData.access_level and profileId
    // This check should happen BEFORE updating last_accessed or returning data.
    // Example:
    // const hasAccess = await checkBoardAccess(db, boardData, profileId);
    // if (!hasAccess) {
    //   throw createError({ statusCode: 403, message: 'Forbidden: You do not have access to this board.' });
    // }
    // console.debug(`[Board GET] Access granted for profile ${profileId} to board ${boardData.board_id}`);

    // Determine ownership
    isOwner = !!profileId && boardData.owner_id === profileId;

    // --- 3b. Fetch and Update User's Access Record ---
    if (profileId) {
      console.debug(
        `[Board GET] Profile identified: ${profileId}. Fetching/updating access record for board ${boardData.board_id}.`,
      );
      try {
        // Attempt to insert/update the access record and set last_accessed
        // Using ON CONFLICT DO UPDATE handles both first-time access and subsequent accesses
        const updateResult = await db
          .insert(BOARD_ACCESS)
          .values({
            board_id: boardData.board_id,
            profile_id: profileId,
            // Determine role: Owner if owner_id matches, otherwise default to VIEWER.
            // IMPORTANT: This assumes non-owners start as VIEWERS. If you have explicit invites
            // changing roles, this needs more complex logic (maybe fetch first, then update).
            role: isOwner ? BoardAccessRole.OWNER : BoardAccessRole.VIEWER,
            last_accessed: sql`(CURRENT_TIMESTAMP)`, // Let DB handle timestamp
            // created_at will use default on first insert
          })
          .onConflictDoUpdate({
            target: [BOARD_ACCESS.board_id, BOARD_ACCESS.profile_id],
            set: {
              last_accessed: sql`(CURRENT_TIMESTAMP)`,
              // Optionally update role if needed, e.g., if logic changes owner status
              // role: isOwner ? BoardAccessRole.OWNER : BoardAccessRole.VIEWER
            },
          })
          .returning(); // Return the inserted/updated row

        // Check if the operation returned data (some drivers might not)
        if (updateResult && updateResult.length > 0) {
          userAccessData = updateResult[0];
          console.debug(
            `[Board GET] Upserted and fetched access record for profile ${profileId} on board ${boardData.board_id}. Role: ${userAccessData?.role}, LastAccessed: ${userAccessData?.last_accessed}`,
          );
        } else {
          // Fallback: If returning() is not supported or didn't return, query separately
          console.warn(
            `[Board GET] Upsert did not return data. Querying access record separately for profile ${profileId} on board ${boardData.board_id}.`,
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
          if (userAccessData) {
            console.debug(
              `[Board GET] Fetched existing access record. Role: ${userAccessData.role}, LastAccessed: ${userAccessData.last_accessed}`,
            );
          } else {
            console.error(
              `[Board GET] CRITICAL: Failed to find access record for profile ${profileId} after upsert attempt on board ${boardData.board_id}.`,
            );
            // Handle this inconsistency? Maybe throw an error?
          }
        }
      } catch (accessError: any) {
        console.error(
          `[Board GET] Error upserting/fetching BOARD_ACCESS for board ${boardData.board_id}, profile ${profileId}:`,
          accessError.message,
        );
        // Decide if this error is critical (e.g., prevent access?)
        // For now, we might proceed without userAccessData, but log the error.
        userAccessData = null;
      }
    } else {
      console.debug(
        `[Board GET] No profileId identified. Cannot fetch/update access record for board ${boardData.board_id}.`,
      );
      // isOwner is already false, userAccessData remains null
    }
  } else {
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
      console.log(`[Board GET] Created new board ${boardData.board_id}`);

      // Create the initial OWNER access record
      const initialAccessValues: NewBoardAccess = {
        board_id: boardData.board_id,
        profile_id: profileId,
        role: BoardAccessRole.OWNER,
        // created_at and last_accessed will use DB defaults
      };
      await db.insert(BOARD_ACCESS).values(initialAccessValues); //.onConflictDoNothing(); - No conflict expected here

      // Fetch the just-created access record to include its details (like timestamps) in the response
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

      if (userAccessData) {
        console.log(
          `[Board GET] Created initial OWNER access record for profile ${profileId} on new board ${boardData.board_id}. LastAccessed: ${userAccessData.last_accessed}`,
        );
      } else {
        console.error(
          `[Board GET] CRITICAL: Failed to fetch newly created access record for owner ${profileId} on board ${boardData.board_id}`,
        );
        // Might want to throw 500 here as state is inconsistent
      }
    } catch (creationError: any) {
      console.error(
        `[Board GET] Error during board creation process for ${boardId} / profile ${profileId}:`,
        creationError.message,
      );
      throw createError({
        statusCode: 500,
        message: `Failed to create board or initial access record: ${creationError.message}`,
      });
    }
  }

  // --- 4. Return Response ---
  if (!boardData) {
    // This should ideally be caught earlier (e.g., 404 or 500 during creation)
    console.error("[Board GET] Reached end of handler but boardData is null.");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: Failed to load or create board data.",
    });
  }

  // Return the main board data, ownership status, and the specific access record for the current user
  return {
    data: {
      board_id: boardData.board_id,
      owner_id: boardData.owner_id,
      access_level: boardData.access_level,
      data: boardData.data,
    },
    isOwner: isOwner,
    settings: userAccessData, // <-- Return the fetched/created access record (or null)
  };
});

// Helper function to sanitize board IDs remains the same
function makeUrlSafe(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Updated function to create and save a new board remains the same
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
  // Default content definition omitted for brevity
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

// --- Placeholder for Access Control Logic ---
// async function checkBoardAccess(db: DrizzleD1Database, board: Board, profileId: string | null): Promise<boolean> {
//   // Public boards are always accessible
//   if (board.access_level === BoardAccessLevel.PUBLIC) {
//     return true;
//   }

//   // If no user identified, and board is not public, deny access
//   if (!profileId) {
//     return false;
//   }

//   // Check if the user is the owner
//   if (board.owner_id === profileId) {
//     return true;
//   }

//   // For private boards, check BOARD_ACCESS table
//   if (board.access_level === BoardAccessLevel.PRIVATE_SHARED /* || add other private levels */) {
//     const accessRecord = await db.select({ id: BOARD_ACCESS.id }) // Select minimal column
//       .from(BOARD_ACCESS)
//       .where(and(
//         eq(BOARD_ACCESS.board_id, board.board_id),
//         eq(BOARD_ACCESS.profile_id, profileId)
//       ))
//       .limit(1);
//     return !!accessRecord[0]; // Return true if a record exists
//   }

//   // Add logic for other access levels (LIMITED_EDIT, VIEW_ONLY, ADMIN_ONLY) as needed

//   // Default deny if no access rule matched
//   return false;
// }
