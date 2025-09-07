const CACHE_NAME = 'gerador-senhas-v1.0.0';
const STATIC_CACHE_NAME = 'gerador-senhas-static-v1.0.0';

// Arquivos essenciais para cache
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './pass.json',
  // CDN resources que serão cacheados quando acessados
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js'
];

// Recursos opcionais (ícones que podem não existir)
const OPTIONAL_ASSETS = [
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Evento de instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    Promise.all([
      // Cache dos recursos estáticos essenciais
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Cacheando recursos estáticos...');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
          cache: 'reload'
        })));
      }),
      
      // Cache dos recursos opcionais (não falha se algum não existir)
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Cacheando recursos opcionais...');
        return Promise.allSettled(
          OPTIONAL_ASSETS.map(url => 
            cache.add(new Request(url, { cache: 'reload' }))
              .catch(err => console.log(`Recurso opcional não encontrado: ${url}`))
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Instalação concluída');
      // Força a ativação imediata
      return self.skipWaiting();
    })
  );
});

// Evento de ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  
  event.waitUntil(
    Promise.all([
      // Limpa caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('Service Worker: Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Assume controle de todas as abas
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Ativação concluída');
    })
  );
});

// Evento de interceptação de requisições (fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Estratégia Cache First para recursos estáticos
  if (STATIC_ASSETS.some(asset => request.url.includes(asset.replace('./', '')))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Estratégia Network First para CDN resources
  if (url.hostname.includes('cdn.jsdelivr.net') || 
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Estratégia Cache First para outros recursos locais
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Para outros recursos, tenta network primeiro
  event.respondWith(networkFirst(request));
});

// Estratégia Cache First
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Servindo do cache:', request.url);
      return cachedResponse;
    }
    
    console.log('Service Worker: Buscando da rede:', request.url);
    const networkResponse = await fetch(request);
    
    // Cacheia a resposta se for bem-sucedida
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Erro ao buscar recurso:', request.url, error);
    
    // Retorna página offline personalizada para navegação
    if (request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - Gerador de Senhas</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #121212; 
              color: #fff; 
            }
            .offline-message { 
              max-width: 400px; 
              margin: 0 auto; 
            }
            .icon { 
              font-size: 4rem; 
              margin-bottom: 1rem; 
            }
            button { 
              background: #6b57ff; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 5px; 
              cursor: pointer; 
              margin-top: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">🔒</div>
            <h1>Você está offline</h1>
            <p>O Gerador de Senhas não está disponível no momento. Verifique sua conexão com a internet.</p>
            <button onclick="window.location.reload()">Tentar Novamente</button>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Estratégia Network First
async function networkFirst(request) {
  try {
    console.log('Service Worker: Tentando rede primeiro:', request.url);
    const networkResponse = await fetch(request);
    
    // Cacheia a resposta se for bem-sucedida
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Rede falhou, tentando cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Evento de sincronização em background (para futuras funcionalidades)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Evento de sincronização:', event.tag);
});

// Evento de push notification (para futuras funcionalidades)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recebido:', event);
});

// Evento de notificação clicada (para futuras funcionalidades)
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notificação clicada:', event);
  event.notification.close();
});

// Manipulação de erros
self.addEventListener('error', (event) => {
  console.error('Service Worker: Erro:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Promise rejeitada:', event.reason);
});

console.log('Service Worker: Script carregado');

