import { getCookie, setCookie, defineEventHandler, createError } from "h3"; // Added setCookie import
import { useDrizzle, tables, eq } from "~/server/utils/drizzle";
import {
  setupAndGetHashedUserToken, // Use this instead of just getting the raw token initially
  hashToken, // Still needed if using session potentially, but primarily for setup
} from "~/server/utils/tokenManagement";
import { nanoid } from "nanoid";

// Keep your public route definitions
const PUBLIC_ROUTES: Array<string | { path: string; method: string }> = [
  "/api/_auth",
  "/api/board", // Consider GET /{id} might be public
  "/api/bookmark",
  "/api/metadata",
  "/api/save",
  "/api/_hub/",
];

const generateProfileId = () => `usr_${nanoid(16)}`;

export default defineEventHandler(async (event) => {
  if (process.env.prerender) {
    console.debug("[Auth Middleware] Skipping (prerender)");
    return;
  }

  if (!event.path.startsWith("/api/")) {
    return;
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => {
    if (typeof route === "string") {
      return event.path.startsWith(route);
    }
    return (
      event.path === route.path &&
      event.method.toUpperCase() === route.method.toUpperCase()
    );
  });

  console.log(
    `[Auth Middleware] Path: ${event.path}, Method: ${event.method}, IsPublic: ${isPublicRoute}`
  );

  event.context.session = {
    user: null,
    secure: {
      profileId: null,
      username: null,
      isAnonymous: true,
    },
  };

  let sessionError: Error | null = null;

  try {
    // --- 1. Attempt to get logged-in session ---
    let session = null;
    try {
      // IMPORTANT: Ensure getUserSession doesn't interfere with or rely on the
      // anonymous user-token if it's only for OAuth/proper sessions.
      session = await getUserSession(event);
    } catch (e: any) {
      sessionError = e;
      console.log("[Auth Middleware] getUserSession error:", e.message);
    }

    if (session?.user?.profileId) {
      // --- User is logged in via OAuth session ---
      console.log(
        `[Auth Middleware] User identified via session: ${session.user.profileId}`
      );
      event.context.session.user = session.user;
      event.context.session.secure = {
        profileId: session.user.profileId,
        username: session.user.username || null,
        isAnonymous: false,
      };
      // Logged-in user found, skip anonymous token logic
      console.debug(
        "[Auth Middleware] Logged-in session found, skipping anonymous check."
      );
    } else {
      // --- 2. Attempt to identify OR CREATE via anonymous user-token ---
      console.debug(
        "[Auth Middleware] No valid session found, checking/setting user-token."
      );

      // Use setupAndGetHashedUserToken:
      // - Gets existing token if present.
      // - Creates a NEW token and SETS the cookie if not present.
      // - Returns the HASHED token for DB operations.
      const hashedToken = setupAndGetHashedUserToken(event);

      if (!hashedToken) {
        // This case should ideally not happen if setupAndGetHashedUserToken works correctly,
        // but handle defensively.
        console.error(
          "[Auth Middleware] Failed to get or set up a user token."
        );
        // Decide how to proceed: maybe throw an error if identification is critical?
        // For now, we'll proceed, and the authorization check later will handle it.
      } else {
        try {
          const db = useDrizzle();
          // Log before DB lookup
          console.log(
            `[Auth Middleware] Checking DB for token hash. Route IsPublic: ${isPublicRoute}`
          );

          let profile = await db.query.PROFILE.findFirst({
            where: eq(tables.PROFILE.user_token, hashedToken),
            columns: {
              id: true,
              username: true,
            },
          });

          if (profile) {
            // --- Found existing anonymous profile matching the token ---
            console.log(
              `[Auth Middleware] Existing anonymous profile found via token: ${profile.id}. Route IsPublic: ${isPublicRoute}`
            );
            event.context.session.secure = {
              profileId: profile.id,
              username: profile.username || null,
              isAnonymous: true,
            };
          } else {
            // --- Token exists (or was just created), but no matching profile: CREATE NEW ANONYMOUS PROFILE ---
            console.log(
              `[Auth Middleware] Token hash processed, no matching profile. Creating new anonymous profile. Route IsPublic: ${isPublicRoute}`
            );
            const newProfileId = generateProfileId();
            const now = new Date().toISOString();

            const [newProfile] = await db
              .insert(tables.PROFILE)
              .values({
                id: newProfileId,
                user_token: hashedToken, // Store the HASHED token
                createdAt: now,
              })
              .returning({ id: tables.PROFILE.id });

            if (!newProfile || !newProfile.id) {
              console.error(
                `[Auth Middleware] Failed to create new anonymous profile in DB. Route IsPublic: ${isPublicRoute}`
              );
              // Decide how to handle DB failure - maybe throw 500?
            } else {
              console.log(
                // Changed from error to log for successful creation
                `[Auth Middleware] New anonymous profile created: ${newProfile.id}. Route IsPublic: ${isPublicRoute}`
              );
              event.context.session.secure = {
                profileId: newProfile.id,
                username: null,
                isAnonymous: true,
              };
            }
          }
        } catch (dbError: any) {
          console.error(
            `[Auth Middleware] Database error during token lookup/creation. Route IsPublic: ${isPublicRoute}:`,
            dbError.message
          );
          // Decide how to handle DB failure - maybe throw 500?
          // For now, let the authorization check handle the lack of profileId
        }
      }
    }

    // --- 3. Authorization Check ---
    if (!isPublicRoute && !event.context.session.secure.profileId) {
      // This check now correctly catches:
      // - Access attempts to protected routes without a valid session OR a successfully identified/created anonymous profile.
      // - Cases where token setup or DB operations failed earlier, leaving profileId null.
      console.warn(
        `[Auth Middleware] Unauthorized access attempt to PROTECTED route: ${
          event.path
        }. No profileId identified. Session Error: ${
          sessionError?.message ?? "None"
        }`
      );

      if (sessionError) {
        // If the initial session check failed explicitly
        throw createError({
          statusCode: 401,
          message: `Unauthorized - Invalid session: ${sessionError.message}`,
          cause: sessionError,
        });
      } else {
        // General lack of identification for a protected route
        throw createError({
          statusCode: 401,
          message: "Unauthorized - Authentication or identification required",
        });
      }
    }

    // Final access log
    console.debug(
      `[Auth Middleware] Access outcome: ${
        !isPublicRoute && !event.context.session.secure.profileId
          ? "DENIED (by 401 above)"
          : "GRANTED"
      }. Route: ${event.path}, ProfileID: ${
        event.context.session.secure.profileId
      }, IsPublic: ${isPublicRoute}, IsAnonymous: ${
        event.context.session.secure.isAnonymous
      }`
    );
  } catch (error: any) {
    if (error.statusCode === 401) {
      console.warn(
        `[Auth Middleware] Access DENIED with 401. Route: ${event.path}, Message: ${error.message}`
      );
      // Re-throw the specific 401 error
      throw error;
    }
    // Catch unexpected errors during the process
    console.error(
      `[Auth Middleware] Unexpected error during auth check. Route: ${event.path}:`,
      error
    );
    throw createError({
      statusCode: 500,
      message: "Internal Server Error during authentication check",
      cause: error, // Include original error if possible
    });
  }
});
