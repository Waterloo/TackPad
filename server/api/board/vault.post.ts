import { useDrizzle } from '../../utils/db'
import { getOrCreateVaultBoard } from '../../utils/secrets'
import { sqlNow } from '../../utils/board'
import { reserveDefaultCustomBoardUrl } from '../../utils/boardCustomUrl'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const db = useDrizzle(event)

  const vault = await getOrCreateVaultBoard({
    db,
    profileId,
    now: sqlNow(),
  })

  const customUrl = await reserveDefaultCustomBoardUrl(db, vault.id, vault.title)

  return {
    id: vault.id,
    title: vault.title,
    customUrl,
  }
})
