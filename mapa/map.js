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
        // Carregar sites das coordenadas
        this.allSites = Object.entries(coordenadas).map(([siteName, coords]) => ({
            name: siteName,
            lat: coords.lat,
            lng: coords.lng,
            coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
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
                <div class="site-coordinates">${site.coordinates}</div>
            </div>
        `;
        
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
}

// Inicializar mapa quando a página carregar
let map;
document.addEventListener('DOMContentLoaded', () => {
    map = new InteractiveMap();
    
    // Expor instância globalmente para uso nos popups
    window.map = map;
});

 