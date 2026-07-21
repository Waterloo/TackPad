<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useReactions } from '~/composables/widgets/useReactions'

const props = defineProps<{ itemId: string }>()

const { reactionList, toggle } = useReactions(props.itemId)

// Predefined emoji palette for the picker
const EMOJI_PALETTE = ['👍', '❤️', '😂', '🔥', '😮', '👏', '✅', '💡']

const pickerOpen = ref(false)
const pickerWrap = ref<HTMLElement | null>(null)

onClickOutside(pickerWrap, () => { pickerOpen.value = false })

function pick(emoji: string) {
  toggle(emoji)
  pickerOpen.value = false
}
</script>

<template>
  <div class="rbar">
    <!-- Existing reaction pills -->
    <button
      v-for="r in reactionList"
      :key="r.emoji"
      class="rbar-pill"
      :class="{ 'rbar-pill--voted': r.voted }"
      :title="`${r.count} ${r.count === 1 ? 'reaction' : 'reactions'}${r.voted ? ' · click to remove' : ''}`"
      @click.stop="toggle(r.emoji)"
    >
      <span class="rbar-emoji">{{ r.emoji }}</span>
      <span class="rbar-count">{{ r.count }}</span>
    </button>

    <!-- Add reaction button + emoji picker -->
    <div ref="pickerWrap" class="rbar-add-wrap">
      <button
        class="rbar-add"
        :class="{ 'rbar-add--open': pickerOpen }"
        title="Add reaction"
        @click.stop="pickerOpen = !pickerOpen"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" stroke-linecap="round" />
          <line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" stroke-linecap="round" />
        </svg>
      </button>

      <!-- Emoji picker popover -->
      <Transition name="picker">
        <div v-if="pickerOpen" class="rbar-picker" @click.stop>
          <button
            v-for="emoji in EMOJI_PALETTE"
            :key="emoji"
            class="rbar-picker-btn"
            :class="{ 'rbar-picker-btn--active': reactionList.some(r => r.emoji === emoji && r.voted) }"
            :title="emoji"
            @click.stop="pick(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.rbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* ── Reaction pills ──────────────────────────────────────────── */
.rbar-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px 2px 5px;
  border-radius: 999px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s, transform 0.1s;
  white-space: nowrap;
  line-height: 1;
}

.rbar-pill:hover {
  background: #F3F4F6;
  border-color: rgba(0, 0, 0, 0.14);
  transform: scale(1.08);
}

.rbar-pill--voted {
  background: #EFF6FF;
  border-color: #93C5FD;
}

.rbar-pill--voted:hover {
  background: #DBEAFE;
  border-color: #60A5FA;
}

.rbar-emoji {
  font-size: 13px;
  line-height: 1;
  /* prevent emoji from being cut off */
  display: inline-block;
  vertical-align: middle;
}

.rbar-count {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  font-variant-numeric: tabular-nums;
  min-width: 8px;
  text-align: center;
}

.rbar-pill--voted .rbar-count {
  color: #2563EB;
}

/* ── Add reaction button ─────────────────────────────────────── */
.rbar-add-wrap {
  position: relative;
}

.rbar-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border-radius: 999px;
  border: 1.5px dashed rgba(0, 0, 0, 0.18);
  background: transparent;
  color: #9CA3AF;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s, color 0.1s;
  flex-shrink: 0;
}

.rbar-add:hover,
.rbar-add--open {
  background: #F3F4F6;
  border-color: rgba(0, 0, 0, 0.28);
  border-style: solid;
  color: #6B7280;
}

/* ── Emoji picker popover ────────────────────────────────────── */
.rbar-picker {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 6px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.06);
  z-index: 20;
  white-space: nowrap;
}

.rbar-picker-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
}

.rbar-picker-btn:hover {
  background: #F3F4F6;
  transform: scale(1.2);
}

.rbar-picker-btn--active {
  background: #EFF6FF;
}

.rbar-picker-btn--active:hover {
  background: #DBEAFE;
}

/* ── Picker enter/leave animation ────────────────────────────── */
.picker-enter-active,
.picker-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.picker-enter-from,
.picker-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.92);
}
</style>
