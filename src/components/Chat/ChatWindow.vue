<template>
  <div class="chat-window">
    <Header @onExport="handleExport" />

    <div class="messages-container" ref="scrollBox">
      <ChatBubble 
        v-for="msg in messages" 
        :key="msg.id" 
        :message="msg" 
      />
      <div v-if="isLoading" class="typing-indicator">RAÍCES está analizando...</div>
    </div>

    <ChatInput :isLoading="isLoading" @onSendMessage="processUserMessage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import Header from '@/components/Layout/Header.vue';
import ChatBubble from '@/components/Chat/ChatBubble.vue';
import ChatInput from '@/components/Chat/ChatInput.vue';
import { saveMessage, getMessages } from '@/core/db/sqlite.service';
import { exportHistoryToPDF } from '@/core/services/export.service';

// --- ESTADO ---
const messages = ref<any[]>([]);
const isLoading = ref(false);
const scrollBox = ref<HTMLElement | null>(null);

// --- CARGA INICIAL ---
onMounted(async () => {
  const history = await getMessages(50);
  messages.value = history.map(m => ({
    ...m,
    isUser: m.isUser === 1 // Convertimos SQLite a Booleano
  }));
  scrollToBottom();
});

// --- LÓGICA DE MENSAJERÍA ---
const processUserMessage = async (text: string) => {
  const userMsg = {
    id: Date.now().toString(),
    text,
    isUser: true,
    timestamp: Date.now()
  };

  messages.value.push(userMsg);
  await saveMessage(userMsg); // Guardar en SQLCipher
  scrollToBottom();

  isLoading.value = true;

  try {
    // AQUÍ llamarás a tu servicio de IA (RAG)
    // const response = await queryRAG(text); 
    
    // Simulación de respuesta IA mientras terminamos el RAG
    setTimeout(async () => {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: "He recibido tu consulta. Estoy procesando la información desde el corpus de la JEP...",
        isUser: false,
        timestamp: Date.now()
      };
      messages.value.push(aiMsg);
      await saveMessage(aiMsg);
      isLoading.value = false;
      scrollToBottom();
    }, 1500);

  } catch (error) {
    isLoading.value = false;
  }
};

const handleExport = () => exportHistoryToPDF({ shareAfterExport: true });

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollBox.value) {
      scrollBox.value.scrollTop = scrollBox.value.scrollHeight;
    }
  });
};
</script>

<style scoped>
.chat-window { display: flex; flex-direction: column; height: 100vh; }
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #F5F1E8;
}
.typing-indicator {
  font-size: 0.8rem;
  color: #C65D3B;
  font-style: italic;
  margin-top: 10px;
}
</style>