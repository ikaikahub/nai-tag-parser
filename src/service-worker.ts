/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;
const APP_FILES = [...build, ...files, ...prerendered];

// a new version takes over straight away instead of waiting for every tab to close, the page then reloads into it
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => sw.clients.claim()),
  );
});

// the app itself comes from the cache, NovelAI requests always go to the network
sw.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (APP_FILES.includes(url.pathname)) {
        const cached = await cache.match(url.pathname);
        if (cached) return cached;
      }
      try {
        return await fetch(event.request);
      } catch (error) {
        // offline navigation falls back to the cached page
        const page = event.request.mode === 'navigate' ? await cache.match(prerendered[0]) : undefined;
        if (page) return page;
        throw error;
      }
    })(),
  );
});
