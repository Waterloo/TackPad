<script setup lang="ts">
import { useTackletStore } from '~/stores/tacklet'
import type { TackletManifestV1 } from '~/shared/types/board'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  add: [TackletManifestV1]
}>()

const runtimeConfig = useRuntimeConfig()
const tackletStore = useTackletStore()

const query = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const manifests = ref<TackletManifestV1[]>([])

const registryUrl = computed(() => runtimeConfig.public.tackletsRegistryUrl as string)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return manifests.value
  return manifests.value.filter((m) => {
    return m.name.toLowerCase().includes(q)
      || m.id.toLowerCase().includes(q)
      || (m.description || '').toLowerCase().includes(q)
      || (m.tags || []).some(tag => tag.toLowerCase().includes(q))
  })
})

async function loadDirectory() {
  loading.value = true
  error.value = null
  try {
    const raw = await $fetch<unknown>(registryUrl.value)
    if (!Array.isArray(raw)) throw new Error('Directory format must be an array')
    const valid: TackletManifestV1[] = []
    for (const entry of raw) {
      const checked = tackletStore.validateManifestV1(entry)
      if (!checked.ok) {
        console.warn('[tacklet] directory_entry_invalid', { entry, reason: checked.reason })
        continue
      }
      valid.push(checked.value)
    }
    manifests.value = valid
  }
  catch (err: any) {
    error.value = err?.message || 'Failed to load directory'
    manifests.value = []
  }
  finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  query.value = ''
  void loadDirectory()
}, { immediate: true })

function close() {
  emit('update:modelValue', false)
}

function addManifest(manifest: TackletManifestV1) {
  emit('add', manifest)
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="td">
      <div v-if="modelValue" class="td-back" @click.self="close">
        <div class="td-panel" role="dialog" aria-modal="true" aria-label="Tacklets Directory">
          <div class="td-head">
            <h3>Tacklets Directory</h3>
            <button type="button" @click="close">Close</button>
          </div>

          <div class="td-search">
            <input v-model="query" placeholder="Search tacklets..." />
          </div>

          <div class="td-meta">
            <span>{{ filtered.length }} results</span>
            <a :href="registryUrl" target="_blank" rel="noreferrer noopener">Registry</a>
          </div>

          <div class="td-list">
            <div v-if="loading" class="td-state">Loading...</div>
            <div v-else-if="error" class="td-state td-state--error">{{ error }}</div>
            <div v-else-if="filtered.length === 0" class="td-state">No tacklets found</div>

            <article v-for="manifest in filtered" :key="manifest.id" class="td-item">
              <img v-if="manifest.icon" :src="manifest.icon" alt="" />
              <div class="td-item-body">
                <strong>{{ manifest.name }}</strong>
                <small>{{ manifest.id }} · {{ manifest.version || '1.0.0' }}</small>
                <p>{{ manifest.description || 'No description provided.' }}</p>
              </div>
              <button type="button" @click="addManifest(manifest)">Add</button>
            </article>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.td-back {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.td-panel {
  width: min(780px, 96vw);
  max-height: min(80vh, 820px);
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.td-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.td-head h3 { font-size: 15px; margin: 0; }

.td-head button {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.td-search { padding: 12px 16px; }

.td-search input {
  width: 100%;
  border: 1px solid #dbe2ea;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
}

.td-meta {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 12px;
  padding: 0 16px 10px;
}

.td-list {
  overflow: auto;
  padding: 0 12px 12px;
}

.td-state {
  text-align: center;
  color: #64748b;
  padding: 24px;
  font-size: 13px;
}

.td-state--error {
  color: #b91c1c;
}

.td-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid #edf2f7;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
}

.td-item img {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

.td-item-body {
  flex: 1;
  min-width: 0;
}

.td-item-body strong {
  font-size: 13px;
  display: block;
}

.td-item-body small {
  color: #94a3b8;
  font-size: 11px;
}

.td-item-body p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.4;
}

.td-item button {
  border: 1px solid #93c5fd;
  color: #1d4ed8;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
}

.td-enter-active, .td-leave-active { transition: opacity .14s ease; }
.td-enter-from, .td-leave-to { opacity: 0; }
</style>
