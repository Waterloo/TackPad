<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

interface Member {
  id: string
  username: string | null
  firstName: string | null
  publicKey: string | null
}

const props = defineProps<{
  modelValue: boolean
  boardId: string
  selectedRecipientIds: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [recipients: SecretRecipientSelection[]]
}>()

const authStore = useAuthStore()
const members = ref<Member[]>([])
const loading = ref(false)
const selectedIds = ref<string[]>([])
const inviteUsername = ref('')
const inviting = ref(false)
const inviteStatus = ref<{ ok: boolean; msg: string } | null>(null)

watch(() => props.selectedRecipientIds, (ids) => {
  selectedIds.value = [...ids]
}, { immediate: true })

watch(() => props.modelValue, async (open) => {
  if (!open) return
  selectedIds.value = [...props.selectedRecipientIds]
  inviteStatus.value = null
  await loadMembers()
}, { immediate: true })

async function loadMembers() {
  loading.value = true
  try {
    members.value = await $fetch<Member[]>(`/api/board/${props.boardId}/members`)
  }
  catch {
    members.value = []
  }
  finally {
    loading.value = false
  }
}

function toggleRecipient(profileId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(profileId)) next.delete(profileId)
  else next.add(profileId)
  selectedIds.value = [...next]
}

function memberName(member: Member): string {
  return member.firstName || member.username || 'Anonymous'
}

const currentUserId = computed(() => authStore.profile?.id ?? null)

function canShareWith(member: Member): boolean {
  return member.id !== currentUserId.value && !!member.username && !!member.publicKey
}

async function inviteMember() {
  const hasUsername = await authStore.requireUsername()
  if (!hasUsername) return

  const username = inviteUsername.value.replace(/^@/, '').trim().toLowerCase()
  if (!username || inviting.value) return

  inviting.value = true
  inviteStatus.value = null
  try {
    const res = await $fetch<{ invitee: { id: string; username: string | null; firstName: string | null } }>(
      `/api/board/${props.boardId}/invite`,
      {
        method: 'POST',
        body: { username, role: 'viewer' },
      },
    )
    inviteStatus.value = {
      ok: true,
      msg: `Added ${res.invitee.firstName || res.invitee.username || username}.`,
    }
    inviteUsername.value = ''
    await loadMembers()

    const added = members.value.find(m => m.id === res.invitee.id)
    if (added && canShareWith(added)) {
      const next = new Set(selectedIds.value)
      next.add(added.id)
      selectedIds.value = [...next]
    }
  }
  catch (err: any) {
    inviteStatus.value = { ok: false, msg: err?.data?.message ?? 'Could not add participant.' }
  }
  finally {
    inviting.value = false
  }
}

function save() {
  const recipients = members.value
    .filter(member => selectedIds.value.includes(member.id) && member.publicKey)
    .map(member => ({
      profileId: member.id,
      publicKey: member.publicKey!,
    }))
  emit('save', recipients)
  emit('update:modelValue', false)
}
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    header="Share encrypted item"
    :style="{ width: '420px', borderRadius: '14px' }"
    @update:visible="emit('update:modelValue', $event)"
  >
    <div class="ssd-body">
      <p class="ssd-copy">
        Add participants by username, then choose who should receive this encrypted item.
      </p>

      <div class="ssd-invite">
        <input
          v-model="inviteUsername"
          class="ssd-invite-input"
          placeholder="@username"
          @keydown.enter.prevent="void inviteMember()"
        >
        <button
          class="ssd-invite-btn"
          :disabled="!inviteUsername.trim() || inviting"
          @click="void inviteMember()"
        >
          {{ inviting ? 'Adding...' : 'Add' }}
        </button>
      </div>
      <p v-if="inviteStatus" class="ssd-invite-msg" :class="{ 'ssd-invite-msg--err': !inviteStatus.ok }">
        {{ inviteStatus.msg }}
      </p>

      <div class="ssd-list">
        <template v-if="loading">
          <div v-for="n in 3" :key="n" class="ssd-skel" />
        </template>
        <template v-else>
          <button
            v-for="member in members"
            :key="member.id"
            class="ssd-row"
            :class="{
              'ssd-row--on': selectedIds.includes(member.id),
              'ssd-row--disabled': !canShareWith(member),
            }"
            :disabled="!canShareWith(member)"
            @click="toggleRecipient(member.id)"
          >
            <div class="ssd-main">
              <span class="ssd-name">{{ memberName(member) }}</span>
              <span v-if="member.username" class="ssd-handle">@{{ member.username }}</span>
            </div>
            <span class="ssd-state">
              <template v-if="!member.username">No username</template>
              <template v-else-if="!member.publicKey">No encryption key</template>
              <template v-else-if="selectedIds.includes(member.id)">Selected</template>
              <template v-else>Select</template>
            </span>
          </button>
        </template>
      </div>

      <div class="ssd-actions">
        <button class="ssd-btn ssd-btn--light" @click="emit('update:modelValue', false)">Cancel</button>
        <button class="ssd-btn" @click="save">Save recipients</button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.ssd-body {
  padding: 2px 0 0;
  font-family: system-ui, sans-serif;
}

.ssd-copy {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.45;
  color: #6B7280;
}

.ssd-invite {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ssd-invite-input {
  flex: 1;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #D1D5DB;
  padding: 0 12px;
  font-size: 13px;
  color: #111827;
}

.ssd-invite-btn {
  height: 38px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ssd-invite-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

.ssd-invite-msg {
  margin: 0 0 10px;
  font-size: 12px;
  color: #059669;
}

.ssd-invite-msg--err {
  color: #DC2626;
}

.ssd-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.ssd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.ssd-row--on {
  border-color: #2563EB;
  background: #EFF6FF;
}

.ssd-row--disabled {
  opacity: 0.6;
  cursor: default;
}

.ssd-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ssd-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.ssd-handle,
.ssd-state {
  font-size: 12px;
  color: #6B7280;
}

.ssd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.ssd-btn {
  height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: #2563EB;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ssd-btn--light {
  background: #F3F4F6;
  color: #111827;
}

.ssd-skel {
  height: 54px;
  border-radius: 12px;
  background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
  background-size: 200% 100%;
  animation: ssd-shimmer 1.1s infinite linear;
}

@keyframes ssd-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
</style>
