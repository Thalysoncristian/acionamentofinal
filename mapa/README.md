# 🗺️ Mapa Interativo STTE

## 📋 Descrição
Mapa interativo desenvolvido para visualização e seleção de sites da STTE, permitindo análise geográfica e otimização de rotas para técnicos.

## ✨ Funcionalidades Principais

### 🎯 Visualização de Sites
- **Mapa Interativo**: Visualização completa de todos os sites em um mapa baseado em OpenStreetMap
- **Marcadores Personalizados**: Cada site é representado por um marcador único com as 3 primeiras letras do código
- **Popups Informativos**: Clique nos marcadores para ver detalhes do site
- **Navegação Automática**: Ao marcar um site, o mapa navega automaticamente até ele
- **Efeitos Visuais**: Marcadores destacados com animação de pulso quando selecionados

### 📋 Lista de Sites
- **Sidebar Responsiva**: Lista completa de todos os sites disponíveis
- **Checkboxes Interativos**: Marque/desmarque sites para visualização no mapa
- **Contadores em Tempo Real**: Acompanhe quantos sites estão selecionados e visíveis

### 🔍 Sistema de Busca
- **Busca Inteligente**: Procure sites por código ou coordenadas
- **Filtro Dinâmico**: Resultados atualizados em tempo real
- **Limpeza Rápida**: Botão para limpar a busca instantaneamente

### 🎛️ Controles Avançados
- **Selecionar Todos**: Marque todos os sites de uma vez
- **Limpar Todos**: Desmarque todos os sites selecionados
- **Auto Navegar**: Ative/desative a navegação automática ao selecionar sites
- **Centralizar Mapa**: Ajuste a visualização para mostrar todos os sites
- **Ajustar Seleção**: Centralize o mapa nos sites selecionados
- **Duplo Clique**: Navegue diretamente para um site (independente da seleção)

### 📏 Calculadora de Distâncias
- **Origem Flexível**: Escolha qualquer site como ponto de partida
- **Múltiplos Destinos**: Calcule distâncias para vários sites simultaneamente
- **Rotas Reais**: Cálculo de distâncias por estradas (não linha reta)
- **Visualização de Rotas**: Rotas desenhadas no mapa com cores diferentes
- **Tempo Estimado**: Duração estimada da viagem para cada destino
- **Setas de Direção**: Indicadores visuais da direção da rota
- **Visualização Automática**: Rotas sempre visíveis quando calculadas
- **Ordenação por Proximidade**: Resultados organizados por distância real

## 🚀 Como Usar

### 1. Acessando o Mapa
```
Abra o arquivo: mapa/index.html
```

### 2. Navegação Básica
- **Zoom**: Use scroll do mouse ou botões +/- do mapa
- **Pan**: Arraste o mapa para navegar
- **Clique nos Marcadores**: Veja informações detalhadas do site

### 3. Seleção de Sites
1. **Lista de Sites**: Use a sidebar esquerda para ver todos os sites
2. **Checkboxes**: Marque os sites que deseja visualizar (navegação automática)
3. **Duplo Clique**: Navegue diretamente para um site sem selecioná-lo
4. **Busca**: Use a caixa de busca para encontrar sites específicos
5. **Controles Rápidos**: Use "Selecionar Todos" ou "Limpar Todos"
6. **Auto Navegar**: Controle se o mapa navega automaticamente ao selecionar sites

### 4. Calculadora de Distâncias
1. **Selecione Sites**: Marque os sites de destino na lista
2. **Abra o Painel**: Clique em "Calcular Distâncias" em qualquer popup
3. **Escolha Origem**: Selecione o site de origem no dropdown
4. **Veja Resultados**: Distâncias por rota real ordenadas por proximidade
5. **Visualize Rotas**: Rotas aparecem automaticamente no mapa com cores diferentes
6. **Limpe Rotas**: Use "Limpar Rotas" para remover todas as rotas do mapa

