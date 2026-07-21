<script setup lang="ts">
/**
 * Teleports widget-specific toolbar controls into WidgetWrapper's custom slot.
 * Usage inside any widget component:
 *
 *   <WidgetOptions :item-id="itemId">
 *     <ColorPicker :color="item.content.color" @change="updateColor" />
 *   </WidgetOptions>
 */
const props = defineProps<{ itemId: string }>()

// The teleport target matches `.widget-slot-{id}` set in WidgetWrapper
const target = computed(() => `.widget-slot-${props.itemId}`)
</script>

<template>
  <Teleport defer :to="target" :disabled="!target">
    <slot />
  </Teleport>
</template>
