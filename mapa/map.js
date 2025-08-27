// Mapa Interativo STTE - JavaScript Principal
class InteractiveMap {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.selectedSites = new Set();
        this.allSites = [];
        this.filteredSites = [];
        this.isInitialized = false;
        this.autoNavigate = true; // Controle de navegação automática
        this.routes = new Map(); // Armazenar rotas desenhadas
        
        this.init();
    }

    async init() {
        try {
            await this.loadSites();
            this.initializeMap();
            this.setupEventListeners();
            this.renderSitesList();
            this.updateCounters();
            this.hideLoading();
        } catch (error) {
            console.error('Erro ao inicializar mapa:', error);
            this.showError('Erro ao carregar o mapa. Tente recarregar a página.');
        }
    }

    async loadSites() {
        // Inicializar gerenciador de cache com tratamento de erro
        try {
            this.cacheManager = new CacheManager();
            await this.cacheManager.init();
            console.log('CacheManager inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar CacheManager:', error);
            this.cacheManager = null;
        }
        
        try {
            let useCache = false;
            
            // Tentar carregar do cache se disponível
            if (this.cacheManager) {
                const cachedData = await this.cacheManager.loadCoordinates();
                
                if (cachedData && Object.keys(cachedData).length > 0) {
                    console.log('Carregando dados do cache local...');
                    this.allSites = Object.entries(cachedData).map(([siteName, coords]) => ({
                        name: siteName,
                        lat: coords.lat,
                        lng: coords.lng,
                        coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                    }));
                    useCache = true;
                    
                    // Salvar dados atuais no cache para atualizar
                    try {
                        await this.cacheManager.saveCoordinates(coordenadas);
                        console.log('Cache atualizado com dados mais recentes');
                    } catch (cacheError) {
                        console.warn('Erro ao atualizar cache:', cacheError);
                    }
                }
            }
            
            if (!useCache) {
                console.log('Carregando dados do arquivo...');
                this.allSites = Object.entries(coordenadas).map(([siteName, coords]) => ({
                    name: siteName,
                    lat: coords.lat,
                    lng: coords.lng,
                    coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                }));
                
                // Salvar no cache para uso futuro
                if (this.cacheManager) {
                    try {
                        await this.cacheManager.saveCoordinates(coordenadas);
                        console.log('Dados salvos no cache local');
                    } catch (cacheError) {
                        console.warn('Erro ao salvar no cache:', cacheError);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Fallback para carregamento direto
            this.allSites = Object.entries(coordenadas).map(([siteName, coords]) => ({
                name: siteName,
                lat: coords.lat,
                lng: coords.lng,
                coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            }));
        }

        this.filteredSites = [...this.allSites];
        
        // Implementar carregamento lazy de marcadores
        this.visibleMarkers = new Set();
        this.markerCluster = null;
        
        console.log(`Carregados ${this.allSites.length} sites`);
    }

    showCacheStatusIndicator() {
        // Verificar se o mapa está inicializado
        if (!this.map || !this.isInitialized) {
            console.log('Mapa ainda não inicializado, aguardando...');
            setTimeout(() => this.showCacheStatusIndicator(), 1000);
            return;
        }

        // Criar indicador visual permanente do status do cache
        const indicator = L.control({ position: 'bottomleft' });
        
        indicator.onAdd = () => {
            const div = L.DomUtil.create('div', 'cache-status-indicator');
            div.innerHTML = `
                <div style="background: rgba(40, 167, 69, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    <i class="fas fa-database" style="color: #fff;"></i>
                    <span>Cache Ativo</span>
                    <button onclick="map.testCachePerformance()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-left: 8px;">
                        Testar
                    </button>
                </div>
            `;
            return div;
        };
        
        this.cacheIndicator = indicator;
        indicator.addTo(this.map);
    }

    initializeMap() {
        // Calcular centro do mapa baseado nas coordenadas
        const bounds = this.calculateBounds();
        const center = this.calculateCenter();

        // Inicializar mapa Leaflet
        this.map = L.map('map', {
            center: center,
            zoom: 8,
            minZoom: 4,
            maxZoom: 19
        });

        // Criar camadas de mapa
        this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19,
            subdomains: 'abcd'
        });

        // Camada com nomes de ruas, estradas e lugares
        this.labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19,
            opacity: 0.9
        });

        // Camada adicional com nomes de ruas e estradas
        this.streetsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19,
            opacity: 0.8
        });

        // Camada com nomes de cidades e lugares importantes
        this.citiesLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Cities/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19,
            opacity: 0.9
        });

        // Adicionar camadas ao mapa (satélite + nomes de bairros + nomes de ruas + nomes de cidades)
        // Configuração otimizada para visualização de satélite com nomes de ruas e bairros
        this.satelliteLayer.addTo(this.map);
        this.labelsLayer.addTo(this.map);
        this.streetsLayer.addTo(this.map);
        this.citiesLayer.addTo(this.map);

        // Criar controle de camadas
        const baseMaps = {
            "Satélite": this.satelliteLayer,
            "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            })
        };

        const overlayMaps = {
            "Nomes de Bairros": this.labelsLayer,
            "Nomes de Ruas": this.streetsLayer,
            "Nomes de Cidades": this.citiesLayer
        };

        L.control.layers(baseMaps, overlayMaps, {
            collapsed: false,
            position: 'topright'
        }).addTo(this.map);

        // Adicionar controle de Street View
        this.addStreetViewControl();

        // Ajustar view para mostrar todos os sites
        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }

        this.isInitialized = true;
        
        // Implementar carregamento lazy de marcadores
        this.setupLazyLoading();
        
        // Adicionar indicadores após o mapa estar completamente inicializado
        this.addCacheIndicators();
    }

    addCacheIndicators() {
        // Mostrar informações do cache
        if (this.cacheManager) {
            this.showCacheInfo();
            this.showCacheStatusIndicator();
        }
    }

    async showCacheInfo() {
        try {
            // Verificar se o mapa está inicializado
            if (!this.map || !this.isInitialized) {
                console.log('Mapa ainda não inicializado, aguardando...');
                setTimeout(() => this.showCacheInfo(), 1000);
                return;
            }

            const cacheInfo = await this.cacheManager.getCacheInfo();
            
            if (cacheInfo.hasData) {
                const infoMessage = L.control({ position: 'bottomright' });
                
                infoMessage.onAdd = () => {
                    const div = L.DomUtil.create('div', 'cache-info');
                    div.innerHTML = `
                        <div style="background: rgba(0, 123, 255, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; max-width: 250px;">
                            <i class="fas fa-database"></i> Cache: ${cacheInfo.sitesCount} sites
                            <br><small>Atualizado: ${cacheInfo.date}</small>
                        </div>
                    `;
                    return div;
                };
                
                infoMessage.addTo(this.map);
                
                // Remover após 5 segundos
                setTimeout(() => {
                    if (this.map) {
                        this.map.removeControl(infoMessage);
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Erro ao mostrar informações do cache:', error);
        }
    }

    async showCacheManagement() {
        try {
            // Verificar se o cache manager está disponível
            if (!this.cacheManager) {
                this.showCacheError('Cache não está disponível. Tente recarregar a página.');
                return;
            }

            const cacheInfo = await this.cacheManager.getCacheInfo();
            const isOutdated = await this.cacheManager.isCacheOutdated();
            
            let message = '';
            if (cacheInfo.hasData) {
                message = `
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); max-width: 400px;">
                        <h5 style="margin: 0 0 15px 0; color: #007bff;">
                            <i class="fas fa-database"></i> Informações do Cache
                        </h5>
                        <div style="margin-bottom: 15px;">
                            <p><strong>Sites em cache:</strong> ${cacheInfo.sitesCount.toLocaleString('pt-BR')}</p>
                            <p><strong>Última atualização:</strong> ${cacheInfo.date}</p>
                            <p><strong>Versão:</strong> ${cacheInfo.version}</p>
                            ${isOutdated ? '<p style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Cache pode estar desatualizado</p>' : ''}
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button onclick="map.refreshCache()" class="btn btn-primary btn-sm">
                                <i class="fas fa-sync"></i> Atualizar Cache
                            </button>
                            <button onclick="map.clearCache()" class="btn btn-danger btn-sm">
                                <i class="fas fa-trash"></i> Limpar Cache
                            </button>
                            <button onclick="map.closeCacheModal()" class="btn btn-secondary btn-sm">
                                <i class="fas fa-times"></i> Fechar
                            </button>
                        </div>
                    </div>
                `;
            } else {
                message = `
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); max-width: 400px;">
                        <h5 style="margin: 0 0 15px 0; color: #007bff;">
                            <i class="fas fa-database"></i> Cache Local
                        </h5>
                        <p>Nenhum dado em cache encontrado.</p>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="map.refreshCache()" class="btn btn-primary btn-sm">
                                <i class="fas fa-download"></i> Criar Cache
                            </button>
                            <button onclick="map.closeCacheModal()" class="btn btn-secondary btn-sm">
                                <i class="fas fa-times"></i> Fechar
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Criar modal diretamente no DOM
            const modalDiv = document.createElement('div');
            modalDiv.className = 'cache-modal';
            modalDiv.innerHTML = message;
            modalDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: rgba(0, 0, 0, 0.5);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Adicionar overlay de fundo
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            `;
            overlay.onclick = () => this.closeCacheModal();
            
            modalDiv.appendChild(overlay);
            
            // Posicionar o conteúdo do modal
            const contentDiv = modalDiv.querySelector('div');
            contentDiv.style.position = 'relative';
            contentDiv.style.zIndex = '10001';
            
            document.body.appendChild(modalDiv);
            this.cacheModal = modalDiv;
            
        } catch (error) {
            console.error('Erro ao mostrar gerenciamento de cache:', error);
            this.showCacheError('Erro ao acessar informações do cache: ' + error.message);
        }
    }

    showCacheError(message) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'cache-error-modal';
        modalDiv.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); max-width: 400px; border-left: 4px solid #dc3545;">
                <h5 style="margin: 0 0 15px 0; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> Erro no Cache
                </h5>
                <p style="margin-bottom: 15px; color: #666;">${message}</p>
                <div style="display: flex; gap: 10px;">
                    <button onclick="map.closeCacheModal()" class="btn btn-secondary btn-sm">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                    <button onclick="map.retryCacheInit()" class="btn btn-primary btn-sm">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
        modalDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: rgba(0, 0, 0, 0.5);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Adicionar overlay de fundo
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        `;
        overlay.onclick = () => this.closeCacheModal();
        
        modalDiv.appendChild(overlay);
        
        // Posicionar o conteúdo do modal
        const contentDiv = modalDiv.querySelector('div');
        contentDiv.style.position = 'relative';
        contentDiv.style.zIndex = '10001';
        
        document.body.appendChild(modalDiv);
        this.cacheModal = modalDiv;
    }

    async retryCacheInit() {
        try {
            this.cacheManager = new CacheManager();
            await this.cacheManager.init();
            console.log('CacheManager reinicializado com sucesso');
            this.closeCacheModal();
            this.showCacheManagement();
        } catch (error) {
            console.error('Erro ao reinicializar cache:', error);
            this.showCacheError('Falha ao reinicializar cache: ' + error.message);
        }
    }

    async refreshCache() {
        try {
            await this.cacheManager.saveCoordinates(coordenadas);
            alert('Cache atualizado com sucesso!');
            this.closeCacheModal();
            this.showCacheInfo();
        } catch (error) {
            console.error('Erro ao atualizar cache:', error);
            alert('Erro ao atualizar cache');
        }
    }

    async clearCache() {
        if (confirm('Tem certeza que deseja limpar o cache local?')) {
            try {
                await this.cacheManager.clearCache();
                alert('Cache limpo com sucesso!');
                this.closeCacheModal();
            } catch (error) {
                console.error('Erro ao limpar cache:', error);
                alert('Erro ao limpar cache');
            }
        }
    }

    closeCacheModal() {
        if (this.cacheModal) {
            document.body.removeChild(this.cacheModal);
            this.cacheModal = null;
        }
    }

    // Função para limpar todas as seleções
    clearAllSelections() {
        if (confirm('Tem certeza que deseja limpar todas as seleções?')) {
            // Limpar todas as seleções
            this.selectedSites.clear();
            
            // Remover todos os marcadores do mapa
            this.markers.forEach((marker, siteName) => {
                this.map.removeLayer(marker);
            });
            this.markers.clear();
            
            // Atualizar interface
            this.renderSitesList();
            this.updateCounters();
            this.updateDistancePanel();
            
            console.log('✅ Todas as seleções foram limpas');
        }
    }

    // Função para debug do cache (disponível no console)
    async debugCache() {
        console.log('=== DEBUG DO CACHE ===');
        console.log('CacheManager disponível:', !!this.cacheManager);
        
        if (this.cacheManager) {
            try {
                const info = await this.cacheManager.getCacheInfo();
                console.log('Informações do cache:', info);
                
                const hasData = await this.cacheManager.hasCachedData();
                console.log('Tem dados em cache:', hasData);
                
                const isOutdated = await this.cacheManager.isCacheOutdated();
                console.log('Cache desatualizado:', isOutdated);
                
                if (hasData) {
                    const data = await this.cacheManager.loadCoordinates();
                    console.log('Dados em cache:', Object.keys(data).length, 'sites');
                }
            } catch (error) {
                console.error('Erro no debug do cache:', error);
            }
        }
        console.log('======================');
    }

    // Função para testar performance do cache
    async testCachePerformance() {
        console.log('🧪 TESTANDO PERFORMANCE DO CACHE...');
        
        // Verificar se está rodando localmente
        const isLocal = window.location.protocol === 'file:';
        if (isLocal) {
            console.log('⚠️ Detectado modo local (file://) - performance pode ser afetada');
        }
        
        if (!this.cacheManager) {
            alert('Cache não está disponível');
            return;
        }

        try {
            // Teste 1: Verificar se há dados
            const startTime = performance.now();
            const hasData = await this.cacheManager.hasCachedData();
            const endTime = performance.now();
            
            console.log(`✅ Verificação de dados: ${(endTime - startTime).toFixed(2)}ms`);
            
            if (!hasData) {
                alert('❌ Nenhum dado encontrado no cache!');
                return;
            }

            // Teste 2: Simular carregamento do cache (processamento dos dados)
            const loadStart = performance.now();
            const cachedData = await this.cacheManager.loadCoordinates();
            // Simular o processamento que acontece no loadSites()
            const processedCachedData = Object.entries(cachedData).map(([siteName, coords]) => ({
                name: siteName,
                lat: coords.lat,
                lng: coords.lng,
                coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            }));
            const loadEnd = performance.now();
            
            console.log(`✅ Carregamento do cache: ${(loadEnd - loadStart).toFixed(2)}ms`);
            console.log(`📊 Sites carregados: ${processedCachedData.length}`);

            // Teste 3: Simular carregamento direto (mesmo processamento)
            const directStart = performance.now();
            const directData = Object.entries(coordenadas).map(([siteName, coords]) => ({
                name: siteName,
                lat: coords.lat,
                lng: coords.lng,
                coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            }));
            const directEnd = performance.now();
            
            console.log(`📈 Carregamento direto: ${(directEnd - directStart).toFixed(2)}ms`);

            // Calcular melhoria
            const cacheTime = loadEnd - loadStart;
            const directTime = directEnd - directStart;
            
            // Se o cache for mais lento, mostrar isso claramente
            if (cacheTime > directTime) {
                const slowdown = ((cacheTime - directTime) / directTime * 100).toFixed(1);
                console.log(`⚠️ Cache está ${slowdown}% mais lento que carregamento direto`);
                
                // Mostrar resultado honesto
                const resultMessage = `
🧪 TESTE DE PERFORMANCE CONCLUÍDO!

📊 RESULTADOS:
• Cache: ${cacheTime.toFixed(2)}ms
• Direto: ${directTime.toFixed(2)}ms
• Status: Cache ${slowdown}% mais lento

${isLocal ? '⚠️ MODO LOCAL DETECTADO: Performance pode ser afetada pelo protocolo file://' : '⚠️ O cache está sendo mais lento que o carregamento direto.'}
                `;

                console.log(resultMessage);
                
                // Atualizar indicador visual
                this.updateCacheIndicator(false, `${slowdown}% mais lento`);
                
                // Mostrar modal com resultados honestos
                this.showPerformanceResults(cacheTime, directTime, -parseFloat(slowdown), isLocal);
            } else {
                const improvement = ((directTime - cacheTime) / directTime * 100).toFixed(1);
                
                const resultMessage = `
🧪 TESTE DE PERFORMANCE CONCLUÍDO!

📊 RESULTADOS:
• Cache: ${cacheTime.toFixed(2)}ms
• Direto: ${directTime.toFixed(2)}ms
• Melhoria: ${improvement}% mais rápido

✅ CACHE FUNCIONANDO PERFEITAMENTE!
                `;

                console.log(resultMessage);
                
                // Atualizar indicador visual
                this.updateCacheIndicator(true, `${improvement}% mais rápido`);
                
                // Mostrar modal com resultados
                this.showPerformanceResults(cacheTime, directTime, improvement, isLocal);
            }

        } catch (error) {
            console.error('❌ Erro no teste de performance:', error);
            alert('❌ Erro ao testar cache: ' + error.message);
            this.updateCacheIndicator(false, 'Erro no teste');
        }
    }

    updateCacheIndicator(success, message) {
        if (this.cacheIndicator) {
            const indicator = this.cacheIndicator.getContainer();
            if (success) {
                indicator.innerHTML = `
                    <div style="background: rgba(40, 167, 69, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        <i class="fas fa-check-circle" style="color: #fff;"></i>
                        <span>${message}</span>
                        <button onclick="map.testCachePerformance()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-left: 8px;">
                            Testar
                        </button>
                    </div>
                `;
            } else {
                indicator.innerHTML = `
                    <div style="background: rgba(220, 53, 69, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        <i class="fas fa-exclamation-triangle" style="color: #fff;"></i>
                        <span>${message}</span>
                        <button onclick="map.testCachePerformance()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-left: 8px;">
                            Testar
                        </button>
                    </div>
                `;
            }
        }
    }

    showPerformanceResults(cacheTime, directTime, improvement, isLocal = false) {
        const isFaster = improvement > 0;
        const icon = isFaster ? 'fas fa-trophy' : 'fas fa-info-circle';
        const iconColor = isFaster ? '#ffc107' : '#17a2b8';
        const titleColor = isFaster ? '#28a745' : '#17a2b8';
        const title = isFaster ? 'Teste Concluído!' : 'Resultado do Teste';
        const subtitle = isFaster ? 'Cache funcionando perfeitamente' : 'Análise de performance';
        const improvementText = isFaster ? `${improvement}% mais rápido` : `${Math.abs(improvement)}% mais lento`;
        const improvementColor = isFaster ? '#007bff' : '#dc3545';
        const buttonColor = isFaster ? 'btn-success' : 'btn-info';
        
        const modalDiv = document.createElement('div');
        modalDiv.className = 'performance-modal';
        modalDiv.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 450px; text-align: center;">
                <div style="margin-bottom: 20px;">
                    <i class="${icon}" style="font-size: 48px; color: ${iconColor}; margin-bottom: 15px;"></i>
                    <h4 style="margin: 0 0 10px 0; color: ${titleColor};">${title}</h4>
                    <p style="color: #666; margin: 0;">${subtitle}</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Cache:</strong></span>
                        <span style="color: ${isFaster ? '#28a745' : '#dc3545'};">${cacheTime.toFixed(2)}ms</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span><strong>Sem Cache:</strong></span>
                        <span style="color: ${isFaster ? '#dc3545' : '#28a745'};">${directTime.toFixed(2)}ms</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #dee2e6; padding-top: 10px;">
                        <span><strong>Resultado:</strong></span>
                        <span style="color: ${improvementColor}; font-weight: bold;">${improvementText}</span>
                    </div>
                </div>
                
                ${!isFaster ? `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: left;">
                    <small style="color: #856404;">
                        <strong>Nota:</strong> Para dados pequenos como este (4.334 sites), 
                        o overhead do IndexedDB pode ser maior que o benefício. 
                        O cache é mais útil para dados maiores ou conexões lentas.
                    </small>
                </div>
                ` : ''}
                
                ${isLocal ? `
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: left;">
                    <small style="color: #0c5460;">
                        <strong>Modo Local Detectado:</strong> Você está executando o arquivo diretamente (file://). 
                        Para melhor performance, considere usar um servidor local como Live Server (VS Code) 
                        ou Python SimpleHTTPServer.
                    </small>
                </div>
                ` : ''}
                
                <button onclick="this.parentElement.parentElement.remove()" class="btn ${buttonColor}" style="width: 100%;">
                    <i class="fas fa-check"></i> Entendi!
                </button>
            </div>
        `;
        modalDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: rgba(0, 0, 0, 0.5);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        `;
        overlay.onclick = () => modalDiv.remove();
        
        modalDiv.appendChild(overlay);
        
        const contentDiv = modalDiv.querySelector('div');
        contentDiv.style.position = 'relative';
        contentDiv.style.zIndex = '10001';
        
        document.body.appendChild(modalDiv);
    }

    setupLazyLoading() {
        // Mapa começa vazio - sem carregar marcadores automaticamente
        // Os marcadores só aparecem quando o usuário seleciona sites manualmente
        console.log('Mapa inicializado - aguardando seleção manual de sites');
    }

    updateVisibleMarkers() {
        const bounds = this.map.getBounds();
        const zoom = this.map.getZoom();
        
        // Determinar quais sites devem estar visíveis
        const sitesInView = this.allSites.filter(site => {
            return bounds.contains([site.lat, site.lng]);
        });

        // Se zoom < 10, usar clustering para melhor performance
        if (zoom < 10) {
            this.useClustering(sitesInView);
        } else {
            this.useIndividualMarkers(sitesInView);
        }
    }

    useClustering(sites) {
        // Limpar marcadores individuais
        this.clearIndividualMarkers();
        
        // Criar cluster se não existir
        if (!this.markerCluster) {
            this.markerCluster = L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 10
            });
            this.map.addLayer(this.markerCluster);
        }

        // Adicionar sites ao cluster
        sites.forEach(site => {
            if (!this.visibleMarkers.has(site.name)) {
                const marker = this.createMarker(site);
                this.markerCluster.addLayer(marker);
                this.visibleMarkers.add(site.name);
            }
        });
    }

    useIndividualMarkers(sites) {
        // Remover cluster se existir
        if (this.markerCluster) {
            this.map.removeLayer(this.markerCluster);
            this.markerCluster = null;
        }

        // Adicionar marcadores individuais apenas para sites visíveis
        sites.forEach(site => {
            if (!this.visibleMarkers.has(site.name)) {
                this.addMarkerToMap(site.name);
                this.visibleMarkers.add(site.name);
            }
        });

        // Remover marcadores que não estão mais visíveis
        this.visibleMarkers.forEach(siteName => {
            if (!sites.find(s => s.name === siteName)) {
                this.removeMarkerFromMap(siteName);
                this.visibleMarkers.delete(siteName);
            }
        });
    }

    clearIndividualMarkers() {
        this.visibleMarkers.forEach(siteName => {
            this.removeMarkerFromMap(siteName);
        });
        this.visibleMarkers.clear();
    }

    createMarker(site) {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-container">
                    <div class="tower-icon">📡</div>
                    <div class="site-name-large">${site.name}</div>
                </div>
            `,
            iconSize: [150, 50],
            iconAnchor: [75, 25]
        });

        const marker = L.marker([site.lat, site.lng], { icon })
            .bindPopup(this.createPopupContent(site));

        marker.on('click', () => {
            this.syncMarkerWithList(site.name);
        });

        return marker;
    }

    addStreetViewControl() {
        // Criar botão de Street View
        const streetViewButton = L.Control.extend({
            options: {
                position: 'topright'
            },

            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'street-view-btn', container);
                button.innerHTML = '<i class="fas fa-street-view"></i>';
                button.title = 'Street View';
                button.style.cssText = `
                    width: 30px;
                    height: 30px;
                    line-height: 30px;
                    text-align: center;
                    background: white;
                    border: 2px solid rgba(0,0,0,0.2);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    color: #333;
                    text-decoration: none;
                    display: block;
                    margin-bottom: 5px;
                `;

                button.onclick = function() {
                    const center = map.getCenter();
                    const lat = center.lat;
                    const lng = center.lng;
                    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
                    window.open(streetViewUrl, '_blank');
                };

                return container;
            }
        });

        new streetViewButton().addTo(this.map);
    }

    openStreetView(lat, lng) {
        const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        window.open(streetViewUrl, '_blank');
    }

    calculateBounds() {
        if (this.allSites.length === 0) return L.latLngBounds();

        const lats = this.allSites.map(site => site.lat);
        const lngs = this.allSites.map(site => site.lng);

        return L.latLngBounds([
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
        ]);
    }

    calculateCenter() {
        if (this.allSites.length === 0) return [0, 0];

        const lats = this.allSites.map(site => site.lat);
        const lngs = this.allSites.map(site => site.lng);

        return [
            (Math.min(...lats) + Math.max(...lats)) / 2,
            (Math.min(...lngs) + Math.max(...lngs)) / 2
        ];
    }

    setupEventListeners() {
        // Controles do header
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllSelections());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAllSites());
        document.getElementById('autoNavigateBtn').addEventListener('click', () => this.toggleAutoNavigate());
        document.getElementById('cacheInfoBtn').addEventListener('click', () => this.showCacheManagement());
        document.getElementById('toggleSidebarBtn').addEventListener('click', () => this.toggleSidebar());

        // Busca
        document.getElementById('siteSearch').addEventListener('input', (e) => this.filterSites(e.target.value));
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());

        // Controles do mapa
        document.getElementById('centerMapBtn').addEventListener('click', () => this.centerMap());
        document.getElementById('fitBoundsBtn').addEventListener('click', () => this.fitSelectedBounds());

        // Painel de distância
        document.getElementById('closeDistancePanel').addEventListener('click', () => this.hideDistancePanel());
        document.getElementById('originSelect').addEventListener('change', () => this.calculateDistances());
    }

    renderSitesList() {
        const sitesList = document.getElementById('sitesList');
        sitesList.innerHTML = '';

        // Separar sites selecionados e não selecionados
        const selectedSites = [];
        const unselectedSites = [];

        this.filteredSites.forEach(site => {
            if (this.selectedSites.has(site.name)) {
                selectedSites.push(site);
            } else {
                unselectedSites.push(site);
            }
        });

        // Adicionar seção de sites selecionados (se houver)
        if (selectedSites.length > 0) {
            // Criar cabeçalho da seção selecionados
            const selectedHeader = document.createElement('div');
            selectedHeader.className = 'sites-section-header selected-header';
            selectedHeader.innerHTML = `
                <div class="section-title">
                    <i class="fas fa-star text-warning"></i>
                    <span>Sites Selecionados (${selectedSites.length})</span>
                </div>
                <div class="section-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="map.clearAllSelections()" title="Limpar todos">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            sitesList.appendChild(selectedHeader);

            // Adicionar sites selecionados
            selectedSites.forEach(site => {
                const siteItem = this.createSiteItem(site);
                sitesList.appendChild(siteItem);
            });

            // Adicionar separador se houver sites não selecionados
            if (unselectedSites.length > 0) {
                const separator = document.createElement('div');
                separator.className = 'sites-separator';
                separator.innerHTML = '<hr>';
                sitesList.appendChild(separator);
            }
        }

        // Adicionar seção de sites não selecionados (se houver)
        if (unselectedSites.length > 0) {
            // Criar cabeçalho da seção não selecionados
            const unselectedHeader = document.createElement('div');
            unselectedHeader.className = 'sites-section-header unselected-header';
            unselectedHeader.innerHTML = `
                <div class="section-title">
                    <i class="fas fa-list text-muted"></i>
                    <span>Sites Disponíveis (${unselectedSites.length})</span>
                </div>
            `;
            sitesList.appendChild(unselectedHeader);

            // Adicionar sites não selecionados
            unselectedSites.forEach(site => {
                const siteItem = this.createSiteItem(site);
                sitesList.appendChild(siteItem);
            });
        }

        // Garantir que sites selecionados estejam visíveis
        this.ensureSelectedSitesVisible();
    }

    createSiteItem(site) {
        const item = document.createElement('div');
        item.className = 'site-item';
        item.dataset.siteName = site.name;

        // Verificar se o site está selecionado
        const isSelected = this.selectedSites.has(site.name);
        if (isSelected) {
            item.classList.add('selected');
        }

        item.innerHTML = `
            <input type="checkbox" class="site-checkbox" id="site-${site.name}" ${isSelected ? 'checked' : ''}>
            <div class="site-info">
                <div class="site-name">${site.name}</div>
                <div class="site-coordinates">${site.coordinates}</div>
            </div>
        `;
        
        // Adicionar tooltip para duplo clique
        item.title = `Clique para selecionar/desselecionar • Duplo clique para navegar diretamente`;

        // Event listeners
        const checkbox = item.querySelector('.site-checkbox');
        
        // Event listener para mudança do checkbox
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleSiteSelection(site.name, e.target.checked);
        });

        // Event listener para clique no item (alternar seleção)
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                // Alternar o estado do checkbox
                checkbox.checked = !checkbox.checked;
                this.toggleSiteSelection(site.name, checkbox.checked);
            }
        });

        // Adicionar duplo clique para navegar diretamente (independente da seleção)
        item.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.navigateToSite(site.name);
        });

        return item;
    }

    toggleSiteSelection(siteName, isSelected) {
        if (isSelected) {
            this.selectedSites.add(siteName);
            this.addMarkerToMap(siteName);
            // Navegar automaticamente para o site selecionado (se habilitado)
            if (this.autoNavigate) {
                this.navigateToSite(siteName);
            }
        } else {
            this.selectedSites.delete(siteName);
            this.removeMarkerFromMap(siteName);
        }

        this.updateSiteItemStyle(siteName, isSelected);
        this.scrollToSiteInList(siteName);
        this.updateCounters();
        this.updateDistancePanel();
    }

    addMarkerToMap(siteName) {
        if (this.markers.has(siteName)) return;

        const site = this.allSites.find(s => s.name === siteName);
        if (!site) return;

        // Criar ícone personalizado com nome grande e torre de comunicação
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-container">
                    <div class="tower-icon">📡</div>
                    <div class="site-name-large">${siteName}</div>
                </div>
            `,
            iconSize: [150, 50],
            iconAnchor: [75, 25]
        });

        const marker = L.marker([site.lat, site.lng], { icon })
            .addTo(this.map)
            .bindPopup(this.createPopupContent(site));

        // Adicionar evento de clique no marcador para sincronizar com a lista
        marker.on('click', () => {
            this.syncMarkerWithList(siteName);
        });

        this.markers.set(siteName, marker);
    }

    removeMarkerFromMap(siteName) {
        const marker = this.markers.get(siteName);
        if (marker) {
            this.map.removeLayer(marker);
            this.markers.delete(siteName);
        }
    }

    createPopupContent(site) {
        return `
            <div style="min-width: 200px;">
                <h4>${site.name}</h4>
                <p><strong>Coordenadas:</strong><br>${site.coordinates}</p>
                <p><strong>Latitude:</strong> ${site.lat.toFixed(6)}</p>
                <p><strong>Longitude:</strong> ${site.lng.toFixed(6)}</p>
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <button onclick="map.showDistancePanel('${site.name}')" class="btn btn-sm btn-primary">
                        <i class="fas fa-calculator"></i> Distâncias
                    </button>
                    <button onclick="map.openStreetView(${site.lat}, ${site.lng})" class="btn btn-sm btn-success">
                        <i class="fas fa-street-view"></i> Street View
                    </button>
                </div>
                </button>
            </div>
        `;
    }

    updateSiteItemStyle(siteName, isSelected) {
        const item = document.querySelector(`[data-site-name="${siteName}"]`);
        if (item) {
            item.classList.toggle('selected', isSelected);
            
            // Atualizar também o checkbox
            const checkbox = item.querySelector('.site-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        }
    }

    filterSites(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredSites = [...this.allSites];
        } else {
            this.filteredSites = this.allSites.filter(site => 
                site.name.toLowerCase().includes(term) ||
                site.coordinates.includes(term)
            );
        }

        this.renderSitesList();
        this.ensureSelectedSitesVisible();
        this.updateCounters();
    }

    clearSearch() {
        document.getElementById('siteSearch').value = '';
        this.filterSites('');
    }

    selectAllSites() {
        this.filteredSites.forEach(site => {
            if (!this.selectedSites.has(site.name)) {
                this.selectedSites.add(site.name);
                this.addMarkerToMap(site.name);
            }
        });

        this.updateAllCheckboxes();
        this.updateCounters();
        this.updateDistancePanel();
    }

    clearAllSelections() {
        this.selectedSites.clear();
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers.clear();

        this.updateAllCheckboxes();
        this.updateCounters();
        this.hideDistancePanel();
    }

    updateAllCheckboxes() {
        this.filteredSites.forEach(site => {
            const checkbox = document.getElementById(`site-${site.name}`);
            if (checkbox) {
                checkbox.checked = this.selectedSites.has(site.name);
                this.updateSiteItemStyle(site.name, this.selectedSites.has(site.name));
            }
        });
    }

    updateCounters() {
        const totalSites = this.allSites.length;
        const selectedCount = this.selectedSites.size;

        // Atualizar contadores na sidebar
        document.getElementById('totalSites').textContent = totalSites.toLocaleString('pt-BR');
        document.getElementById('selectedCount').textContent = selectedCount.toLocaleString('pt-BR');
        
        // Atualizar classe do contador selecionado para destaque visual
        const selectedCounter = document.querySelector('.counter-item.selected');
        if (selectedCounter) {
            if (selectedCount > 0) {
                selectedCounter.classList.add('active');
            } else {
                selectedCounter.classList.remove('active');
            }
        }
    }

    centerMap() {
        if (this.selectedSites.size > 0) {
            this.fitSelectedBounds();
        } else {
            const bounds = this.calculateBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
            }
        }
    }

    fitSelectedBounds() {
        if (this.selectedSites.size === 0) return;

        const selectedCoords = Array.from(this.selectedSites).map(siteName => {
            const site = this.allSites.find(s => s.name === siteName);
            return [site.lat, site.lng];
        });

        const bounds = L.latLngBounds(selectedCoords);
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }

    toggleAutoNavigate() {
        this.autoNavigate = !this.autoNavigate;
        const btn = document.getElementById('autoNavigateBtn');
        
        if (this.autoNavigate) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-outline-success');
            btn.innerHTML = '<i class="fas fa-crosshairs"></i> Auto Navegar';
            btn.title = 'Navegação Automática: ATIVADA';
        } else {
            btn.classList.remove('btn-outline-success');
            btn.classList.add('btn-outline-secondary');
            btn.innerHTML = '<i class="fas fa-ban"></i> Auto Navegar';
            btn.title = 'Navegação Automática: DESATIVADA';
        }
    }

    showDistancePanel(originSite = null) {
        const panel = document.getElementById('distancePanel');
        const originSelect = document.getElementById('originSelect');
        
        // Preencher select de origem
        originSelect.innerHTML = '<option value="">Selecione origem...</option>';
        this.allSites.forEach(site => {
            const option = document.createElement('option');
            option.value = site.name;
            option.textContent = site.name;
            if (originSite && site.name === originSite) {
                option.selected = true;
            }
            originSelect.appendChild(option);
        });

        // Se não foi especificada uma origem, tentar usar o primeiro site selecionado
        if (!originSite && this.selectedSites.size > 0) {
            const firstSelectedSite = Array.from(this.selectedSites)[0];
            originSelect.value = firstSelectedSite;
            
            // Calcular distâncias automaticamente se houver origem e destinos
            if (this.selectedSites.size > 1) {
                setTimeout(() => {
                    this.calculateDistances();
                }, 100);
            }
        }

        this.updateDestinationsList();
        panel.style.display = 'block';
    }

    hideDistancePanel() {
        document.getElementById('distancePanel').style.display = 'none';
        this.clearRoutes(); // Limpar rotas quando fechar o painel
    }

    updateDistancePanel() {
        if (document.getElementById('distancePanel').style.display === 'block') {
            this.updateDestinationsList();
            this.calculateDistances();
        }
    }

    updateDestinationsList() {
        const destinationsList = document.getElementById('destinationsList');
        destinationsList.innerHTML = '';

        if (this.selectedSites.size === 0) {
            destinationsList.innerHTML = '<p class="text-muted">Nenhum site selecionado</p>';
            return;
        }

        // Mostrar todos os sites selecionados como destinos potenciais
        Array.from(this.selectedSites).forEach(siteName => {
            const site = this.allSites.find(s => s.name === siteName);
            const item = document.createElement('div');
            item.className = 'destination-item';
            item.innerHTML = `
                <span>${siteName}</span>
                <span class="text-muted">${site.coordinates}</span>
            `;
            destinationsList.appendChild(item);
        });

        // Se houver sites suficientes, mostrar botão para calcular automaticamente
        if (this.selectedSites.size >= 2) {
            const autoCalcBtn = document.createElement('button');
            autoCalcBtn.className = 'btn btn-primary btn-sm mt-2';
            autoCalcBtn.innerHTML = '<i class="fas fa-calculator"></i> Calcular Distâncias';
            autoCalcBtn.onclick = () => {
                // Usar o primeiro site selecionado como origem
                const firstSite = Array.from(this.selectedSites)[0];
                document.getElementById('originSelect').value = firstSite;
                this.calculateDistances();
            };
            destinationsList.appendChild(autoCalcBtn);
        }
    }

    async calculateDistances() {
        const originSite = document.getElementById('originSelect').value;
        const resultsDiv = document.getElementById('distanceResults');

        if (!originSite) {
            return; // Silenciosamente retorna se não há origem
        }

        if (this.selectedSites.size < 2) {
            return; // Silenciosamente retorna se não há sites suficientes
        }

        // Verificar se há destinos válidos (excluindo a origem)
        const validDestinations = Array.from(this.selectedSites).filter(siteName => siteName !== originSite);
        if (validDestinations.length === 0) {
            return; // Silenciosamente retorna se não há destinos válidos
        }

        // Mostrar loading
        resultsDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Calculando rotas...</div>';

        // Limpar rotas anteriores
        this.clearRoutes();

        try {
            // Calcular rotas para todos os destinos válidos
            const routePromises = validDestinations.map(async destSiteName => {
                const origin = this.allSites.find(s => s.name === originSite);
                const dest = this.allSites.find(s => s.name === destSiteName);
                
                // Calcular distância em linha reta primeiro
                const straightDistance = this.calculateHaversineDistance(
                    origin.lat, origin.lng,
                    dest.lat, dest.lng
                );

                // Tentar obter rota real
                try {
                    const routeData = await this.getRouteData(origin, dest);
                    return {
                        destination: destSiteName,
                        straightDistance: straightDistance,
                        routeDistance: routeData.distance,
                        routeDuration: routeData.duration,
                        routeGeometry: routeData.geometry,
                        coordinates: dest.coordinates,
                        hasRoute: true
                    };
                } catch (error) {
                    console.warn(`Erro ao calcular rota para ${destSiteName}:`, error);
                    return {
                        destination: destSiteName,
                        straightDistance: straightDistance,
                        routeDistance: straightDistance,
                        routeDuration: null,
                        routeGeometry: null,
                        coordinates: dest.coordinates,
                        hasRoute: false
                    };
                }
            });

            const routeResults = await Promise.all(routePromises);
            const validResults = routeResults.filter(result => result !== null);

            // Ordenar por distância da rota
            validResults.sort((a, b) => a.routeDistance - b.routeDistance);

            // Exibir resultados
            let html = `<h6>Distâncias de ${originSite} para os destinos (ordenadas por proximidade):</h6>`;
            validResults.forEach((result, index) => {
                const routeColor = this.getRouteColor(index);
                const routeId = `route-${result.destination}`;
                
                html += `
                    <div class="distance-result-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <strong>${result.destination}</strong><br>
                                <small>${result.coordinates}</small>
                            </div>
                            <button class="btn-remove-route" onclick="map.removeRoute('${routeId}')" title="Remover rota">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="mt-2">
                            ${result.hasRoute ? 
                                `<span class="text-success"><strong>${result.routeDistance.toFixed(1)} km</strong></span> (rota)` :
                                `<span class="text-warning"><strong>${result.straightDistance.toFixed(1)} km</strong></span> (linha reta)`
                            }
                            ${result.routeDuration ? 
                                `<br><small class="text-muted">⏱️ ~${Math.round(result.routeDuration / 60)} min</small>` : 
                                ''
                            }
                        </div>
                    </div>
                `;

                // Desenhar rota no mapa se disponível
                if (result.hasRoute && result.routeGeometry) {
                    this.drawRoute(result.routeGeometry, routeColor, routeId, result.destination);
                }
            });

            resultsDiv.innerHTML = html;

        } catch (error) {
            console.error('Erro ao calcular distâncias:', error);
            resultsDiv.innerHTML = '<div class="text-danger">Erro ao calcular rotas. Tente novamente.</div>';
        }
    }

    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Função para navegar automaticamente para um site
    navigateToSite(siteName) {
        const site = this.allSites.find(s => s.name === siteName);
        if (!site) return;

        // Navegar para o site com animação suave
        this.map.setView([site.lat, site.lng], 15, {
            animate: true,
            duration: 1.5,
            easeLinearity: 0.25
        });

        // Destacar o marcador temporariamente
        const marker = this.markers.get(siteName);
        if (marker) {
            // Adicionar efeito de destaque
            const icon = marker.getIcon();
            const originalHtml = icon.options.html;
            
            // Efeito de pulso na torre
            icon.options.html = originalHtml.replace(
                '📡',
                '📡 <span style="animation: pulse 1s ease-in-out; color: #ff5722;">⚡</span>'
            );
            marker.setIcon(icon);

            // Abrir popup automaticamente
            marker.openPopup();

            // Restaurar ícone após 2 segundos
            setTimeout(() => {
                icon.options.html = originalHtml;
                marker.setIcon(icon);
            }, 2000);
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'none';
    }

    showError(message) {
        // Implementar exibição de erro
        console.error(message);
        alert(message);
    }

    // Função para obter dados de rota da API
    async getRouteData(origin, destination) {
        const API_KEY = 'pk.8d008de7d17f1ad2ebfb20d6a4e26e33'; // LocationIQ API Key
        const url = `https://us1.locationiq.com/v1/directions/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?key=${API_KEY}&overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
                distance: route.distance / 1000, // Converter para km
                duration: route.duration, // Em segundos
                geometry: route.geometry
            };
        } else {
            throw new Error('Nenhuma rota encontrada');
        }
    }

    // Função para desenhar rota no mapa
    drawRoute(geometry, color, routeId, destinationName) {
        try {
            const routeLayer = L.geoJSON(geometry, {
                style: {
                    color: color,
                    weight: 4,
                    opacity: 0.8
                }
            }).addTo(this.map);

            // Adicionar setas de direção
            const arrowLayer = L.polylineDecorator(routeLayer, {
                patterns: [{
                    offset: '10%',
                    repeat: '10%',
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 8,
                        polygon: false,
                        pathOptions: {
                            color: color,
                            fillOpacity: 1,
                            weight: 2
                        }
                    })
                }]
            }).addTo(this.map);

            // Armazenar referência da rota
            this.routes.set(routeId, {
                route: routeLayer,
                arrows: arrowLayer,
                destination: destinationName
            });

        } catch (error) {
            console.error('Erro ao desenhar rota:', error);
        }
    }

    // Função para remover rota específica
    removeRoute(routeId) {
        const routeData = this.routes.get(routeId);
        if (routeData) {
            // Remover rota do mapa
            if (this.map.hasLayer(routeData.route)) {
                this.map.removeLayer(routeData.route);
            }
            if (this.map.hasLayer(routeData.arrows)) {
                this.map.removeLayer(routeData.arrows);
            }
            
            // Remover da lista de rotas
            this.routes.delete(routeId);
            
            // Remover o item da lista de resultados
            const resultItem = document.querySelector(`[onclick="map.removeRoute('${routeId}')"]`).closest('.distance-result-item');
            if (resultItem) {
                resultItem.remove();
            }
            
            // Atualizar contadores se necessário
            this.updateCounters();
        }
    }


    // Função para limpar todas as rotas
    clearRoutes() {
        this.routes.forEach((routeData, routeId) => {
            if (this.map.hasLayer(routeData.route)) {
                this.map.removeLayer(routeData.route);
            }
            if (this.map.hasLayer(routeData.arrows)) {
                this.map.removeLayer(routeData.arrows);
            }
        });
        this.routes.clear();
    }

    // Função para obter cor da rota baseada no índice
    getRouteColor(index) {
        const colors = [
            '#2196F3', // Azul
            '#FF5722', // Laranja
            '#4CAF50', // Verde
            '#9C27B0', // Roxo
            '#FF9800', // Amarelo
            '#E91E63', // Rosa
            '#00BCD4', // Ciano
            '#795548', // Marrom
            '#607D8B', // Azul acinzentado
            '#FFEB3B'  // Amarelo claro
        ];
        return colors[index % colors.length];
    }

    // Função para sincronizar marcador com a lista
    syncMarkerWithList(siteName) {
        // Encontrar o item na lista
        const siteItem = document.querySelector(`[data-site-name="${siteName}"]`);
        if (siteItem) {
            // Verificar se já está selecionado
            const checkbox = siteItem.querySelector('.site-checkbox');
            const isCurrentlySelected = this.selectedSites.has(siteName);
            
            if (!isCurrentlySelected) {
                // Se não está selecionado, selecionar
                checkbox.checked = true;
                this.toggleSiteSelection(siteName, true);
            } else {
                // Se já está selecionado, apenas scroll para ele
                this.scrollToSiteInList(siteName);
            }
        }
    }

    // Função para scroll para um site na lista
    scrollToSiteInList(siteName) {
        const siteItem = document.querySelector(`[data-site-name="${siteName}"]`);
        if (siteItem) {
            // Scroll suave para o item
            siteItem.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Adicionar destaque temporário
            siteItem.style.backgroundColor = '#fff3cd';
            siteItem.style.borderLeft = '4px solid #ffc107';
            
            // Remover destaque após 2 segundos
            setTimeout(() => {
                siteItem.style.backgroundColor = '';
                siteItem.style.borderLeft = '';
            }, 2000);
        }
    }

    // Função para manter sites selecionados sempre visíveis
    ensureSelectedSitesVisible() {
        this.selectedSites.forEach(siteName => {
            const siteItem = document.querySelector(`[data-site-name="${siteName}"]`);
            if (siteItem) {
                // Garantir que o item não esteja oculto por filtros
                siteItem.classList.remove('hidden');
                siteItem.style.display = 'flex';
                
                // Se o site não está na lista filtrada, adicioná-lo
                const isInFilteredList = this.filteredSites.some(site => site.name === siteName);
                if (!isInFilteredList) {
                    const site = this.allSites.find(s => s.name === siteName);
                    if (site) {
                        const newSiteItem = this.createSiteItem(site);
                        const sitesList = document.getElementById('sitesList');
                        sitesList.appendChild(newSiteItem);
                    }
                }
            }
        });
    }
}

// Inicializar mapa quando a página carregar
let map;
document.addEventListener('DOMContentLoaded', () => {
    map = new InteractiveMap();
    
    // Expor instância globalmente para uso nos popups
    window.map = map;
});

 
 