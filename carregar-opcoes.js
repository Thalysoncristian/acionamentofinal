// Script para carregar opções dos arquivos HTML separados

// Dados padrão de sites (fallback para modo local)
const sitesPadrao = [
    { value: 'SITE001*UC001', text: 'SITE001 - Site Principal' },
    { value: 'SITE002*UC002', text: 'SITE002 - Site Secundário' },
    { value: 'SITE003*UC003', text: 'SITE003 - Site Terciário' },
    { value: 'SITE004*', text: 'SITE004 - Site Sem UC' },
    { value: 'SITE005*UC005', text: 'SITE005 - Site de Backup' }
];

// Dados padrão de alarmes (fallback para modo local)
const alarmesPadrao = [
    { value: 'ALARME001', text: 'ALARME001 - Falha de Energia' },
    { value: 'ALARME002', text: 'ALARME002 - Falha de Comunicação' },
    { value: 'ALARME003', text: 'ALARME003 - Temperatura Alta' },
    { value: 'ALARME004', text: 'ALARME004 - Temperatura Baixa' },
    { value: 'ALARME005', text: 'ALARME005 - Falha de Equipamento' }
];

// Função para carregar opções de sites
async function carregarOpcoesSites() {
    const select = document.getElementById('site');
    if (!select) return;

    try {
        // Tentar carregar do arquivo HTML
        const response = await fetch('sites-options.html');
        if (response.ok) {
            const html = await response.text();
            
            // Adicionar opção padrão
            const optionPadrao = document.createElement('option');
            optionPadrao.value = '';
            optionPadrao.textContent = 'Selecione um site...';
            select.appendChild(optionPadrao);
            
            // Criar um elemento temporário para parsear o HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Adicionar todas as opções encontradas
            const options = tempDiv.querySelectorAll('option');
            options.forEach(option => {
                select.appendChild(option.cloneNode(true));
            });
            
            console.log('Sites carregados do arquivo HTML');
        } else {
            throw new Error('Arquivo não encontrado');
        }
    } catch (error) {
        console.log('Usando dados padrão de sites (modo local)');
        
        // Usar dados padrão
        const optionPadrao = document.createElement('option');
        optionPadrao.value = '';
        optionPadrao.textContent = 'Selecione um site...';
        select.appendChild(optionPadrao);
        
        sitesPadrao.forEach(site => {
            const option = document.createElement('option');
            option.value = site.value;
            option.textContent = site.text;
            select.appendChild(option);
        });
    }
}

// Função para carregar opções de alarmes
async function carregarOpcoesAlarmes() {
    const select = document.getElementById('alarme');
    if (!select) return;

    try {
        // Tentar carregar do arquivo HTML
        const response = await fetch('alarmes-options.html');
        if (response.ok) {
            const html = await response.text();
            
            // Adicionar opção padrão
            const optionPadrao = document.createElement('option');
            optionPadrao.value = '';
            optionPadrao.textContent = 'Selecione um alarme...';
            select.appendChild(optionPadrao);
            
            // Criar um elemento temporário para parsear o HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Adicionar todas as opções encontradas
            const options = tempDiv.querySelectorAll('option');
            options.forEach(option => {
                select.appendChild(option.cloneNode(true));
            });
            
            console.log('Alarmes carregados do arquivo HTML');
        } else {
            throw new Error('Arquivo não encontrado');
        }
    } catch (error) {
        console.log('Usando dados padrão de alarmes (modo local)');
        
        // Usar dados padrão
        const optionPadrao = document.createElement('option');
        optionPadrao.value = '';
        optionPadrao.textContent = 'Selecione um alarme...';
        select.appendChild(optionPadrao);
        
        alarmesPadrao.forEach(alarme => {
            const option = document.createElement('option');
            option.value = alarme.value;
            option.textContent = alarme.text;
            select.appendChild(option);
        });
    }
}

// Função para carregar todas as opções quando a página carregar
async function carregarTodasOpcoes() {
    await carregarOpcoesSites();
    await carregarOpcoesAlarmes();
}

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { carregarOpcoesSites, carregarOpcoesAlarmes, carregarTodasOpcoes };
} else {
    // Para uso no navegador, tornar disponível globalmente
    window.carregarOpcoesSites = carregarOpcoesSites;
    window.carregarOpcoesAlarmes = carregarOpcoesAlarmes;
    window.carregarTodasOpcoes = carregarTodasOpcoes;
} 