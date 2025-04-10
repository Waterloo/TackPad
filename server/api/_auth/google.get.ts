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
import { getCookie, deleteCookie } from "h3"; // Import getCookie, deleteCookie
import { hashToken, getRawUserToken } from "~/server/utils/tokenManagement"; // Import helpers
// Adjust this import path based on your actual node_modules structure for nuxt-auth-utils
import type { GoogleUser } from "nuxt-auth-utils/dist/runtime/server/lib/oauth/google";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

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

      // 1. Check existing authentication link
      const existingAuth = await db.query.PROFILE_AUTHENTICATIONS.findFirst({
        where: and(
          eq(tables.PROFILE_AUTHENTICATIONS.provider_name, PROVIDER_NAME),
          eq(tables.PROFILE_AUTHENTICATIONS.provider_user_id, providerUserId),
        ),
      });

      if (existingAuth) {
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
      } else {
        // 2. Try linking via user-token cookie
        const rawToken = getRawUserToken(event);
        let profileFoundByToken: Profile | null = null;

        if (rawToken) {
          const hashedToken = hashToken(rawToken);
          profileFoundByToken = await db.query.PROFILE.findFirst({
            where: eq(tables.PROFILE.user_token, hashedToken),
          });
        }

        await db.transaction(async (tx) => {
          if (profileFoundByToken) {
            // --- Scenario: Found profile by token ---
            profile = profileFoundByToken;
            profileId = profile.id;

            const newAuthLink: NewAuthentication = {
              profile_id: profileId,
              provider_name: PROVIDER_NAME,
              provider_user_id: providerUserId,
            };
            await tx
              .insert(tables.PROFILE_AUTHENTICATIONS)
              .values(newAuthLink)
              .onConflictDoNothing();

            // Update profile details if needed
            const updates: Partial<NewProfile> = {};
            if (userFirstName && profile.firstName !== userFirstName) {
              updates.firstName = userFirstName;
            }
            // Google guarantees email here, update if different or was null
            if (profile.email !== userEmail || profile.email === null) {
              updates.email = userEmail;
            }
            // Optionally clear token hash
            // updates.user_token = null;

            if (Object.keys(updates).length > 0) {
              await tx
                .update(tables.PROFILE)
                .set(updates)
                .where(eq(tables.PROFILE.id, profileId));
              profile = { ...profile, ...updates };
            }

            linkedVia = "token";
            console.log(
              `Linked Google account ${providerUserId} to profile ${profileId} via user-token.`,
            );
          } else {
            // --- Scenario: No profile via token, try email ---

            // 3. Check profile by email
            // We know userEmail is not null here.
            const existingProfileByEmail = await tx.query.PROFILE.findFirst({
              where: eq(tables.PROFILE.email, userEmail),
            });

            if (existingProfileByEmail) {
              // --- Scenario: Found profile by email ---
              profile = existingProfileByEmail;
              profileId = profile.id;

              const newAuthLink: NewAuthentication = {
                profile_id: profileId,
                provider_name: PROVIDER_NAME,
                provider_user_id: providerUserId,
              };
              await tx
                .insert(tables.PROFILE_AUTHENTICATIONS)
                .values(newAuthLink)
                .onConflictDoNothing();

              // Update profile if needed
              const updates: Partial<NewProfile> = {};
              if (
                userFirstName &&
                (!profile.firstName || profile.firstName !== userFirstName)
              ) {
                updates.firstName = userFirstName;
              }

              if (Object.keys(updates).length > 0) {
                await tx
                  .update(tables.PROFILE)
                  .set(updates)
                  .where(eq(tables.PROFILE.id, profileId));
                profile = { ...profile, ...updates };
              }

              linkedVia = "email";
              console.log(
                `Linked Google account ${providerUserId} to existing profile ${profileId} via email match.`,
              );
            } else {
              // --- Scenario: No profile via token or email, create new ---
              // 4. Create new profile and link
              profileId = nanoid();

              const newProfileData: NewProfile = {
                id: profileId,
                firstName: userFirstName,
                username: null,
                email: userEmail,
                user_token: rawToken ? hashToken(rawToken) : null, // Persist current token hash
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

              profile = { ...newProfileData };
              linkedVia = "new";
              console.log(
                `Created new profile ${profileId} and linked Google account ${providerUserId}.`,
              );
            }
          }
        }); // End transaction
      }

      // Ensure profile determined
      if (!profile || !profileId) {
        console.error(
          "Profile could not be determined after Google OAuth success.",
        );
        throw new Error("Failed to establish user profile.");
      }

      // 5. Set session
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

      // Consider clearing the anonymous cookie after successful login
      // deleteCookie(event, 'user-token', getCookieOptions());

      return sendRedirect(event, "/");
    } catch (error: any) {
      console.error(
        `Google OAuth Error processing user ${providerUserId}:`,
        error.message || error,
      );
      return sendRedirect(event, "/?error=oauth-processing-failed");
    }
  },
  onError(event, error) {
    console.error("Google OAuth provider onError:", error);
    return sendRedirect(event, "/?error=oauth-provider-error");
  },
});
