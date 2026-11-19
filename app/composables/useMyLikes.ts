/**
 * Likes de la personne connectée parmi les setups affichés.
 * Lus côté client uniquement : les pages publiques (galerie, profils, viewer) restent identiques pour tout le monde
 * et peuvent être mises en cache. Pour une personne non connectée, l'API renvoie une liste vide.
 */
export function useMyLikes(ids: MaybeRefOrGetter<string[]>) {
  const liked = ref(new Set<string>())
  const known = new Set<string>()

  async function load(list: string[]) {
    const missing = list.filter((id) => !known.has(id))
    if (!missing.length) return
    missing.forEach((id) => known.add(id))
    try {
      const { liked: ids } = await $fetch<{ liked: string[] }>('/api/me/likes', { query: { ids: missing.join(',') } })
      if (ids.length) liked.value = new Set([...liked.value, ...ids])
    } catch {
      missing.forEach((id) => known.delete(id))
    }
  }

  onMounted(() => {
    watch(() => toValue(ids), (list) => load(list), { immediate: true })
  })

  function set(id: string, value: boolean) {
    const next = new Set(liked.value)
    if (value) next.add(id)
    else next.delete(id)
    liked.value = next
  }

  return { liked, set }
}
