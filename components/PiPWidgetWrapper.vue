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
        <div
            class="absolute top-0 left-0 right-0 h-8 bg-gray-50/90 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100]">
            <!-- Drag Handle -->
            <div class="drag-handle cursor-move p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                </svg>
            </div>

            <!-- Remove Button -->
            <button @click.stop="$emit('remove', itemId)" @mousedown.stop @touchstart.stop
                @mouseenter="isHoveringClose = true" @mouseleave="isHoveringClose = false"
                class="p-2 -mr-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors duration-200"
                title="Remove from PiP">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

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
</style>
