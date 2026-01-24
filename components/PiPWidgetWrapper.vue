<script setup lang="ts">
defineProps<{
    itemId: string;
    interactionDisabled?: boolean;
}>();

defineEmits<{
    (e: 'remove', id: string): void;
}>();

const isHoveringClose = ref(false);
</script>

<template>
    <div
        class="pip-widget-wrapper relative group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
        <!-- Controls Header -->
        <!-- Drag Handle (Pill) -->
        <div
            class="drag-handle drag-handle-horizontal opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100]">
            <div class="visible-handle"></div>
        </div>

        <!-- Remove Button (Floating) -->
        <button @click.stop="$emit('remove', itemId)" @mousedown.stop @touchstart.stop
            @mouseenter="isHoveringClose = true" @mouseleave="isHoveringClose = false"
            class="absolute top-0 right-0  hover:bg-gray-100 rounded-bl-lg text-gray-400 hover:text-red-500 transition-all duration-200 z-[101] opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm shadow-sm border-l border-b border-gray-100 border-transparent hover:border-gray-200"
            title="Remove from PiP">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>

        <!-- Content -->
        <div class="widget-content" :class="{ 'pointer-events-none': interactionDisabled || isHoveringClose }">
            <slot></slot>
        </div>

        <!-- Teleport Target for WidgetOptions (Hidden in PiP) -->
        <div :class="itemId" style="display: none;"></div>
    </div>
</template>

<style scoped>
.widget-content {
    min-height: 100px;
}

.drag-handle-horizontal {
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: 100%;
    height: 20px;
    border-radius: 4px;
    cursor: grab;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Ensure it's draggable if the parent expects a class or region */
    -webkit-app-region: drag;
}

.drag-handle-horizontal .visible-handle {
    background: rgba(0, 0, 0, 0.2);
    width: 40px;
    height: 6px;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.drag-handle-horizontal:active {
    cursor: grabbing;
}
</style>
