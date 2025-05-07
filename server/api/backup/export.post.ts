import { BOARDS } from "~/server/database/schema";
import { inArray } from "drizzle-orm";
import { useDrizzle } from "~/server/utils/drizzle";
interface ExportRequestBody {
  boardsToExport: {
    id: string;
    title: string;
  }[];
}

// Define the structure of the response data
interface ExportedBoardData {
  board_id: string;
  title: string; // Include the title from the request
  data: any; // Assuming 'data' is JSON; adjust if more specific type is known
}

export default defineEventHandler(
  async (event): Promise<ExportedBoardData[] | { error: string }> => {
    const db = useDrizzle(); // Get the Drizzle database instance using the provided utility

    let body: ExportRequestBody;
    try {
      // Use generic type argument for better type safety
      body = await readBody<ExportRequestBody>(event);
    } catch (error) {
      console.error("Failed to read request body:", error);
      event.node.res.statusCode = 400; // Bad Request
      return { error: "Invalid request body." };
    }

    // Make sure body and the boardsToExport array exist
    if (!body || !body.boardsToExport) {
      event.node.res.statusCode = 400; // Bad Request
      return { error: 'Missing "boardsToExport" array in request body.' };
    }

    const boardsToExport = body.boardsToExport;

    // Basic validation for the array itself
    if (!Array.isArray(boardsToExport) || boardsToExport.length === 0) {
      event.node.res.statusCode = 400; // Bad Request
      return {
        error: 'Invalid or empty "boardsToExport" array in request body.',
      };
    }

    // --- 1. Extract IDs for the Database Query ---
    const boardIdsToQuery = boardsToExport.map((board) => {
      // Add validation within the map for individual items
      if (!board || typeof board.id !== "string" || !board.id) {
        // Throw an error or handle invalid item structure
        // Throwing here will be caught by the outer try/catch
        throw new Error(
          'Invalid item found in "boardsToExport" array. Each item must have a valid string "board_id".',
        );
      }
      return board.id;
    });

    // --- 2. Create a Map for Quick Title Lookup ---
    const titleMap = new Map<string, string>();
    boardsToExport.forEach((board) => {
      // Ensure board_id and title are valid before adding to map
      if (
        board &&
        typeof board.id === "string" &&
        typeof board.title === "string"
      ) {
        titleMap.set(board.id, board.title);
      } else {
        // Log a warning if an item structure is unexpected but doesn't halt the process
        console.warn(
          `Skipping item due to missing/invalid board_id or title in request: ${JSON.stringify(board)}`,
        );
      }
    });

    try {
      // --- 3. Query the Database ---
      // Select all columns from boards where board_id is in the list of IDs
      const dbResults = await db
        .select()
        .from(BOARDS)
        .where(inArray(BOARDS.board_id, boardIdsToQuery));
      // Drizzle's `data` column configured with { mode: "json" } handles JSON parsing.

      // --- 4. Combine DB Results with Titles ---
      const exportedBoards: ExportedBoardData[] = dbResults.map((dbBoard) => {
        // Find the original title using the map
        const title =
          titleMap.get(dbBoard.board_id) ?? "Title Not Provided in Request"; // Provide a fallback if ID was in DB but not map

        return {
          board_id: dbBoard.board_id,
          title: title,
          data: dbBoard.data, // The JSON data from the database
        };
      });

      // --- 5. Return the Combined Data ---
      return exportedBoards;
    } catch (error: any) {
      // Catch potential errors from map validation or DB query
      console.error("Error during board export process:", error);

      // Set appropriate status code based on where the error might originate
      if (error.message?.includes("Invalid item found")) {
        event.node.res.statusCode = 400; // Bad Request due to invalid input data
        return { error: error.message };
      } else {
        event.node.res.statusCode = 500; // Internal Server Error for DB or other issues
        return { error: "An error occurred while exporting boards." };
      }
    }
  },
);
