// each store is one JSON value in localStorage
export function persisted<T extends object>(key: string, defaults: T): T {
  let saved: Partial<T> = {};
  try {
    saved = JSON.parse(localStorage.getItem(key) ?? '{}');
  } catch {
    // unreadable or blocked storage falls back to the defaults
  }
  const state = $state({ ...structuredClone(defaults), ...saved } as T);

  $effect.root(() => {
    $effect(() => {
      const json = JSON.stringify($state.snapshot(state));
      try {
        localStorage.setItem(key, json);
      } catch {
        // private windows can refuse storage, the page still works for this visit
      }
    });
  });

  return state;
}
