export function clearClientAcademicCaches() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (key.startsWith('gng_cached_') || key.startsWith('__api_cache_')) storage.removeItem(key);
    }
  }
}
