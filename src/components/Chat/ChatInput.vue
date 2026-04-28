<template>
  <div class="chat-input-container">
    <input
      v-model="texto"
      type="text"
      :disabled="isLoading"
      :placeholder="isLoading ? 'RAÍCES está pensando...' : 'Escribe tu pregunta aquí...'"
      @keydown.enter="enviar"
    />
    <button 
      @click="enviar" 
      :disabled="isLoading || !texto.trim()"
      class="send-button"
    >
      <span v-if="!isLoading">Enviar</span>
      <span v-else>...</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ isLoading: boolean }>();
const emit = defineEmits(['onSendMessage']);

const texto = ref('');

const enviar = () => {
  if (texto.value.trim() !== '' && !props.isLoading) {
    emit('onSendMessage', texto.value);
    texto.value = ''; // <--- Limpieza de texto igual que en tu lógica original
  }
};
</script>

<style scoped>
.chat-input-container {
  display: flex;
  gap: 10px;
  padding: 16px;
  background: white;
  border-top: 1px solid rgba(212, 163, 115, 0.2);
}

input {
  flex: 1;
  padding: 12px 18px;
  border-radius: 25px;
  border: 1px solid #D4A373;
  outline: none;
  font-size: 1rem;
}

input:disabled { background-color: #F5F1E8; }

.send-button {
  background-color: #C65D3B;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 0 20px;
  font-weight: bold;
  cursor: pointer;
}

.send-button:disabled { background-color: #6B5E4F; opacity: 0.5; }
</style>