### 5. Controles do Mapa
- **Centralizar**: Botão com ícone de mira
- **Ajustar Seleção**: Botão com ícone de expansão
- **Sidebar Mobile**: Botão de menu em dispositivos móveis

## 📱 Responsividade

### Desktop
- Sidebar fixa à esquerda
- Mapa ocupa o restante da tela
- Controles completos visíveis

### Mobile/Tablet
- Sidebar retrátil (botão de menu)
- Interface adaptada para touch
- Controles otimizados para telas menores

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos e responsivos
- **JavaScript ES6+**: Lógica interativa
- **Bootstrap 5**: Framework CSS responsivo
- **Font Awesome**: Ícones modernos

### Mapeamento
- **Leaflet.js**: Biblioteca de mapas open-source
- **OpenStreetMap**: Dados de mapas gratuitos
- **LocationIQ API**: Cálculo de rotas reais por estradas
- **Leaflet.PolylineDecorator**: Setas de direção nas rotas
- **Haversine**: Cálculo de distâncias em linha reta (fallback)

### Dados
- **coordenadas.js**: Banco de dados de coordenadas dos sites
- **JSON**: Estrutura de dados otimizada

## 📊 Estrutura de Dados

### Formato das Coordenadas
```javascript
{
    "SITE001": {
        "lat": -3.08483,
        "lng": -60.072408
    }
}
```

### Objeto Site
```javascript
{
    name: "SITE001",
    lat: -3.08483,
    lng: -60.072408,
    coordinates: "-3.084830, -60.072408"
}
```

## 🎨 Personalização

### Cores e Temas
- Cores da STTE (azul #07407e)
- Gradientes modernos
- Animações suaves
- Estados visuais claros

### Marcadores
- Círculos coloridos com código do site
- Hover effects
- Popups informativos
- Ícones personalizados

## 🔧 Configuração

### Dependências
```html
<!-- Leaflet CSS e JS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Bootstrap -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

### Arquivos Necessários
```
mapa/
├── index.html      # Interface principal
├── styles.css      # Estilos personalizados
├── map.js          # Lógica do mapa
└── README.md       # Esta documentação
```

## 🚀 Casos de Uso

### Para Técnicos
1. **Visualizar Área de Atuação**: Veja todos os sites em sua região
2. **Planejar Rotas**: Selecione múltiplos sites para atendimento
3. **Calcular Distâncias Reais**: Encontre o site mais próximo por estradas
4. **Visualizar Rotas**: Veja exatamente como chegar a cada site
5. **Estimar Tempo**: Saiba quanto tempo levará para chegar

### Para Supervisores
1. **Análise Geográfica**: Visualize distribuição dos sites
2. **Otimização de Recursos**: Identifique concentrações de ocorrências
3. **Planejamento Estratégico**: Analise cobertura geográfica

### Para NOC
1. **Monitoramento**: Acompanhe localização de todos os sites
2. **Priorização**: Use distâncias para otimizar acionamentos
3. **Relatórios**: Gere análises geográficas de ocorrências

## 🔮 Funcionalidades Futuras

### Planejadas
- [ ] **Roteamento**: Cálculo de rotas otimizadas
- [ ] **Clusters**: Agrupamento de marcadores próximos
- [ ] **Filtros Avançados**: Por região, tipo de site, etc.
- [ ] **Exportação**: Salvar seleções e rotas
- [ ] **Integração**: Conectar com sistema de acionamentos

### Melhorias
- [ ] **Offline**: Funcionamento sem internet
- [ ] **Performance**: Otimização para muitos sites
- [ ] **Acessibilidade**: Melhorias para usuários especiais
- [ ] **Temas**: Modo escuro/claro

## 📞 Suporte

Para dúvidas ou sugestões:
- **Desenvolvedor**: Thalyson Silva
- **Email**: thalyson.silva.pa@stte.com.br
- **Departamento**: NOC - STTE

---

**Desenvolvido com ❤️ para a STTE** 