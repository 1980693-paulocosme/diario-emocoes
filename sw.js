/**
 * Cache dos ficheiros da aplicação, para abrir sem internet
 * depois da primeira visita.
 *
 * Os registos pessoais não entram aqui: continuam só no LocalStorage.
 * Os caminhos são relativos ao próprio Service Worker, para o cache
 * funcionar quando o site está num subdiretório do GitHub Pages.
 */

const CACHE = 'diario-emocoes-v2';

const RECURSOS = [
  './index.html',
  './style.css',
  './app.js',
  './storage.js',
  './pdf.js',
  './vendor/jspdf.umd.min.js',
  './vendor/diario-sans-regular.js',
  './vendor/diario-sans-bold.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(RECURSOS.map((caminho) => new URL(caminho, self.location).href)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') {
    return;
  }

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin || !eRecursoDaApp(url)) {
    return;
  }

  evento.respondWith(redeDepoisCache(pedido));
});

/**
 * Rede primeiro, cache se a rede falhar.
 * Assim uma versão nova chega quando há internet,
 * e a última versão guardada abre quando não há.
 */
async function redeDepoisCache(pedido) {
  const cache = await caches.open(CACHE);

  try {
    const resposta = await fetch(pedido);
    if (resposta.ok && resposta.status === 200 && resposta.type === 'basic') {
      await cache.put(pedido, resposta.clone());
    }
    return resposta;
  } catch (erro) {
    const guardado = await caches.match(pedido, { ignoreSearch: true });
    if (guardado) {
      return guardado;
    }

    if (pedido.mode === 'navigate') {
      return (await caches.match(new URL('./index.html', self.location).href))
        || caches.match(new URL('./', self.location).href);
    }

    throw erro;
  }
}

function eRecursoDaApp(url) {
  if (url.pathname.endsWith('/')) {
    return true;
  }

  return /\.(?:html|css|js|webmanifest|png)$/.test(url.pathname);
}
