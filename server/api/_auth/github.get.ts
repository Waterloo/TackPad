import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'

export default defineOAuthGitHubEventHandler({
  config: {
    scope: ['user:email'],
  },
  async onSuccess(event, { user: githubUser }) {
    const db = useDrizzle(event)
    const providerName = 'github'
    const providerUserId = String(githubUser.id)
    const email = (githubUser.email as string | undefined) ?? null
    const firstName = (githubUser.name as string | undefined) ?? null

    // --- Step 1: Check profile_authentications for existing link ---
    const existingAuth = await db
      .select()
      .from(schema.profileAuthentications)
      .where(
        and(
          eq(schema.profileAuthentications.providerName, providerName),
          eq(schema.profileAuthentications.providerUserId, providerUserId),
        ),
      )
      .get()

    if (existingAuth) {
      const profile = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, existingAuth.profileId))
        .get()

      if (profile) {
        // Merge anonymous cookie profile if it differs
        const cookieProfileId = await resolveCurrentCookieProfileId(event)
        if (cookieProfileId && cookieProfileId !== profile.id) {
          await mergeProfiles(db, cookieProfileId, profile.id)
        }

        await setUserSession(event, {
          user: { profileId: profile.id, username: profile.username, isAnonymous: false },
        })
        return sendRedirect(event, '/')
      }
    }

    // --- Step 2: Check anonymous cookie → upgrade current profile ---
    const cookieProfileId = await resolveCurrentCookieProfileId(event)
    if (cookieProfileId) {
      const cookieProfile = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, cookieProfileId))
        .get()

      if (cookieProfile) {
        await db.insert(schema.profileAuthentications).values({
          profileId: cookieProfile.id,
          providerName,
          providerUserId,
        })

        if (!cookieProfile.email && email) {
          await db.update(schema.profiles)
            .set({ email })
            .where(eq(schema.profiles.id, cookieProfile.id))
        }

        await setUserSession(event, {
          user: { profileId: cookieProfile.id, username: cookieProfile.username, isAnonymous: false },
        })
        return sendRedirect(event, '/')
      }
    }

    // --- Step 3: Check email match in profiles ---
    if (email) {
      const emailProfile = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.email, email))
        .get()

      if (emailProfile) {
        await db.insert(schema.profileAuthentications).values({
          profileId: emailProfile.id,
          providerName,
          providerUserId,
        })

        await setUserSession(event, {
          user: { profileId: emailProfile.id, username: emailProfile.username, isAnonymous: false },
        })
        return sendRedirect(event, '/')
      }
    }

    // --- Step 4: No match → create new profile + auth link ---
    const profileId = `usr_${nanoid()}`
    await db.insert(schema.profiles).values({
      id: profileId,
      email,
      firstName,
    })
    await db.insert(schema.profileAuthentications).values({
      profileId,
      providerName,
      providerUserId,
    })

    await setUserSession(event, {
      user: { profileId, username: null, isAnonymous: false },
    })
    return sendRedirect(event, '/')
  },
})

/** Resolve the profileId from the anonymous user-token cookie, if present. */
async function resolveCurrentCookieProfileId(event: Parameters<typeof getAnonymousToken>[0]): Promise<string | null> {
  const token = getAnonymousToken(event)
  if (!token) return null

  const db = useDrizzle(event)
  const hash = await hashToken(token)
  const profile = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.anonymousToken, hash))
    .get()

  return profile?.id ?? null
}
