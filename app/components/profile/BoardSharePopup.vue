<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import type { BoardAccessLevel } from '~/shared/types/access'

const props = defineProps<{ modelValue: boolean; boardId: string }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const boardStore = useBoardStore()
const authStore  = useAuthStore()
const { accessLevel, boardType, customUrl, title } = storeToRefs(boardStore)

// ── Access level ──────────────────────────────────────────────────────────────
const localLevel = ref<BoardAccessLevel>(accessLevel.value)
watch(accessLevel, v => { localLevel.value = v })

const ACCESS_OPTS = [
  { value: 'public'    as BoardAccessLevel, icon: '🌐', label: 'Public',    desc: 'Anyone can edit'  },
  { value: 'view_only' as BoardAccessLevel, icon: '👁',  label: 'View only', desc: 'Anyone can view'  },
  { value: 'private'   as BoardAccessLevel, icon: '🔒', label: 'Private',   desc: 'Invite only'      },
]

async function setLevel(level: BoardAccessLevel) {
  if (level === localLevel.value) return
  const ok = await authStore.requireUsername()
  if (!ok) return
  localLevel.value = level
  await $fetch(`/api/board/${props.boardId}`, {
    method: 'PATCH', body: { accessLevel: level },
  })
}

// ── Members ───────────────────────────────────────────────────────────────────
interface Member {
  profileId: string
  role: string
  firstName: string | null
  username: string | null
}

const members        = ref<Member[]>([])
const membersLoading = ref(false)

async function loadMembers() {
  membersLoading.value = true
  try {
    members.value = await $fetch<Member[]>(`/api/board/${props.boardId}/access`)
  }
  catch { members.value = [] }
  finally { membersLoading.value = false }
}

async function removeMember(profileId: string) {
  const ok = await authStore.requireUsername()
  if (!ok) return
  await $fetch(`/api/board/${props.boardId}/access`, { method: 'DELETE', body: { profileId } })
  members.value = members.value.filter(m => m.profileId !== profileId)
}

function memberName(m: Member) { return m.firstName || m.username || 'Anonymous' }
function memberInitial(m: Member) { return memberName(m)[0]?.toUpperCase() ?? '?' }
function memberColor(id: string): string {
  const p = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4']
  let h = 5381
  for (const c of id) h = ((h << 5) + h) ^ c.charCodeAt(0)
  return p[Math.abs(h) % p.length]!
}

// ── Invite ────────────────────────────────────────────────────────────────────
const inviteUsername = ref('')
const inviteRole     = ref<'editor' | 'viewer'>('editor')
const inviteStatus   = ref<{ ok: boolean; msg: string } | null>(null)
const inviting       = ref(false)

async function invite() {
  const hasUsername = await authStore.requireUsername()
  if (!hasUsername) return
  const username = inviteUsername.value.replace(/^@/, '').trim()
  if (!username || inviting.value) return
  inviting.value   = true
  inviteStatus.value = null
  try {
    const res = await $fetch<{ ok: boolean; invitee: { firstName: string | null; username: string | null } }>(
      `/api/board/${props.boardId}/invite`,
      { method: 'POST', body: { username, role: inviteRole.value } },
    )
    inviteStatus.value = { ok: true, msg: `✓ ${res.invitee.firstName || res.invitee.username || username} added as ${inviteRole.value}` }
    inviteUsername.value = ''
    await loadMembers()
  }
  catch (err: any) {
    inviteStatus.value = { ok: false, msg: err?.data?.message ?? 'User not found' }
  }
  finally { inviting.value = false }
}

// ── Copy link ─────────────────────────────────────────────────────────────────
const copied   = ref(false)
const customUrlInput = ref('')
const customUrlSaving = ref(false)
const customUrlStatus = ref<{ ok: boolean; msg: string } | null>(null)

function buildShareUrl(urlName: string) {
  if (!import.meta.client) return ''
  return `${window.location.origin}/to/${encodeURIComponent(urlName)}`
}

const shareUrl = computed(() => {
  if (!import.meta.client) return ''
  if (customUrl.value) return buildShareUrl(customUrl.value)
  return `${window.location.origin}/board/${props.boardId}`
})

