<template>
  <div :class="['bubble-wrapper', message.isUser ? 'user-align' : 'ai-align']">
    <div :class="['bubble', message.isUser ? 'user-style' : 'ai-style']">
      <p class="text">{{ message.text }}</p>
      
      <SourceBadge 
        v-if="!message.isUser && message.sources && message.sources.length > 0" 
        :source="message.sources[0]" 
      />

      <p :class="['time', message.isUser ? 'text-right' : 'text-left']">
        {{ formatTime(message.timestamp) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import SourceBadge from './SourceBadge.vue'; // Importación corregida a .vue

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: number | Date
  sources?: string[] // Añadimos la propiedad opcional de fuentes
}

defineProps<{ message: Message }>();

const formatTime = (ts: number | Date) => {
  const date = typeof ts === 'number' ? new Date(ts) : ts;
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
/* Tu estilo anterior se mantiene igual */
.bubble-wrapper { display: flex; width: 100%; margin-bottom: 12px; }
.user-align { justify-content: flex-end; }
.ai-align { justify-content: flex-start; }

.bubble {
  max-width: 85%; /* Un poco más ancho para que quepa la fuente */
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.5;
}

.user-style {
  background-color: #C65D3B;
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-style {
  background-color: white;
  color: #2D2A26;
  border: 1px solid rgba(212, 163, 115, 0.3);
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.text { margin: 0; font-size: 1rem; }
.time { font-size: 0.7rem; margin-top: 4px; opacity: 0.7; }
</style>