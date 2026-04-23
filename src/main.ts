import { createApp } from 'vue'
import App from './App.vue'
import { defineCustomElements } from '@ionic/pwa-elements/loader'

// Registra elementos de Capacitor (Cámara, Galería, etc.)
defineCustomElements(window);

const app = createApp(App)
app.mount('#app') // En index.html debe haber un <div id="app"></div>