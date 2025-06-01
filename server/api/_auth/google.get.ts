import { nanoid } from "nanoid";
import { useDrizzle, tables, eq, and } from "~/server/utils/drizzle";
import type { H3Event } from "h3";
import { getCookie, deleteCookie, sendRedirect } from "h3"; // Added sendRedirect, deleteCookie
import { hashToken, getRawUserToken } from "~/server/utils/tokenManagement";
import type { GoogleUser } from "nuxt-auth-utils/dist/runtime/server/lib/oauth/google";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/sqlite-core"; // Import BatchItem type

type Profile = InferSelectModel<typeof tables.PROFILE>;
type NewProfile = InferInsertModel<typeof tables.PROFILE>;
type NewAuthentication = InferInsertModel<
  typeof tables.PROFILE_AUTHENTICATIONS
>;

const PROVIDER_NAME = "google";

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ["email", "profile"],
  },
  async onSuccess(event: H3Event, { user }: { user: GoogleUser }) {
    const db = useDrizzle();
    const providerUserId = user.sub;
    const userEmail = user.email;
    const userFirstName = user.given_name || user.name?.split(" ")[0] || "";

    if (!userEmail) {
      console.error(
        "Google OAuth Error: Email not provided for user sub:",
        providerUserId,
      );
      return sendRedirect(event, "/?error=oauth-email-missing");
    }

    try {
      let profile: Profile | null = null;
      let profileId: string | null = null;
      let linkedVia: "existing_auth" | "token" | "email" | "new" = "new";
      const batchStatements: BatchItem<"sqlite">[] = []; // Array for batch statements

      // --- Step 1: Perform Reads ---

      // 1a. Check existing authentication link
      const existingAuth = await db.query.PROFILE_AUTHENTICATIONS.findFirst({
        where: and(
          eq(tables.PROFILE_AUTHENTICATIONS.provider_name, PROVIDER_NAME),
          eq(tables.PROFILE_AUTHENTICATIONS.provider_user_id, providerUserId),
        ),
        columns: { profile_id: true },
      });

      if (existingAuth) {
        // --- Scenario: Existing Google Auth Link ---
        profileId = existingAuth.profile_id;
        profile = await db.query.PROFILE.findFirst({
          where: eq(tables.PROFILE.id, profileId),
        });
        if (!profile) {
          console.error(
            `Auth link found (Google:${providerUserId}) but profile ${profileId} is missing!`,
          );
          throw new Error("Associated profile data not found.");
        }
        linkedVia = "existing_auth";
        console.log(
          `User logged in via existing Google link. Profile ID: ${profileId}`,
        );
        // No writes needed
      } else {
        // --- Scenario: First time with this Google account ---

        // 1b. Try linking via user-token cookie
        const rawToken = getRawUserToken(event);
        let profileFoundByToken: Profile | null = null;
        if (rawToken) {
          const hashedToken = hashToken(rawToken);
          profileFoundByToken = await db.query.PROFILE.findFirst({
            where: eq(tables.PROFILE.user_token, hashedToken),
          });
        }

        if (profileFoundByToken) {
          // --- Scenario: Found profile by token ---
          profile = profileFoundByToken;
          profileId = profile.id;
          linkedVia = "token";
          console.log(
            `Attempting to link Google account ${providerUserId} to profile ${profileId} via user-token.`,
          );

          // --- Step 2: Determine Write Actions for Token Match ---
          const newAuthLink: NewAuthentication = {
            profile_id: profileId,
            provider_name: PROVIDER_NAME,
            provider_user_id: providerUserId,
          };
          batchStatements.push(
            db
              .insert(tables.PROFILE_AUTHENTICATIONS)
              .values(newAuthLink)
              .onConflictDoNothing(),
          );

          const updates: Partial<NewProfile> = {};
          if (userFirstName && profile.firstName !== userFirstName) {
            updates.firstName = userFirstName;
          }
          // Google guarantees email here; update if different or was null
          if (profile.email !== userEmail || profile.email === null) {
            updates.email = userEmail;
          }
          // updates.user_token = null; // Optional

          if (Object.keys(updates).length > 0) {
            batchStatements.push(
              db
                .update(tables.PROFILE)
                .set(updates)
                .where(eq(tables.PROFILE.id, profileId)),
            );
            profile = { ...profile, ...updates }; // Optimistic update
          }
        } else {
          // --- Scenario: No profile via token, try email ---

          // 1c. Check profile by email (we know userEmail is not null)
          const existingProfileByEmail = await db.query.PROFILE.findFirst({
            where: eq(tables.PROFILE.email, userEmail),
          });

          if (existingProfileByEmail) {
            // --- Scenario: Found profile by email ---
            profile = existingProfileByEmail;
            profileId = profile.id;
            linkedVia = "email";
            console.log(
              `Attempting to link Google account ${providerUserId} to existing profile ${profileId} via email match.`,
            );

            // --- Step 2: Determine Write Actions for Email Match ---
            const newAuthLink: NewAuthentication = {
              profile_id: profileId,
              provider_name: PROVIDER_NAME,
              provider_user_id: providerUserId,
            };
            batchStatements.push(
              db
                .insert(tables.PROFILE_AUTHENTICATIONS)
                .values(newAuthLink)
                .onConflictDoNothing(),
            );

            const updates: Partial<NewProfile> = {};
            if (
              userFirstName &&
              (!profile.firstName || profile.firstName !== userFirstName)
            ) {
              updates.firstName = userFirstName;
            }
            // updates.user_token = null; // Optional

            if (Object.keys(updates).length > 0) {
              batchStatements.push(
                db
                  .update(tables.PROFILE)
                  .set(updates)
                  .where(eq(tables.PROFILE.id, profileId)),
              );
              profile = { ...profile, ...updates }; // Optimistic update
            }
          } else {
            // --- Scenario: No profile via token or email, create new ---
            profileId = `usr_${nanoid()}`;
            linkedVia = "new";
            console.log(
              `Attempting to create new profile ${profileId} and link Google account ${providerUserId}.`,
            );

            // --- Step 2: Determine Write Actions for New Profile ---
            const newProfileData: NewProfile = {
              id: profileId,
              firstName: userFirstName,
              username: null,
              email: userEmail,
              user_token: rawToken ? hashToken(rawToken) : null, // Persist token hash
              createdAt: new Date().toISOString(),
            };
            batchStatements.push(
              db.insert(tables.PROFILE).values(newProfileData),
            );

            const newAuthLink: NewAuthentication = {
              profile_id: profileId,
              provider_name: PROVIDER_NAME,
              provider_user_id: providerUserId,
            };
            batchStatements.push(
              db.insert(tables.PROFILE_AUTHENTICATIONS).values(newAuthLink),
            );

            profile = { ...newProfileData }; // Use new data for session
          }
        }

        // --- Step 3: Execute Batch ---
        if (batchStatements.length > 0) {
          console.log(
            `Executing batch of ${batchStatements.length} statements for profile ${profileId} (${linkedVia})`,
          );
          await db.batch(batchStatements);
          console.log(`Batch execution successful for profile ${profileId}`);
        } else {
          console.log(
            `No database writes needed for profile ${profileId} (${linkedVia})`,
          );
        }
      }

      // --- Step 4: Final Checks and Session Setup ---
      if (!profile || !profileId) {
        console.error(
          "Profile could not be determined after Google OAuth success.",
        );
        throw new Error("Failed to establish user profile.");
      }

      // Set session
      await setUserSession(event, {
        user: {
          profileId: profile.id,
          name: profile.firstName,
          username: profile.username,
          email: profile.email,
          linkedVia: linkedVia,
        },
        loggedInAt: new Date(),
      });

      // Consider clearing the anonymous cookie after successful login/linking
      // if (rawToken) {
      //   deleteCookie(event, 'user-token');
      //   console.log(`Cleared anonymous user-token for profile ${profileId}`);
      // }

      return sendRedirect(event, "/");
    } catch (error: any) {
      console.error(
        `Google OAuth Error processing user ${providerUserId} (${linkedVia}):`,
        error.message || error,
        error.cause, // Log cause for D1 errors
      );
      const queryParams = new URLSearchParams();
      queryParams.set("error", "oauth-processing-failed");
      if (
        error.message.includes("UNIQUE constraint failed") ||
        error.cause?.message.includes("UNIQUE constraint failed")
      ) {
        queryParams.set("reason", "constraint-violation");
      } else if (
        error.message.includes("D1_ERROR") ||
        error.cause?.message.includes("D1_ERROR")
      ) {
        queryParams.set("reason", "database-error");
      }
      return sendRedirect(event, `/?${queryParams.toString()}`);
    }
  },
  onError(event, error) {
    console.error("Google OAuth provider onError:", error);
    const queryParams = new URLSearchParams();
    queryParams.set("error", "oauth-provider-error");
    if (error.message) queryParams.set("reason", error.message.slice(0, 50));
    return sendRedirect(event, `/?${queryParams.toString()}`);
  },
});
