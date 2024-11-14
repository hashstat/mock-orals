async function addResourcesToCache(resources) {
  const cache = await caches.open('v1')
  await cache.addAll(resources)
}

async function putInCache(request, response) {
  const cache = await caches.open('v1')
  await cache.put(request, response)
}

async function cacheFirst({ request }) {
  // First try to get the resource from the cache
  const responseFromCache = await caches.match(request)
  if (responseFromCache) {
    return responseFromCache
  }

  // Next try to get the resource from the network
  try {
    const responseFromNetwork = await fetch(request.clone())
    // response may be used only once
    // we need to save clone to put one copy in cache
    // and serve second one
    putInCache(request, responseFromNetwork.clone())
    return responseFromNetwork
  } catch (error) {
    // There is nothing we can do, but we must always
    // return a Response object
    return new Response('Network error occurred', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

async function enableNavigationPreload() {
  if (self.registration.navigationPreload) {
    // Enable navigation preloads!
    await self.registration.navigationPreload.enable()
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(enableNavigationPreload())
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    addResourcesToCache([
      './',
      './index.html',
      './passages.js',
      './script.js',
      './style.css',
      './2025/junior-esv.json',
      './2025/junior-kjv.json',
      './2025/junior-nasb.json',
      './2025/junior-niv.json',
      './2025/junior-nkjv.json',
      './2025/primary-esv.json',
      './2025/primary-kjv.json',
      './2025/primary-nasb.json',
      './2025/primary-niv.json',
      './2025/primary-nkjv.json',
      './2025/senior-esv.json',
      './2025/senior-kjv.json',
      './2025/senior-nasb.json',
      './2025/senior-niv.json',
      './2025/senior-nkjv.json',
      './bootstrap@5.3.3/bootstrap.bundle.min.js',
      './bootstrap@5.3.3/bootstrap.min.css',
    ])
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    cacheFirst({
      request: event.request
    })
  )
})
