import { eq, sql, and, like } from 'drizzle-orm'

/**
 * Merges the "losing" anonymous profile into the "winning" OAuth profile.
 * Re-points all owned data, repairs mention references, then deletes the loser.
 */
export async function mergeProfiles(
  db: ReturnType<typeof useDrizzle>,
  losingProfileId: string,
  winningProfileId: string,
) {
  // Safety: don't merge a profile into itself
  if (losingProfileId === winningProfileId) return

  // --- Username resolution ---
  // If the winning profile has no username but the losing one does, transfer it
  const [winningProfile, losingProfile] = await Promise.all([
    db.select().from(schema.profiles).where(eq(schema.profiles.id, winningProfileId)).get(),
    db.select().from(schema.profiles).where(eq(schema.profiles.id, losingProfileId)).get(),
  ])

  if (losingProfile?.username && !winningProfile?.username) {
    await db.update(schema.profiles)
      .set({ username: losingProfile.username })
      .where(eq(schema.profiles.id, winningProfileId))
  }

  // --- Re-point owned data ---

  // 1. boards.owner_id
  await db.update(schema.boards)
    .set({ ownerId: winningProfileId })
    .where(eq(schema.boards.ownerId, losingProfileId))

  // 2. board_access.profile_id — skip duplicates by deleting conflicting rows first
  // Find boards where winning already has access
  const winningAccess = await db
    .select({ boardId: schema.boardAccess.boardId })
    .from(schema.boardAccess)
    .where(eq(schema.boardAccess.profileId, winningProfileId))
    .all()
  const winningBoardIds = new Set(winningAccess.map(r => r.boardId))

  // Delete losing's access rows that would conflict
  for (const boardId of winningBoardIds) {
    await db.delete(schema.boardAccess)
      .where(
        and(
          eq(schema.boardAccess.profileId, losingProfileId),
          eq(schema.boardAccess.boardId, boardId),
        ),
      )
  }
  // Re-point remaining
  await db.update(schema.boardAccess)
    .set({ profileId: winningProfileId })
    .where(eq(schema.boardAccess.profileId, losingProfileId))

  // 3. uploads.profile_id
  await db.update(schema.uploads)
    .set({ profileId: winningProfileId })
    .where(eq(schema.uploads.profileId, losingProfileId))

  // 4. usage_quotas — add losing consumption to winning, delete losing row
  const losingQuota = await db
    .select()
    .from(schema.usageQuotas)
    .where(eq(schema.usageQuotas.profileId, losingProfileId))
    .get()

  if (losingQuota) {
    const winningQuota = await db
      .select()
      .from(schema.usageQuotas)
      .where(eq(schema.usageQuotas.profileId, winningProfileId))
      .get()

    if (winningQuota) {
      await db.update(schema.usageQuotas)
        .set({ consumption: winningQuota.consumption + losingQuota.consumption })
        .where(eq(schema.usageQuotas.profileId, winningProfileId))
    }
    else {
      // Transfer the quota row entirely
      await db.update(schema.usageQuotas)
        .set({ profileId: winningProfileId })
        .where(eq(schema.usageQuotas.profileId, losingProfileId))
    }

    // Delete the losing row if it still exists (wasn't transferred)
    if (winningQuota) {
      await db.delete(schema.usageQuotas)
        .where(eq(schema.usageQuotas.profileId, losingProfileId))
    }
  }

  // 5. notifications.recipient_id
  await db.update(schema.notifications)
    .set({ recipientId: winningProfileId })
    .where(eq(schema.notifications.recipientId, losingProfileId))

  // 6. checkpoints.created_by
  await db.update(schema.checkpoints)
    .set({ createdBy: winningProfileId })
    .where(eq(schema.checkpoints.createdBy, losingProfileId))

  // 7. comments.author_id
  await db.update(schema.comments)
    .set({ authorId: winningProfileId })
    .where(eq(schema.comments.authorId, losingProfileId))

  // --- Mention reference repair ---

  // 8. notifications.data JSON — update mentionedBy field
  const affectedNotifs = await db
    .select({ id: schema.notifications.id, data: schema.notifications.data })
    .from(schema.notifications)
    .where(like(schema.notifications.data, `%${losingProfileId}%`))
    .all()

  for (const notif of affectedNotifs) {
    try {
      const parsed = JSON.parse(notif.data)
      if (parsed.mentionedBy === losingProfileId) {
        parsed.mentionedBy = winningProfileId
      }
      await db.update(schema.notifications)
        .set({ data: JSON.stringify(parsed) })
        .where(eq(schema.notifications.id, notif.id))
    }
    catch {
      // Skip unparseable JSON
    }
  }

  // 9. comments.content — fix @[label](user:OLD_ID) markers
  await db.update(schema.comments)
    .set({
      content: sql`REPLACE(${schema.comments.content}, ${'user:' + losingProfileId}, ${'user:' + winningProfileId})`,
    })
    .where(like(schema.comments.content, `%user:${losingProfileId}%`))

  // 10. boards.data JSON — text replacement of losing ID with winning ID
  // This fixes createdBy, lastUpdatedBy, and @[label](user:id) markers in widget content
  await db.update(schema.boards)
    .set({
      data: sql`REPLACE(${schema.boards.data}, ${losingProfileId}, ${winningProfileId})`,
    })
    .where(like(schema.boards.data, `%${losingProfileId}%`))

  // --- Cleanup ---
  // 11. Delete the losing profile — ON DELETE CASCADE handles profile_authentications,
  //     remaining board_access, api_tokens, comments, notifications
  await db.delete(schema.profiles)
    .where(eq(schema.profiles.id, losingProfileId))
}
