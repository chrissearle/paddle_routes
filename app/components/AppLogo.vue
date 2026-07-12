<template>
  <svg viewBox="0 0 32 32" class="app-logo" aria-hidden="true">
    <rect width="32" height="32" rx="7" class="app-logo__bg" />
    <g transform="rotate(45 16 16)">
      <rect x="14.4" y="3.5" width="3.2" height="25" rx="1.6" class="app-logo__paddle" />
      <ellipse cx="16" cy="4.5" rx="5.2" ry="3.1" class="app-logo__paddle" />
      <ellipse cx="16" cy="27.5" rx="5.2" ry="3.1" class="app-logo__paddle" />
    </g>
  </svg>
</template>

<style scoped>
.app-logo {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
}

.app-logo__bg {
  fill: #0a1420;
}

.app-logo__paddle {
  fill: #ffc738;
}
</style>
