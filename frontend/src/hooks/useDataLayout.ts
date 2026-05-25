import { useSyncExternalStore } from 'react';

function subscribeLayout(onStoreChange: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(onStoreChange);
  obs.observe(el, { attributes: true, attributeFilter: ['data-layout'] });
  return () => obs.disconnect();
}

function getLayoutSnapshot() {
  return document.documentElement.dataset.layout ?? 'standard';
}

/** Aktuelles Theme (`document.documentElement.dataset.layout`), aktualisiert bei Wechsel. */
export function useDataLayout(): string {
  return useSyncExternalStore(subscribeLayout, getLayoutSnapshot, getLayoutSnapshot);
}
