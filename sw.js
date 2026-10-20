/* XOSOAPI PWA: cache only static app shell, never Supabase API or LIVE results. */
const CACHE='xosoapi-static-v1',ASSETS=['./index.html','./manifest.webmanifest','./pwa-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('xosoapi-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;if(url.pathname.endsWith('/index.html')||url.pathname==='/'||url.pathname.endsWith('/')){event.respondWith(fetch(req).catch(()=>caches.match('./index.html')));return}if(/\.(?:svg|webmanifest)$/.test(url.pathname)){event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));}});
