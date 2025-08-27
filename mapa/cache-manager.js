// Gerenciador de Cache Local para Mapa STTE
class CacheManager {
    constructor() {
        this.dbName = 'STTEMapDB';
        this.dbVersion = 1;
        this.storeName = 'coordinates';
        this.db = null;
    }

    // Inicializar banco de dados
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB inicializado com sucesso');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar store para coordenadas
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('Store de coordenadas criada');
                }
            };
        });
    }

    // Salvar coordenadas no cache local
    async saveCoordinates(coordinates) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const data = {
                id: 'coordinates',
                data: coordinates,
                timestamp: Date.now(),
                version: '1.0'
            };

            const request = store.put(data);

            request.onsuccess = () => {
                console.log('Coordenadas salvas no cache local');
                resolve();
            };

            request.onerror = () => {
                console.error('Erro ao salvar coordenadas:', request.error);
                reject(request.error);
            };
        });
    }

    // Carregar coordenadas do cache local
    async loadCoordinates() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('coordinates');

            request.onsuccess = () => {
                if (request.result) {
                    console.log('Coordenadas carregadas do cache local');
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

    // Verificar se há dados em cache
    async hasCachedData() {
        try {
            const data = await this.loadCoordinates();
            return data !== null;
        } catch (error) {
            return false;
        }
    }

    // Limpar cache
    async clearCache() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('Cache local limpo');
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