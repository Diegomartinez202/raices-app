<template>
  <div class="source-container">
    <div :class="['badge', isMacrocaso ? 'badge-m10' : 'badge-gen']">
      {{ isMacrocaso ? 'JEP - Macrocaso 10' : 'Fuente Oficial JEP' }}
    </div>
    <span class="source-text">Doc: {{ source }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ source: string }>();

const isMacrocaso = computed(() => {
  const s = props.source.toLowerCase();
  return s.includes('001') || s.includes('m10') || s.includes('macrocaso');
});
</script>

<style scoped>
.source-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(212, 163, 115, 0.2);
}

.badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
}

.badge-m10 { background-color: #C65D3B; }
.badge-gen { background-color: #588157; }

.source-text {
  font-size: 9px;
  color: #6B5E4F;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
</style>