<script setup lang="ts">
    import ControlButtons from './ControlButtons.vue'
    import MiniMap from './MiniMap.vue'
</script>

<template>
    <div class="zoom-controls-container">
        <MiniMap />
        <ControlButtons />
    </div>
</template>

<style scoped>
.zoom-controls-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: end;
}
</style>
