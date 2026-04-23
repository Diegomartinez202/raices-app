<template>
  <AppInitializer>
    <MainChat />
  </AppInitializer>
</template>

<script setup lang="ts">
import AppInitializer from './components/AppInitializer.vue';
import MainChat from './views/MainChat.vue';
</script>

<style>
/* Estilos globales */
body { margin: 0; padding: 0; font-family: sans-serif; background: #F5F1E8; }
</style>