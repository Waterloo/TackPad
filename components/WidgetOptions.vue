<script setup lang="ts">
const props = defineProps<{
  itemId: string;
}>();

const disabled = ref(true);
nextTick(() => {
disabled.value = false
});

</script>
<template>
<div v-if="!disabled">     
<Teleport :to="`.${props.itemId}`" ><slot></slot></Teleport>
</div>
</template>
<style></style>