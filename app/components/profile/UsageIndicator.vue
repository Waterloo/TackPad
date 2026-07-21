<script setup lang="ts">
const props = defineProps<{
  consumption: number
  limit: number
  remaining: number
  plan: 'free' | 'paid'
}>()

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const progress = computed(() => {
  if (props.limit <= 0) return 0
  return Math.min(100, Math.max(0, (props.consumption / props.limit) * 100))
})
</script>

<template>
  <div class="usage-card">
    <div class="usage-head">
      <span class="usage-title">Storage usage</span>
      <span class="usage-plan" :class="`usage-plan--${plan}`">{{ plan === 'paid' ? 'Paid' : 'Free' }}</span>
    </div>

    <div class="usage-bar">
      <div class="usage-fill" :style="{ width: `${progress}%` }" />
    </div>

    <div class="usage-meta">
      <span>{{ formatBytes(consumption) }} / {{ formatBytes(limit) }}</span>
      <span>{{ formatBytes(remaining) }} left</span>
    </div>
  </div>
</template>

<style scoped>
.usage-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 12px;
}

.usage-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.usage-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.usage-plan {
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 3px 8px;
}

.usage-plan--free {
  color: #0369A1;
  background: #E0F2FE;
}

.usage-plan--paid {
  color: #166534;
  background: #DCFCE7;
}

.usage-bar {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #E5E7EB;
}

.usage-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563EB 0%, #3B82F6 100%);
}

.usage-meta {
  margin-top: 8px;
  color: #6B7280;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
}
</style>
