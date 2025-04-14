import { nanoid } from "nanoid";
import { useDrizzle, tables, eq, and } from "~/server/utils/drizzle";
import type { H3Event } from "h3";
import { getCookie, deleteCookie, sendRedirect } from "h3"; // Added sendRedirect, deleteCookie
import { hashToken, getRawUserToken } from "~/server/utils/tokenManagement";
import type { GitHubUser } from "nuxt-auth-utils/dist/runtime/server/lib/oauth/github";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/sqlite-core"; // Import BatchItem type

type Profile = InferSelectModel<typeof tables.PROFILE>;
type NewProfile = InferInsertModel<typeof tables.PROFILE>;
type NewAuthentication = InferInsertModel<
  typeof tables.PROFILE_AUTHENTICATIONS
>;

const PROVIDER_NAME = "github";

export default defineOAuthGitHubEventHandler({
  config: {
    scope: ["read:user", "user:email"],
  },
  async onSuccess(event: H3Event, { user }: { user: GitHubUser }) {
    const db = useDrizzle();
    const providerUserId = user.id.toString();
    const userEmail = user.email; // Can be null from GitHub
    const userFirstName = user.name?.split(" ")[0] || user.login || "";

    try {
      let profile: Profile | null = null;
      let profileId: string | null = null;
      let linkedVia: "existing_auth" | "token" | "email" | "new" = "new";
      const batchStatements: BatchItem<"sqlite">[] = []; // Array to hold statements for batch execution

      // --- Step 1: Perform Reads ---

      // 1a. Check if this specific GitHub account is already linked
      const existingAuth = await db.query.PROFILE_AUTHENTICATIONS.findFirst({
        where: and(
          eq(tables.PROFILE_AUTHENTICATIONS.provider_name, PROVIDER_NAME),
          eq(tables.PROFILE_AUTHENTICATIONS.provider_user_id, providerUserId),
        ),
        columns: { profile_id: true }, // Only need profile_id
      });

      if (existingAuth) {
        // --- Scenario: User has logged in with this GitHub account before ---
        profileId = existingAuth.profile_id;
        profile = await db.query.PROFILE.findFirst({
          where: eq(tables.PROFILE.id, profileId),
        });
        if (!profile) {
          console.error(
            `Auth link found (GitHub:${providerUserId}) but profile ${profileId} is missing!`,
          );
          throw new Error("Associated profile data not found.");
        }
        linkedVia = "existing_auth";
        console.log(
          `User logged in via existing GitHub link. Profile ID: ${profileId}`,
        );
        // No writes needed, proceed directly to session setup
      } else {
        // --- Scenario: First time logging in with THIS GitHub account ---

        // 1b. Try to find profile via user-token cookie (anonymous session)
        const rawToken = getRawUserToken(event);
        let profileFoundByToken: Profile | null = null;
        if (rawToken) {
          const hashedToken = hashToken(rawToken);
          profileFoundByToken = await db.query.PROFILE.findFirst({
            where: eq(tables.PROFILE.user_token, hashedToken),
          });
        }

        if (profileFoundByToken) {
          // --- Scenario: Found matching profile based on user-token ---
          profile = profileFoundByToken;
          profileId = profile.id;
          linkedVia = "token";
          console.log(
            `Attempting to link GitHub account ${providerUserId} to profile ${profileId} via user-token.`,
          );

          // --- Step 2: Determine Write Actions for Token Match ---
          const newAuthLink: NewAuthentication = {
            profile_id: profileId,
            provider_name: PROVIDER_NAME,
            provider_user_id: providerUserId,
          };
          // Add INSERT statement for the new auth link
          batchStatements.push(
            db
              .insert(tables.PROFILE_AUTHENTICATIONS)
              .values(newAuthLink)
              .onConflictDoNothing(), // Important for potential race conditions or edge cases
          );

          // Check if profile updates are needed
          const updates: Partial<NewProfile> = {};
          if (userFirstName && profile.firstName !== userFirstName) {
            updates.firstName = userFirstName;
          }
          if (
            userEmail &&
            (profile.email !== userEmail || profile.email === null)
          ) {
            updates.email = userEmail;
          }
          // Optionally clear the user_token now that OAuth is linked
          // updates.user_token = null;

          if (Object.keys(updates).length > 0) {
            // Add UPDATE statement for the profile
            batchStatements.push(
              db
                .update(tables.PROFILE)
                .set(updates)
                .where(eq(tables.PROFILE.id, profileId)),
            );
            // Update the local profile object optimistically for session setup later
            profile = { ...profile, ...updates };
          }
        } else {
          // --- Scenario: No profile found via token, check email ---

          // 1c. Check if a profile exists with the SAME EMAIL (if email is available)
          let existingProfileByEmail: Profile | null = null;
          if (userEmail) {
            existingProfileByEmail = await db.query.PROFILE.findFirst({
              where: eq(tables.PROFILE.email, userEmail),
            });
          }

          if (existingProfileByEmail) {
            // --- Scenario: Profile with this email exists ---
            profile = existingProfileByEmail;
            profileId = profile.id;
            linkedVia = "email";
            console.log(
              `Attempting to link GitHub account ${providerUserId} to existing profile ${profileId} via email match.`,
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
            // updates.user_token = null; // Optionally clear token

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
            // --- Scenario: No profile found via token or email - Create New Profile ---
            profileId = `usr_${nanoid()}`; // Generate new profile ID
            linkedVia = "new";
            console.log(
              `Attempting to create new profile ${profileId} and link GitHub account ${providerUserId}.`,
            );

            // --- Step 2: Determine Write Actions for New Profile ---
            const newProfileData: NewProfile = {
              id: profileId,
              firstName: userFirstName,
              username: null,
              email: userEmail, // Store email if available
              user_token: rawToken ? hashToken(rawToken) : null, // Persist token hash if exists
              createdAt: new Date().toISOString(),
            };
            // Add INSERT for the new profile
            batchStatements.push(
              db.insert(tables.PROFILE).values(newProfileData),
            );

            const newAuthLink: NewAuthentication = {
              profile_id: profileId,
              provider_name: PROVIDER_NAME,
              provider_user_id: providerUserId,
            };
            // Add INSERT for the new auth link
            batchStatements.push(
              db.insert(tables.PROFILE_AUTHENTICATIONS).values(newAuthLink),
            );

            profile = { ...newProfileData }; // Use the new data for session
          }
        }

        // --- Step 3: Execute Batch (if any statements were added) ---
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
          "Profile could not be determined after GitHub OAuth success.",
        );
        throw new Error("Failed to establish user profile.");
      }

      // Set user session
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

      // Consider clearing the anonymous user token cookie AFTER successful login/linking
      // if (rawToken) {
      //   deleteCookie(event, 'user-token'); // Add cookie options if needed
      //   console.log(`Cleared anonymous user-token for profile ${profileId}`);
      // }

      return sendRedirect(event, "/");
    } catch (error: any) {
      console.error(
        `GitHub OAuth Error processing user ${providerUserId} (${linkedVia}):`, // Include linkedVia for context
        error.message || error,
        error.cause, // D1 errors often have more detail in the cause
      );
      // Avoid redirect loops or unclear errors
      const queryParams = new URLSearchParams();
      queryParams.set("error", "oauth-processing-failed");
      if (
        error.message.includes("UNIQUE constraint failed") ||
        error.cause?.message.includes("UNIQUE constraint failed")
      ) {
        queryParams.set("reason", "constraint-violation");
      } else if (error.message.includes("D1_ERROR")) {
        queryParams.set("reason", "database-error");
      }
      return sendRedirect(event, `/?${queryParams.toString()}`);
    }
  },
  onError(event, error) {
    console.error("GitHub OAuth provider onError:", error);
    const queryParams = new URLSearchParams();
    queryParams.set("error", "oauth-provider-error");
    if (error.message) queryParams.set("reason", error.message.slice(0, 50)); // Add brief reason
    return sendRedirect(event, `/?${queryParams.toString()}`);
  },
});
