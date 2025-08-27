// Gerenciador de Cache Local para Mapa STTE
class CacheManager {
    constructor() {
        this.dbName = 'STTEMapDB';
        this.dbVersion = 2; // Versão atualizada para novas otimizações
        this.storeName = 'coordinates';
        this.db = null;
        this.cache = new Map(); // Cache em memória para acesso ultra-rápido
        this.isInitialized = false;
    }

    // Inicializar banco de dados
    async init() {
        if (this.isInitialized) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('IndexedDB inicializado com sucesso');
                
                // Pré-carregar dados em memória para acesso ultra-rápido
                this.preloadToMemory().then(() => {
                    console.log('Cache em memória carregado');
                }).catch(err => {
                    console.warn('Erro ao pré-carregar cache:', err);
                });
                
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar store para coordenadas
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('dataSize', 'dataSize', { unique: false }); // Novo índice para otimização
                    console.log('Store de coordenadas criada com índices otimizados');
                }
            };
        });
    }

    // Pré-carregar dados em memória para acesso ultra-rápido
    async preloadToMemory() {
        try {
            const data = await this.loadCoordinatesFromDB();
            if (data) {
                this.cache.set('coordinates', data);
                console.log('Dados pré-carregados em memória');
            }
        } catch (error) {
            console.warn('Erro ao pré-carregar em memória:', error);
        }
    }

    // Salvar coordenadas no cache local
    async saveCoordinates(coordinates) {
        if (!this.db) {
            await this.init();
        }

        // Salvar também em memória para acesso ultra-rápido
        this.cache.set('coordinates', coordinates);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const data = {
                id: 'coordinates',
                data: coordinates,
                timestamp: Date.now(),
                version: '1.0',
                dataSize: JSON.stringify(coordinates).length // Para otimizações futuras
            };

            const request = store.put(data);

            request.onsuccess = () => {
                console.log('Coordenadas salvas no cache local e memória');
                resolve();
            };

            request.onerror = () => {
                console.error('Erro ao salvar coordenadas:', request.error);
                reject(request.error);
            };
        });
    }

    // Carregar coordenadas do cache local (otimizado)
    async loadCoordinates() {
        // Primeiro, tentar carregar da memória (ultra-rápido)
        if (this.cache.has('coordinates')) {
            console.log('Coordenadas carregadas do cache em memória (ultra-rápido)');
            return this.cache.get('coordinates');
        }

        // Se não estiver em memória, carregar do IndexedDB
        if (!this.db) {
            await this.init();
        }

        return this.loadCoordinatesFromDB();
    }

    // Carregar coordenadas do IndexedDB
    async loadCoordinatesFromDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('coordinates');

            request.onsuccess = () => {
                if (request.result) {
                    console.log('Coordenadas carregadas do IndexedDB');
                    // Salvar em memória para próximos acessos
                    this.cache.set('coordinates', request.result.data);
                    resolve(request.result.data);
                } else {
                    console.log('Nenhuma coordenada encontrada no cache');
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Erro ao carregar coordenadas:', request.error);
                reject(request.error);
            };
        });
    }

    // Verificar se há dados em cache (otimizado)
    async hasCachedData() {
        // Primeiro verificar em memória (ultra-rápido)
        if (this.cache.has('coordinates')) {
            return true;
        }

        try {
            const data = await this.loadCoordinates();
            return data !== null;
        } catch (error) {
            return false;
        }
    }

    // Limpar cache em memória
    clearMemoryCache() {
        this.cache.clear();
        console.log('Cache em memória limpo');
    }

    // Obter estatísticas de performance
    getPerformanceStats() {
        return {
            memoryCacheSize: this.cache.size,
            hasMemoryData: this.cache.has('coordinates'),
            isInitialized: this.isInitialized
        };
    }

    // Limpar cache
    async clearCache() {
        // Limpar cache em memória primeiro
        this.clearMemoryCache();

        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('Cache local e memória limpos');
                resolve();
            };

            request.onerror = () => {
                console.error('Erro ao limpar cache:', request.error);
                reject(request.error);
            };
        });
    }

    // Obter informações do cache
    async getCacheInfo() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('coordinates');

            request.onsuccess = () => {
                if (request.result) {
                    const info = {
                        hasData: true,
                        timestamp: request.result.timestamp,
                        date: new Date(request.result.timestamp).toLocaleString('pt-BR'),
                        version: request.result.version,
                        sitesCount: Object.keys(request.result.data).length
                    };
                    resolve(info);
                } else {
                    resolve({ hasData: false });
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Verificar se o cache está desatualizado (mais de 30 dias)
    async isCacheOutdated() {
        try {
            const info = await this.getCacheInfo();
            if (!info.hasData) return true;

            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            return info.timestamp < thirtyDaysAgo;
        } catch (error) {
            return true;
        }
    }
}

// Exportar para uso global
window.CacheManager = CacheManager; 