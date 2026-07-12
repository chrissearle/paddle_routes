const BREAKPOINT = '(min-width: 1024px)'

export function useIsWide() {
  const isWide = ref(false)

  onMounted(() => {
    if (!import.meta.client) return

    const query = window.matchMedia(BREAKPOINT)
    isWide.value = query.matches

    const onChange = (e: MediaQueryListEvent) => {
      isWide.value = e.matches
    }
    query.addEventListener('change', onChange)

    onBeforeUnmount(() => {
      query.removeEventListener('change', onChange)
    })
  })

  return isWide
}
