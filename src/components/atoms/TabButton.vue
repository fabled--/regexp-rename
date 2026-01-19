<script setup lang="ts">
defineProps<{
  label: string;
  active?: boolean;
}>()
</script>

<template>
  <button
    class="px-6 py-2 rounded-t-lg font-semibold transition-all duration-200 border-b-2"
    :class="[
      active
        ? 'bg-white border-blue-600 text-blue-700'
        : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    ]"
  >
    {{ label }}
  </button>
</template>
