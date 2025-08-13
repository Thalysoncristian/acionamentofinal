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
        this.locationCache = new Map(); // Cache de cidade/estado por coordenada (memória)
        this.persistentCacheKey = 'stte_site_locations_v1';
        this.persistentLocationStore = {}; // Cache persistente (localStorage)
        
        this.init();
    }

    loadPersistentLocations() {
        try {
            const raw = localStorage.getItem(this.persistentCacheKey);
            if (raw) {
                this.persistentLocationStore = JSON.parse(raw) || {};
                // Hidratar o cache em memória
                Object.entries(this.persistentLocationStore).forEach(([key, rec]) => {
                    if (rec && rec.location) this.locationCache.set(key, rec.location);
                });
            }
        } catch (e) {
            console.warn('Falha ao carregar cache persistente de localidades', e);
            this.persistentLocationStore = {};
        }
    }

    savePersistentLocation(lat, lng, location) {
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        this.persistentLocationStore[key] = { location, lat, lng, ts: Date.now() };
        try {
            localStorage.setItem(this.persistentCacheKey, JSON.stringify(this.persistentLocationStore));
        } catch (e) {
            console.warn('Falha ao salvar cache persistente de localidades', e);
        }
    }

    async init() {
        try {
            this.loadPersistentLocations();
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
        // Carregar sites das coordenadas
        this.allSites = Object.entries(coordenadas).map(([siteName, coords]) => ({
            name: siteName,
            lat: coords.lat,
            lng: coords.lng,
            coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            location: '' // será preenchido sob demanda
        }));
        
        this.filteredSites = [...this.allSites];
        
        console.log(`Carregados ${this.allSites.length} sites`);
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
            maxZoom: 18
        });

        // Adicionar camada de tiles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Ajustar view para mostrar todos os sites
        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [20, 20] });
        }

        this.isInitialized = true;
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
        document.getElementById('toggleSidebarBtn').addEventListener('click', () => this.toggleSidebar());
        const exportBtn = document.getElementById('exportLocationsBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportLocations());

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

        // Primeiro, renderizar sites filtrados
        this.filteredSites.forEach(site => {
            const siteItem = this.createSiteItem(site);
            sitesList.appendChild(siteItem);
        });

        // Depois, garantir que sites selecionados estejam visíveis
        this.ensureSelectedSitesVisible();
    }

    createSiteItem(site) {
        const item = document.createElement('div');
        item.className = 'site-item';
        item.dataset.siteName = site.name;
        
        item.innerHTML = `
            <input type="checkbox" class="site-checkbox" id="site-${site.name}">
            <div class="site-info">
                <div class="site-name">${site.name}</div>
                <div class="site-location">Buscando localidade...</div>
            </div>
        `;
        
        // Preencher cidade/estado de forma assíncrona (com cache)
        this.populateSiteLocation(site, item);
        
        // Adicionar tooltip para duplo clique
        item.title = `Clique para selecionar • Duplo clique para navegar diretamente`;
        
        // Event listeners
        const checkbox = item.querySelector('.site-checkbox');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleSiteSelection(site.name, e.target.checked);
        });
        
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
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
                <button onclick="map.showDistancePanel('${site.name}')" class="btn btn-sm btn-primary">
                    <i class="fas fa-calculator"></i> Calcular Distâncias
                </button>
            </div>
        `;
    }

    updateSiteItemStyle(siteName, isSelected) {
        const item = document.querySelector(`[data-site-name="${siteName}"]`);
        if (item) {
            item.classList.toggle('selected', isSelected);
        }
    }

    filterSites(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredSites = [...this.allSites];
        } else {
            this.filteredSites = this.allSites.filter(site => 
                site.name.toLowerCase().includes(term) ||
                (site.location && site.location.toLowerCase().includes(term)) ||
                site.coordinates.includes(term)
            );
        }

        this.renderSitesList();
        this.ensureSelectedSitesVisible(); // Manter selecionados visíveis
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
        const visibleSites = this.filteredSites.length;
        const selectedCount = this.selectedSites.size;

        document.getElementById('totalSites').textContent = totalSites;
        document.getElementById('visibleSites').textContent = visibleSites;
        document.getElementById('selectedCount').textContent = `${selectedCount} selecionados`;
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

    // Resolver cidade/estado via a mesma lógica do scripts.js (com cache)
    async resolveLocation(lat, lng) {
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (this.locationCache.has(key)) return this.locationCache.get(key);
        try {
            let resultado;
            if (typeof window.identificarCidade === 'function') {
                resultado = await window.identificarCidade(lat, lng);
            } else {
                resultado = await this.localIdentificarCidade(lat, lng);
            }
            const loc = (resultado && resultado.localidade) ? resultado.localidade : 'Localidade indisponível';
            this.locationCache.set(key, loc);
            return loc;
        } catch (e) {
            console.warn('Falha ao obter localidade', e);
            const fallback = 'Localidade indisponível';
            this.locationCache.set(key, fallback);
            return fallback;
        }
    }
    
    // Fallback local do identificarCidade (mesma abordagem do scripts.js)
    async localIdentificarCidade(lat, lng) {
        try {
            const API_KEY = 'pk.8d008de7d17f1ad2ebfb20d6a4e26e33';
            const respLocationIQ = await fetch(`https://us1.locationiq.com/v1/reverse?key=${API_KEY}&lat=${lat}&lon=${lng}&format=json&`);
            const dataLocationIQ = await respLocationIQ.json();
            const respNominatim = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' } });
            const dataNominatim = await respNominatim.json();
            const cidade = dataNominatim.address?.city || dataNominatim.address?.municipality || dataNominatim.address?.town || dataNominatim.address?.village || '';
            const estado = dataNominatim.address?.state || '';
            const bairro = dataLocationIQ.address?.suburb || dataLocationIQ.address?.neighbourhood || dataLocationIQ.address?.quarter || dataLocationIQ.address?.residential || dataLocationIQ.address?.district || dataLocationIQ.address?.hamlet || dataLocationIQ.address?.administrative_area_level_4 || dataLocationIQ.address?.administrative_area_level_5 || '';
            const rua = dataLocationIQ.address?.road || dataLocationIQ.address?.street || dataLocationIQ.address?.pedestrian || '';
            const numero = dataLocationIQ.address?.house_number || '';
            const enderecoCompleto = [rua, numero, bairro].filter(Boolean).join(', ');
            if (cidade) {
                return {
                    cidade,
                    estado,
                    bairro,
                    rua,
                    numero,
                    localidade: `${cidade}/${estado}`,
                    enderecoCompleto: enderecoCompleto || `${cidade}/${estado}`
                };
            } else {
                const partes = (dataNominatim.display_name || '').split(',');
                const cidadeAlternativa = partes[0]?.trim() || '';
                const bairroAlternativo = partes[1]?.trim() || '';
                return {
                    cidade: cidadeAlternativa,
                    estado,
                    bairro: bairroAlternativo,
                    rua: '',
                    numero: '',
                    localidade: cidadeAlternativa ? `${cidadeAlternativa}/${estado}` : (dataNominatim.display_name?.split(',')[0] || ''),
                    enderecoCompleto: dataNominatim.display_name || ''
                };
            }
        } catch (error) {
            console.error('Erro no localIdentificarCidade:', error);
            return { cidade: '', estado: '', bairro: '', rua: '', numero: '', localidade: 'Localidade indisponível', enderecoCompleto: 'Localidade indisponível' };
        }
    }

    async populateSiteLocation(site, item) {
        try {
            const locationEl = item.querySelector('.site-location');
            if (!locationEl) return;
            const key = `${site.lat.toFixed(4)},${site.lng.toFixed(4)}`;
            // Mostrar imediatamente do cache persistente se existir
            if (this.locationCache.has(key)) {
                const cached = this.locationCache.get(key);
                locationEl.textContent = cached;
                site.location = cached;
                return; // já temos, não precisa buscar
            }
            const loc = await this.resolveLocation(site.lat, site.lng);
            locationEl.textContent = loc;
            site.location = loc;
            this.savePersistentLocation(site.lat, site.lng, loc);
        } catch (_) {}
    }

    exportLocations() {
        // Montar objeto simples: nomeSite -> { lat, lng, location }
        const data = {};
        this.allSites.forEach(site => {
            const key = `${site.lat.toFixed(4)},${site.lng.toFixed(4)}`;
            const loc = this.locationCache.get(key) || site.location || '';
            data[site.name] = { lat: site.lat, lng: site.lng, location: loc };
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'localidades.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Inicializar mapa quando a página carregar
let map;
document.addEventListener('DOMContentLoaded', () => {
    map = new InteractiveMap();
    
    // Expor instância globalmente para uso nos popups
    window.map = map;
});

 