function defaultFromTitle(boardTitle: string): string {
  const base = boardTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'board'
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${base}-${rand}`
}

function resetCustomUrlInput() {
  customUrlInput.value = customUrl.value ?? defaultFromTitle(title.value || 'board')
  customUrlStatus.value = null
}

async function saveCustomUrl() {
  const ok = await authStore.requireUsername()
  if (!ok || customUrlSaving.value) return

  const value = customUrlInput.value.trim()
  if (!value) {
    customUrlStatus.value = { ok: false, msg: 'Custom URL cannot be empty' }
    return
  }

  customUrlSaving.value = true
  customUrlStatus.value = null
  try {
    const res = await $fetch<{ ok: boolean; customUrl?: string }>(`/api/board/${props.boardId}`, {
      method: 'PATCH',
      body: { customUrl: value },
    })

    const next = res.customUrl ?? value.toLowerCase()
    customUrlInput.value = next
    customUrl.value = next
    customUrlStatus.value = { ok: true, msg: 'Custom URL saved' }
  }
  catch (err: any) {
    customUrlStatus.value = { ok: false, msg: err?.data?.message ?? 'Could not save custom URL' }
  }
  finally {
    customUrlSaving.value = false
  }
}

async function copyLink() {
  if (!shareUrl.value) return
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

watch(() => props.modelValue, (v) => {
  if (v) {
    localLevel.value = accessLevel.value
    loadMembers()
    resetCustomUrlInput()
  }
})
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    header="Share Board"
    :style="{ width: '460px', borderRadius: '14px' }"
    @update:visible="emit('update:modelValue', $event)"
  >
    <div class="sp-body">

      <!-- ── Access level ───────────────────────────────────────────────── -->
      <section v-if="boardType !== 'vault'" class="sp-sec">
        <p class="sp-label">Who can access</p>
        <div class="access-pills">
          <button
            v-for="opt in ACCESS_OPTS"
            :key="opt.value"
            class="a-pill"
            :class="{ 'a-pill--on': localLevel === opt.value }"
            @click="setLevel(opt.value)"
          >
            <span class="a-pill-icon">{{ opt.icon }}</span>
            <span class="a-pill-body">
              <span class="a-pill-name">{{ opt.label }}</span>
              <span class="a-pill-desc">{{ opt.desc }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- ── Invite ─────────────────────────────────────────────────────── -->
      <section v-if="boardType !== 'vault'" class="sp-sec">
        <p class="sp-label">Invite by username</p>
        <div class="inv-row">
          <input
            v-model="inviteUsername"
            class="inv-input"
            placeholder="@username"
            @keydown.enter="invite"
          />
          <select v-model="inviteRole" class="inv-role">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            class="inv-btn"
            :disabled="!inviteUsername.trim() || inviting"
            @click="invite"
          >{{ inviting ? '…' : 'Invite' }}</button>
        </div>
        <Transition name="msg">
          <p v-if="inviteStatus" class="inv-msg" :class="{ 'inv-msg--err': !inviteStatus.ok }">
            {{ inviteStatus.msg }}
          </p>
        </Transition>
      </section>

      <!-- ── Members ────────────────────────────────────────────────────── -->
      <section v-if="boardType !== 'vault'" class="sp-sec">
        <p class="sp-label">Members</p>
        <div class="member-list">
          <template v-if="membersLoading">
            <div v-for="n in 3" :key="n" class="skel" />
          </template>
          <template v-else>
            <div v-for="m in members" :key="m.profileId" class="m-row">
              <div class="m-av" :style="{ background: memberColor(m.profileId) }">
                {{ memberInitial(m) }}
              </div>
              <div class="m-info">
                <span class="m-name">{{ memberName(m) }}</span>
                <span v-if="m.username" class="m-handle">@{{ m.username }}</span>
              </div>
              <span class="role-pill" :class="`role-pill--${m.role}`">{{ m.role }}</span>
              <button
                v-if="m.role !== 'owner'"
                class="m-remove"
                title="Remove"
                @click="removeMember(m.profileId)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <!-- spacer so owner row aligns -->
              <span v-else class="m-remove-spacer" />
            </div>
          </template>
        </div>
      </section>

      <!-- ── Custom URL ──────────────────────────────────────────────────── -->
      <section v-if="boardType !== 'vault'" class="sp-sec">
        <p class="sp-label">Custom URL</p>
        <div class="custom-row">
          <input
            v-model="customUrlInput"
            class="custom-input"
            maxlength="256"
            placeholder="custom-url-name"
            @keydown.enter.prevent="saveCustomUrl"
          />
          <button
            class="custom-btn"
            :disabled="!customUrlInput.trim() || customUrlSaving"
            @click="saveCustomUrl"
          >
            {{ customUrlSaving ? '…' : 'Save' }}
          </button>
        </div>
        <Transition name="msg">
          <p v-if="customUrlStatus" class="inv-msg" :class="{ 'inv-msg--err': !customUrlStatus.ok }">
            {{ customUrlStatus.msg }}
          </p>
        </Transition>
      </section>

      <!-- ── Share link ──────────────────────────────────────────────────── -->
      <section v-if="boardType !== 'vault'" class="sp-sec sp-sec--last">
        <p class="sp-label">Board link</p>
        <div class="link-row">
          <input :value="shareUrl" readonly class="link-input" />
          <button class="copy-btn" :class="{ 'copy-btn--done': copied }" @click="copyLink">
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </section>

      <section v-else class="sp-sec sp-sec--last">
        <p class="sp-label">Vault board</p>
        <p class="vault-copy">
          Vault boards are personal owner-only spaces. Use encrypted item sharing inside standard boards when you want to share secrets with existing board members.
        </p>
      </section>

    </div>
  </Dialog>
</template>

<style scoped>
/* ── PrimeVue Dialog overrides ───────────────────────────────────────────── */
:deep(.p-dialog) {
  border-radius: 14px !important;
  border: 1px solid rgba(0,0,0,0.08) !important;
  box-shadow: 0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06) !important;
  overflow: hidden !important;
}
:deep(.p-dialog-header) {
  padding: 18px 22px 14px !important;
  border-bottom: 1px solid #F3F4F6 !important;
  font-size: 14.5px !important;
  font-weight: 600 !important;
  color: #0C0C0C !important;
  letter-spacing: -0.01em !important;
}
:deep(.p-dialog-content) { padding: 0 !important; }
:deep(.p-dialog-header-close) {
  width: 28px !important; height: 28px !important;
  border-radius: 7px !important; color: #9CA3AF !important;
}
:deep(.p-dialog-header-close:hover) { background: #F3F4F6 !important; color: #374151 !important; }

/* ── Body & sections ─────────────────────────────────────────────────────── */
.sp-body { font-family: system-ui, sans-serif; }

.sp-sec {
  padding: 16px 22px;
  border-bottom: 1px solid #F3F4F6;
}
.sp-sec--last { border-bottom: none; }

.sp-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: #9CA3AF; margin: 0 0 10px;
}

.vault-copy {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #6B7280;
}

/* ── Access pills ────────────────────────────────────────────────────────── */
.access-pills { display: flex; gap: 7px; }

.a-pill {
  flex: 1; display: flex; align-items: center; gap: 8px;
  padding: 9px 11px; border-radius: 9px;
  border: 1.5px solid #E9EAEC; background: #fff;
  cursor: pointer; text-align: left;
  transition: border-color 0.13s, background 0.13s, box-shadow 0.13s;
}
.a-pill:hover     { border-color: #D1D5DB; background: #FAFAFA; }
.a-pill--on       { border-color: #2563EB; background: #EFF6FF; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }

.a-pill-icon { font-size: 15px; line-height: 1; flex-shrink: 0; }
.a-pill-body { display: flex; flex-direction: column; gap: 1px; }
.a-pill-name { font-size: 12px; font-weight: 600; color: #111827; line-height: 1.2; }
.a-pill--on .a-pill-name { color: #1D4ED8; }
.a-pill-desc { font-size: 10.5px; color: #9CA3AF; line-height: 1.2; }

/* ── Invite ──────────────────────────────────────────────────────────────── */
.inv-row { display: flex; gap: 5px; align-items: center; }

.inv-input {
  flex: 1; height: 33px; padding: 0 10px;
  border: 1px solid #E5E7EB; border-radius: 8px;
  font-size: 13px; color: #111827;
  background: #FAFAFA; outline: none;
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
}
.inv-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: #fff; }
.inv-input::placeholder { color: #D1D5DB; }

.inv-role {
  height: 33px; padding: 0 8px; border: 1px solid #E5E7EB;
  border-radius: 8px; font-size: 12.5px; color: #374151;
  background: #FAFAFA; outline: none; cursor: pointer;
  transition: border-color 0.12s;
}
.inv-role:focus { border-color: #2563EB; }

.inv-btn {
  height: 33px; padding: 0 14px;
  background: #2563EB; color: #fff;
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  transition: background 0.1s, transform 0.1s;
}
.inv-btn:hover:not(:disabled)  { background: #1D4ED8; }
.inv-btn:active:not(:disabled) { transform: scale(0.97); }
.inv-btn:disabled              { opacity: 0.38; cursor: default; }

.inv-msg { margin: 7px 0 0; font-size: 12px; color: #22C55E; }
.inv-msg--err { color: #EF4444; }

.msg-enter-active { transition: opacity 0.18s, transform 0.18s; }
.msg-leave-active { transition: opacity 0.12s; }
.msg-enter-from   { opacity: 0; transform: translateY(-3px); }
.msg-leave-to     { opacity: 0; }

/* ── Members ─────────────────────────────────────────────────────────────── */
.member-list { display: flex; flex-direction: column; gap: 2px; }

.skel {
  height: 38px; border-radius: 8px;
  background: linear-gradient(90deg, #F3F4F6 25%, #EAEBEC 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }

.m-row {
  display: flex; align-items: center; gap: 9px;
  padding: 5px 8px; border-radius: 8px;
  transition: background 0.1s;
}
.m-row:hover { background: #F9FAFB; }
.m-row:hover .m-remove { opacity: 1; transform: scale(1); }

.m-av {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
}

.m-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.m-name { font-size: 12.5px; font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-handle { font-size: 11px; color: #9CA3AF; }

.role-pill {
  font-size: 10.5px; font-weight: 600;
  padding: 2px 7px; border-radius: 9999px; white-space: nowrap;
}
.role-pill--owner  { background: #DCFCE7; color: #166534; }
.role-pill--editor { background: #DBEAFE; color: #1D4ED8; }
.role-pill--viewer { background: #F3F4F6; color: #6B7280; }

.m-remove {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 6px;
  color: #C4C9D1; cursor: pointer;
  opacity: 0; transform: scale(0.7);
  transition: background 0.1s, color 0.1s, opacity 0.15s, transform 0.15s;
}
.m-remove:hover { background: #FEE2E2; color: #EF4444; }

.m-remove-spacer { width: 24px; flex-shrink: 0; }

/* ── Custom URL ─────────────────────────────────────────────────────────── */
.custom-row { display: flex; gap: 6px; align-items: center; }

.custom-input {
  flex: 1; height: 33px; padding: 0 10px;
  border: 1px solid #E5E7EB; border-radius: 8px;
  font-size: 12px; color: #111827;
  background: #FAFAFA; outline: none;
  font-family: 'Courier New', monospace;
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
}
.custom-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: #fff; }

.custom-btn {
  height: 33px; padding: 0 12px;
  border: 1px solid #E5E7EB; border-radius: 8px;
  background: #fff; font-size: 12.5px; font-weight: 500;
  color: #374151; cursor: pointer; white-space: nowrap;
}
.custom-btn:disabled { opacity: 0.38; cursor: default; }

/* ── Share link ──────────────────────────────────────────────────────────── */
.link-row { display: flex; gap: 6px; }

.link-input {
  flex: 1; height: 33px; padding: 0 10px;
  border: 1px solid #E5E7EB; border-radius: 8px;
  font-size: 11.5px; color: #6B7280;
  background: #FAFAFA; outline: none;
  font-family: 'Courier New', monospace;
  overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; cursor: default;
}

.copy-btn {
  height: 33px; padding: 0 13px;
  border: 1px solid #E5E7EB; border-radius: 8px;
  background: #fff; font-size: 12.5px; font-weight: 500;
  color: #374151; cursor: pointer; white-space: nowrap; min-width: 68px;
  transition: background 0.1s, border-color 0.1s, color 0.12s;
}
.copy-btn:hover      { background: #F9FAFB; border-color: #D1D5DB; }
.copy-btn--done      { color: #22C55E; border-color: #BBF7D0; background: #F0FDF4; }
</style>
