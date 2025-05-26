// TackPad/server/api/profile/getUsers.post.ts

import { PROFILE } from "~/server/database/schema"; // Your schema import
import { useDrizzle, inArray } from "~/server/utils/drizzle"; // Drizzle utilities

export default defineEventHandler(async (event) => {
  // --- Authentication Check (Recommended) ---
  // Uncomment or adapt if you need to ensure only logged-in users can use this endpoint
  /*
  const requestingProfileId = event.context.session?.secure?.profileId;
  if (!requestingProfileId) {
    throw createError({
      statusCode: 401,
      message: "Authentication required to fetch user details.",
    });
  }
  */

  // --- Read and Validate Body ---
  const body = await readBody(event);

  if (!body || !body.usernames || !Array.isArray(body.usernames)) {
    throw createError({
      statusCode: 400,
      message: "Request body must contain a 'usernames' array.",
      data: { code: "INVALID_BODY_STRUCTURE" }, // Optional: add error code
    });
  }

  const usernames: string[] = body.usernames;

  // Handle empty input array - return empty result immediately
  if (usernames.length === 0) {
    return [];
  }

  // --- Database Query ---
  const db = useDrizzle();

  try {
    const users = await db
      .select({
        // Select the fields needed by the client
        username: PROFILE.username,
        firstName: PROFILE.firstName,
        email: PROFILE.email,
        // You could add other public fields like 'id' if needed
        // id: PROFILE.id
      })
      .from(PROFILE)
      // Use the 'inArray' operator to efficiently query multiple usernames
      .where(inArray(PROFILE.username, usernames));

    // --- Return Results ---
    // Returns an array of found user objects. Usernames not found are simply omitted.
    return users;
  } catch (error: any) {
    // Log the error for debugging
    console.error("Error fetching users by username:", error);

    // Return a generic server error to the client
    throw createError({
      statusCode: 500,
      message: "An error occurred while fetching user details.",
      data: { code: "DATABASE_QUERY_FAILED" }, // Optional: add error code
    });
  }
});
