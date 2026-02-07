import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle, tables, eq, or, and } from "~/server/utils/drizzle";

function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, " ")?.replace(/\s+/g, " ")?.trim() || "";
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, message: "Method not allowed" });
  }

  const oauth = event.context.oauth;
  if (!oauth?.profileId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { query, board_id } = await readBody(event);

  if (!query || typeof query !== "string" || query.length < 2) {
    throw createError({ statusCode: 400, message: "Query must be at least 2 characters" });
  }

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;
    const searchTerm = query.toLowerCase();

    // Build where clause - optionally filter by specific board
    let whereClause;
    if (board_id) {
      whereClause = and(
        eq(tables.BOARDS.board_id, board_id),
        or(
          eq(tables.BOARDS.owner_id, profileId),
          eq(tables.BOARD_ACCESS.profile_id, profileId)
        )
      );
    } else {
      whereClause = or(
        eq(tables.BOARDS.owner_id, profileId),
        eq(tables.BOARD_ACCESS.profile_id, profileId)
      );
    }

    // Get boards user has access to
    const boards = await db
      .select({
        board_id: tables.BOARDS.board_id,
        data: tables.BOARDS.data,
        owner_id: tables.BOARDS.owner_id,
      })
      .from(tables.BOARDS)
      .leftJoin(
        tables.BOARD_ACCESS,
        and(
          eq(tables.BOARD_ACCESS.board_id, tables.BOARDS.board_id),
          eq(tables.BOARD_ACCESS.profile_id, profileId)
        )
      )
      .where(whereClause);

    const results: Array<{
      board_id: string;
      board_title: string;
      item_id: string;
      item_kind: string;
      context_snippet: string;
    }> = [];

    for (const board of boards) {
      const boardData = board.data as { title?: string; items?: Record<string, any> } | null;
      const items = boardData?.items || {};

      for (const [itemId, item] of Object.entries(items)) {
        let textToSearch = "";

        switch (item.kind) {
          case "note":
            textToSearch = stripHtml(item.content?.text || "");
            break;
          case "todo":
            const tasks = item.content?.tasks || [];
            textToSearch = `${item.content?.title || ""} ${tasks.map((t: any) => t.content).join(" ")}`;
            break;
          case "link":
            textToSearch = `${item.content?.title || ""} ${item.content?.description || ""}`;
            break;
          case "image":
            textToSearch = item.title || "";
            break;
          case "text":
            textToSearch = item.content?.text || "";
            break;
          default:
            continue;
        }

        const lowerText = textToSearch.toLowerCase();
        const index = lowerText.indexOf(searchTerm);

        if (index !== -1) {
          // Extract snippet with context (50 chars before/after)
          const snippetStart = Math.max(0, index - 50);
          const snippetEnd = Math.min(textToSearch.length, index + searchTerm.length + 50);
          const snippet = textToSearch.substring(snippetStart, snippetEnd);
          const prefix = snippetStart > 0 ? "..." : "";
          const suffix = snippetEnd < textToSearch.length ? "..." : "";

          results.push({
            board_id: board.board_id,
            board_title: boardData?.title || "Untitled Board",
            item_id: itemId,
            item_kind: item.kind,
            context_snippet: `${prefix}${snippet}${suffix}`,
          });
        }
      }
    }

    return {
      success: true,
      query,
      board_id: board_id || null,
      result_count: results.length,
      results,
    };
  } catch (error: any) {
    console.error("[OAuth Search] Error:", error);
    throw createError({ statusCode: 500, message: "Search failed" });
  }
});
