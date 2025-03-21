<script setup lang="ts">
const props = defineProps<{
  itemId: string
  isSelected: boolean
  src: string
}>()
</script>
<template>
<div class="h-full rounded">
  <img :src="src">
</div>
</template>
<style>

</style>