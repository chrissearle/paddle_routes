<script setup lang="ts">
const colorMode = useColorMode()

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="app-shell">
      <header class="app-header">
        <div class="app-header__title">
          <AppLogo />
          <h1 class="font-display">Paddle routes</h1>
        </div>
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          aria-label="Toggle dark mode"
          @click="toggleColorMode"
        />
      </header>
      <NuxtPage />
    </div>
  </UApp>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--ui-border);
}

.app-header__title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.app-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}
</style>
