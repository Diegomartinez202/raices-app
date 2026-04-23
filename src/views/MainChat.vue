<template>
  <div class="chat-container">
    <Header @onExport="handleExport" />

    <main class="messages-area" ref="scrollBox">
      <ChatBubble 
        v-for="msg in messages" 
        :key="msg.id" 
        :message="msg" 
      />
      <div v-if="isLoading" class="typing">RAÍCES está procesando...</div>
    </main>

    <footer class="input-area">
      <ChatInput :isLoading="isLoading" @onSendMessage="handleSendMessage" />
      <p class="privacy-note">Privacidad absoluta: Sin nubes, sin rastros.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import Header from '@/components/Layout/Header.vue';
import ChatBubble from '@/components/Chat/ChatBubble.vue';
import ChatInput from '@/components/Chat/ChatInput.vue';

// Importación de tus microservicios de lógica
import { saveMessage, getMessages, isDBReady } from '@/core/db/sqlite.service';
import { retrieveContext } from '@/core/rag/rag.service';
import { generateResponse, isLlamaReady } from '@/core/ai/llama.service';
import { exportHistoryToPDF } from '@/core/services/export.service';

// --- ESTADO ---
const messages = ref<any[]>([]);
const isLoading = ref(false);
const scrollBox = ref<HTMLElement | null>(null);

// --- SCROLL AUTOMÁTICO ---
const scrollToBottom = async () => {
  await nextTick(); // Espera a que Vue renderice el nuevo mensaje
  if (scrollBox.value) {
    scrollBox.value.scrollTo({
      top: scrollBox.value.scrollHeight,
      behavior: 'smooth'
    });
  }
};

// Vigilamos cuando cambian los mensajes para bajar el scroll
watch(messages, () => scrollToBottom(), { deep: true });

// --- CARGA INICIAL (Persistencia) ---
onMounted(async () => {
  const history = await getMessages(30);
  if (history && history.length > 0) {
    messages.value = history.map(m => ({
      ...m,
      isUser: m.isUser === 1,
      timestamp: new Date(m.timestamp)
    }));
  }
  scrollToBottom();
});

// --- PROCESAMIENTO DE MENSAJES ---
const handleSendMessage = async (text: string) => {
  if (!text || text.trim() === "") return; // Evita el error de 'undefined'

  const now = Date.now();
  const userMsg = {
    id: now.toString(),
    text: text,
    isUser: true,
    timestamp: new Date(now)
  };

  // 1. Guardar y mostrar mensaje del usuario
  messages.value.push(userMsg);
  if (isDBReady()) {
    await saveMessage({
      id: userMsg.id,
      text: userMsg.text,
      isUser: true,
      timestamp: now
    });
  }

  isLoading.value = true;

  try {
    // 2. RAG + Llama Local
    const context = await retrieveContext(text);
    
    // Aquí usamos tu llama.service.ts
    const aiResponse = isLlamaReady() 
      ? await generateResponse(text, context.chunks)
      : "El motor de IA se está iniciando, por favor espera...";

    const botTimestamp = Date.now();
    const botMsg = {
      id: botTimestamp.toString(),
      text: aiResponse,
      isUser: false,
      timestamp: new Date(botTimestamp),
      source: context.sources[0] || 'Conocimiento General'
    };

    // 3. Persistencia de la respuesta de la IA
    messages.value.push(botMsg);
    if (isDBReady()) {
      await saveMessage({
        id: botMsg.id,
        text: botMsg.text,
        isUser: false,
        timestamp: botTimestamp,
        source: botMsg.source
      });
    }
  } catch (error) {
    console.error("Error procesando respuesta:", error);
  } finally {
    isLoading.value = false;
  }
};

const handleExport = () => exportHistoryToPDF();
</script>

<style scoped>
.chat-container { display: flex; flex-direction: column; height: 100vh; background: #F5F1E8; }
.messages-area { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.input-area { padding: 10px; background: white; border-top: 1px solid rgba(212, 163, 115, 0.2); }
.privacy-note { font-size: 10px; text-align: center; color: #6B5E4F; margin-top: 8px; opacity: 0.6; }
.typing { font-size: 12px; color: #C65D3B; font-style: italic; margin-bottom: 10px; }
</style>