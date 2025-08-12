// Script para carregar opções dos arquivos HTML separados

// Função para carregar opções de sites
async function carregarOpcoesSites() {
    try {
        const response = await fetch('sites-options.html');
        const html = await response.text();
        
        const select = document.getElementById('site');
        if (select) {
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
        }
    } catch (error) {
        console.error('Erro ao carregar opções de sites:', error);
    }
}

// Função para carregar opções de alarmes
async function carregarOpcoesAlarmes() {
    try {
        const response = await fetch('alarmes-options.html');
        const html = await response.text();
        
        const select = document.getElementById('alarme');
        if (select) {
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
        }
    } catch (error) {
        console.error('Erro ao carregar opções de alarmes:', error);
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