const CACHE_NAME = 'stte-acionamento-v2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './scripts.js',
  './carregar-opcoes.js',
  './fca.js',
  './protocolo.js',
  './coordenadas.js',
  './manifest.json'
];

// Recursos externos (opcionais - não falham se não carregarem)
const externalResources = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css',
  'https://gms.stte.com.br/gms_rno/images/logo.jpg',
  'https://stte.com.br/wp-content/uploads/2025/03/Stte-Favicon.webp'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        
        // Primeiro, adicionar recursos locais (essenciais)
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('Recursos locais adicionados ao cache');
            
            // Depois, tentar adicionar recursos externos (opcionais)
            const externalPromises = externalResources.map(url => 
              cache.add(url).catch(error => {
                console.warn(`Falha ao cachear recurso externo ${url}:`, error);
                return null; // Não falha se um recurso externo não carregar
              })
            );
            
            return Promise.allSettled(externalPromises);
          })
          .then(results => {
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            console.log(`Cache externo: ${succeeded} sucessos, ${failed} falhas`);
          });
      })
      .catch(error => {
        console.error('Erro crítico ao instalar cache:', error);
        // Mesmo com erro, o Service Worker continua funcionando
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Forçar controle imediato sobre todas as páginas
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requisições para APIs externas
  if (event.request.url.includes('api.') || event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna o cache se encontrado
        if (response) {
          console.log('Cache hit:', event.request.url);
          return response;
        }
        
        console.log('Cache miss:', event.request.url);
        
        // Se não estiver em cache, busca na rede
        return fetch(event.request)
          .then(response => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Só cachear recursos estáticos
            const shouldCache = event.request.destination === 'document' ||
                               event.request.destination === 'script' ||
                               event.request.destination === 'style' ||
                               event.request.destination === 'image';
            
            if (shouldCache) {
              // Clona a resposta para cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  console.log('Recurso adicionado ao cache:', event.request.url);
                })
                .catch(error => {
                  console.warn('Erro ao adicionar ao cache:', error);
                });
            }
            
            return response;
          })
          .catch(error => {
            console.warn('Erro na requisição:', event.request.url, error);
            
            // Fallback para páginas HTML
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // Para outros recursos, retornar erro
            return new Response('Recurso não disponível offline', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});

// Mensagens do Service Worker
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 