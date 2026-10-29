/* Permite abrir la app sin conexión. Los datos no pasan por aquí: viven en el dispositivo (localStorage). */
const CACHE = 'contabilidad-v1';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const guardar = (req, res) => { if (res && (res.ok || res.type === 'opaque')){ const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; };

/* La app: primero la red (así llegan los cambios que subas a GitHub); si no hay red o tarda más de 3 s, la copia guardada */
function redPrimero(req){
  return new Promise(resolve => {
    let hecho = false;
    const fin = r => { if (!hecho && r){ hecho = true; resolve(r); } };
    const desdeCache = () => caches.match(req, {ignoreSearch:true}).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : null));
    const t = setTimeout(() => desdeCache().then(fin), 3000);
    fetch(req).then(res => { clearTimeout(t); fin(guardar(req, res)); })
      .catch(() => { clearTimeout(t); desdeCache().then(r => fin(r || Response.error())); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(redPrimero(req));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => guardar(req, res))));
});
