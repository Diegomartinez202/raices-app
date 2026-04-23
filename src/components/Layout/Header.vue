<template>
  <header class="app-header">
    <div class="brand" @click="handleLogoClick">
      <h1>RAÍCES</h1>
    </div>
    <div class="actions">
      <button @click="$emit('onExport')" class="btn-icon">
        <span>📄</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { clearAllHistory } from '@/core/db/sqlite.service';

const emit = defineEmits(['onExport']);
const clickCount = ref(0);
const lastClickTime = ref(0);

const handleLogoClick = async () => {
  const now = Date.now();
  // Si pasa más de 1 segundo entre clics, reiniciamos el contador
  if (now - lastClickTime.value > 1000) {
    clickCount.value = 1;
  } else {
    clickCount.value++;
  }
  
  lastClickTime.value = now;

  if (clickCount.value === 3) {
    // ACCIÓN DE PÁNICO: Borrado rápido y cierre
    console.warn('[RAÍCES] ¡ACTIVADO PROTOCOLO DE PÁNICO!');
    await clearAllHistory();
    alert("Información protegida. La aplicación se cerrará.");
    // En Capacitor, esto cierra la app
    window.location.href = "https://www.google.com"; 
  }
};
</script>

<style scoped>
.app-header {
  background-color: #C65D3B;
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}
.brand h1 { margin: 0; font-size: 1.3rem; cursor: pointer; }
.btn-icon {
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  color: white;
}
</style>