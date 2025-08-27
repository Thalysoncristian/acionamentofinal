// Service Worker para cache de dados do mapa STTE
const CACHE_NAME = 'stte-map-v1';
const DATA_CACHE_NAME = 'stte-data-v1';

// Recursos para cachear
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/styles.css',
    '/map.js',
    '/coordenadas.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cacheando recursos estáticos...');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                console.log('Service Worker instalado com sucesso!');
                return self.skipWaiting();
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
                    if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                        console.log('Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker ativado!');
            return self.clients.claim();
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Cachear dados de coordenadas
    if (url.pathname.includes('coordenadas.js')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME)
                .then(cache => cache.match(event.request))
                .then(response => {
                    if (response) {
                        console.log('Dados de coordenadas carregados do cache');
                        return response;
                    }
                    return fetch(event.request).then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
        );
        return;
    }
    
    // Cachear recursos estáticos
    if (STATIC_RESOURCES.some(resource => event.request.url.includes(resource))) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then(response => {
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone));
                        }
                        return response;
                    });
                })
        );
        return;
    }
    
    // Para outras requisições, usar estratégia network-first
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Mensagem para sincronizar dados
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_COORDINATES') {
        console.log('Recebida solicitação para cachear coordenadas');
        event.waitUntil(
            caches.open(DATA_CACHE_NAME)
                .then(cache => {
                    // Cachear dados de coordenadas
                    const coordinatesData = event.data.coordinates;
                    const blob = new Blob([JSON.stringify(coordinatesData)], {
                        type: 'application/json'
                    });
                    const response = new Response(blob);
                    return cache.put('/coordenadas-data', response);
                })
        );
    }
}); 