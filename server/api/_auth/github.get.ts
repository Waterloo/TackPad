import { nanoid } from "nanoid";
import {
  useDrizzle,
  tables,
  eq,
  and,
  ne,
  isNull,
} from "~/server/utils/drizzle"; // Added ne, isNull
import type { H3Event } from "h3";
import { getCookie } from "h3"; // Import getCookie
import { hashToken, getRawUserToken } from "~/server/utils/tokenManagement"; // Import helpers
// Adjust this import path based on your actual node_modules structure for nuxt-auth-utils
import type { GitHubUser } from "nuxt-auth-utils/dist/runtime/server/lib/oauth/github";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

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
    const userEmail = user.email;
    const userFirstName = user.name?.split(" ")[0] || user.login || "";

    try {
      let profile: Profile | null = null;
      let profileId: string | null = null;
      let linkedVia: "existing_auth" | "token" | "email" | "new" = "new"; // Track linking method

      // 1. Check if this specific GitHub account is already linked
      const existingAuth = await db.query.PROFILE_AUTHENTICATIONS.findFirst({
        where: and(
          eq(tables.PROFILE_AUTHENTICATIONS.provider_name, PROVIDER_NAME),
          eq(tables.PROFILE_AUTHENTICATIONS.provider_user_id, providerUserId),
        ),
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
      } else {
        // --- Scenario: First time logging in with THIS GitHub account ---

        // 2. Try to link via user-token cookie (anonymous session)
        const rawToken = getRawUserToken(event); // Get raw token from cookie
        let profileFoundByToken: Profile | null = null;

        if (rawToken) {
          const hashedToken = hashToken(rawToken);
          profileFoundByToken = await db.query.PROFILE.findFirst({
            where: eq(tables.PROFILE.user_token, hashedToken),
          });
        }

        await db.transaction(async (tx) => {
          if (profileFoundByToken) {
            // --- Scenario: Found matching profile based on user-token ---
            profile = profileFoundByToken;
            profileId = profile.id;

            // Link this GitHub account to the found profile
            const newAuthLink: NewAuthentication = {
              profile_id: profileId,
              provider_name: PROVIDER_NAME,
              provider_user_id: providerUserId,
            };
            await tx
              .insert(tables.PROFILE_AUTHENTICATIONS)
              .values(newAuthLink)
              .onConflictDoNothing(); // Avoid error if link somehow exists

            // Update profile details if OAuth provides better/newer info
            const updates: Partial<NewProfile> = {};
            if (userFirstName && profile.firstName !== userFirstName) {
              updates.firstName = userFirstName;
            }
            // Only update email if provided by OAuth AND it's different OR current is null
            if (
              userEmail &&
              (profile.email !== userEmail || profile.email === null)
            ) {
              updates.email = userEmail;
            }
            // Optionally clear the user_token now that OAuth is linked?
            // updates.user_token = null;

            if (Object.keys(updates).length > 0) {
              await tx
                .update(tables.PROFILE)
                .set(updates)
                .where(eq(tables.PROFILE.id, profileId));
              // Update the local profile object
              profile = { ...profile, ...updates };
            }

            linkedVia = "token";
            console.log(
              `Linked GitHub account ${providerUserId} to profile ${profileId} via user-token.`,
            );
          } else {
            // --- Scenario: No profile found via token, proceed to email check ---

            // 3. Check if a profile exists with the SAME EMAIL (if email is available)
            let existingProfileByEmail: Profile | null = null;
            if (userEmail) {
              existingProfileByEmail = await tx.query.PROFILE.findFirst({
                // Ensure we don't accidentally re-link if the email belongs to a profile already linked to *another* auth method
                // This check might be overly cautious depending on whether you allow multiple OAuth per profile.
                // Let's simplify for now and assume email matching is okay if no token match.
                where: eq(tables.PROFILE.email, userEmail),
              });
            }

            if (existingProfileByEmail) {
              // --- Scenario: Profile with this email exists ---
              profile = existingProfileByEmail;
              profileId = profile.id;

              // Link this GitHub account to the existing profile
              const newAuthLink: NewAuthentication = {
                profile_id: profileId,
                provider_name: PROVIDER_NAME,
                provider_user_id: providerUserId,
              };
              await tx
                .insert(tables.PROFILE_AUTHENTICATIONS)
                .values(newAuthLink)
                .onConflictDoNothing();

              // Update profile details if needed (e.g., firstName might be missing)
              const updates: Partial<NewProfile> = {};
              if (
                userFirstName &&
                (!profile.firstName || profile.firstName !== userFirstName)
              ) {
                updates.firstName = userFirstName;
              }
              // Don't typically overwrite email if matched by email, but ensure firstName is good
              if (Object.keys(updates).length > 0) {
                await tx
                  .update(tables.PROFILE)
                  .set(updates)
                  .where(eq(tables.PROFILE.id, profileId));
                profile = { ...profile, ...updates };
              }

              linkedVia = "email";
              console.log(
                `Linked GitHub account ${providerUserId} to existing profile ${profileId} via email match.`,
              );
            } else {
              // --- Scenario: No profile found via token or email ---
              // 4. Create a brand new profile AND link the GitHub account
              profileId = nanoid();

              const newProfileData: NewProfile = {
                id: profileId,
                firstName: userFirstName,
                username: null,
                email: userEmail, // Store email if available
                // Store the *hashed* token from the *current* session if available
                // This helps if they later use the app anonymously again *before* logging in elsewhere
                user_token: rawToken ? hashToken(rawToken) : null,
                createdAt: new Date().toISOString(),
              };
              await tx.insert(tables.PROFILE).values(newProfileData);

              const newAuthLink: NewAuthentication = {
                profile_id: profileId,
                provider_name: PROVIDER_NAME,
                provider_user_id: providerUserId,
              };
              await tx
                .insert(tables.PROFILE_AUTHENTICATIONS)
                .values(newAuthLink);

              profile = { ...newProfileData }; // Use the newly created data
              linkedVia = "new";
              console.log(
                `Created new profile ${profileId} and linked GitHub account ${providerUserId}.`,
              );
            }
          }
        }); // End transaction
      }

      // Ensure profile and profileId were determined
      if (!profile || !profileId) {
        console.error(
          "Profile could not be determined after GitHub OAuth success.",
        );
        throw new Error("Failed to establish user profile.");
      }

      // 5. Set user session with INTERNAL profile details
      await setUserSession(event, {
        user: {
          profileId: profile.id,
          name: profile.firstName,
          username: profile.username,
          email: profile.email,
          linkedVia: linkedVia, // Optional: include how they were linked for debugging/analytics
        },
        loggedInAt: new Date(),
      });

      // Clear the anonymous user token cookie *after* successful login and session setup?
      // This prevents the old anonymous token from potentially linking to a *different*
      // user if cookies are somehow shared or not cleared properly.
      // deleteCookie(event, 'user-token', getCookieOptions()); // Consider implications

      return sendRedirect(event, "/");
    } catch (error: any) {
      console.error(
        `GitHub OAuth Error processing user ${providerUserId}:`,
        error.message || error,
      );
      return sendRedirect(event, "/?error=oauth-processing-failed");
    }
  },
  onError(event, error) {
    console.error("GitHub OAuth provider onError:", error);
    return sendRedirect(event, "/?error=oauth-provider-error");
  },
});
