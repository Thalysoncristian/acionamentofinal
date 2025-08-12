// Funções para o sistema Protocolo
function toggleProtocolo() {
    const protocoloContainer = document.querySelector('.protocolo-container');
    const mainForm = document.getElementById('stteForm');
    const mainResult = document.getElementById('resultado');
    const utilitarioDistancia = document.querySelector('.utilitario-distancia');
    const fcaContainer = document.querySelector('.fca-container');
    
    if (protocoloContainer.style.display === 'none') {
        // Mostrar Protocolo e ocultar outros
        protocoloContainer.style.display = 'block';
        mainForm.style.display = 'none';
        mainResult.style.display = 'none';
        utilitarioDistancia.style.display = 'none';
        fcaContainer.style.display = 'none';
        
        // Limpar resultado anterior
        document.getElementById('resultadoProtocolo').innerText = '';
        
        // Preencher o select com as opções do sistema principal
        preencherSelectProtocolo();
    } else {
        // Ocultar Protocolo e mostrar formulário principal
        protocoloContainer.style.display = 'none';
        mainForm.style.display = 'block';
        mainResult.style.display = 'block';
    }
}

function preencherSelectProtocolo() {
    const selectPrincipal = document.getElementById('site');
    const selectProtocolo = document.getElementById('site-select-protocolo');
    
    // Limpar opções existentes
    selectProtocolo.innerHTML = '';
    
    // Copiar todas as opções do select principal
    for (let i = 0; i < selectPrincipal.options.length; i++) {
        const option = selectPrincipal.options[i];
        const newOption = document.createElement('option');
        newOption.value = option.value;
        newOption.textContent = option.textContent;
        selectProtocolo.appendChild(newOption);
    }
}

function preencherDadosProtocolo() {
    const select = document.getElementById('site-select-protocolo');
    const siteSearch = document.getElementById('site-protocolo');
    const ucInput = document.getElementById('uc-protocolo');
    const enderecoInput = document.getElementById('endereco-protocolo');
    
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption) {
        const dados = selectedOption.value.split('*');
        siteSearch.value = dados[0] || ''; // Usar apenas o código do site
        ucInput.value = dados[1] || '';
        enderecoInput.value = dados[2] || '';
    }
}

// Configurar autocomplete para o campo de busca de site
document.addEventListener('DOMContentLoaded', function() {
    const siteSearch = document.getElementById('site-protocolo');
    const dropdownProtocolo = document.getElementById('dropdown-protocolo');
    
    if (siteSearch) {
        siteSearch.addEventListener('input', function() {
            const filter = this.value.toUpperCase();
            dropdownProtocolo.innerHTML = '';
            
            if (filter.length >= 1) {
                const select = document.getElementById('site-select-protocolo');
                for (let i = 0; i < select.options.length; i++) {
                    const optionText = select.options[i].text.toUpperCase();
                    if (optionText.includes(filter)) {
                        const div = document.createElement('div');
                        div.textContent = select.options[i].textContent;
                        div.addEventListener('click', function() {
                            const dados = select.options[i].value.split('*');
                            siteSearch.value = dados[0] || '';
                            select.selectedIndex = i;
                            dropdownProtocolo.classList.remove('show');
                            preencherDadosProtocolo();
                        });
                        dropdownProtocolo.appendChild(div);
                    }
                }
                dropdownProtocolo.classList.add('show');
            } else {
                dropdownProtocolo.classList.remove('show');
            }
        });
    }
    
    // Fechar dropdown quando clicar fora
    document.addEventListener('click', function(event) {
        if (!event.target.matches('#site-protocolo')) {
            dropdownProtocolo.classList.remove('show');
        }
    });
});

function gerarProtocolo() {
    const site = document.getElementById('site-protocolo').value.toUpperCase() || "";
    const uc = document.getElementById('uc-protocolo').value || "";
    const endereco = document.getElementById('endereco-protocolo').value || "";
    const protocolo = document.getElementById('protocolo-numero').value.toUpperCase() || "";
    const atendente = document.getElementById('atendente-protocolo').value.toUpperCase() || "";
    const horaData = new Date().toLocaleString('pt-BR');
    const botaoGerar = document.querySelector('button[onclick="gerarProtocolo()"]');

    let resultado = `INFORMATIVO DE PROTOCOLO\nSITE: ${site}\nUC: ${uc}\nENDEREÇO: ${endereco}\nPROTOCOLO: ${protocolo}\nATENDENTE: ${atendente}\nHORA E DATA: ${horaData}`;

    document.getElementById('resultadoProtocolo').innerText = resultado.trim();
    
    // Animação de sucesso
    botaoGerar.classList.add('botao-sucesso');
    botaoGerar.innerHTML = '<i class="fa fa-check"></i> Protocolo Gerado!';
    
    setTimeout(() => {
        botaoGerar.classList.remove('botao-sucesso');
        botaoGerar.innerHTML = '<i class="fa fa-cogs"></i> Gerar Protocolo';
    }, 2000);
}

function copiarProtocolo() {
    const resultado = document.getElementById('resultadoProtocolo').innerText;
    const botaoCopiar = document.querySelector('button[onclick="copiarProtocolo()"]');
    
    if (resultado.trim()) {
        // Adicionar classe de animação
        botaoCopiar.classList.add('botao-sucesso');
        botaoCopiar.innerHTML = '<i class="fa fa-check"></i> Copiado!';
        
        navigator.clipboard.writeText(resultado).then(() => {
            // Remover animação após 2 segundos
            setTimeout(() => {
                botaoCopiar.classList.remove('botao-sucesso');
                botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar Protocolo';
            }, 2000);
        }).catch(() => {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = resultado;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Remover animação após 2 segundos
            setTimeout(() => {
                botaoCopiar.classList.remove('botao-sucesso');
                botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar Protocolo';
            }, 2000);
        });
    } else {
        // Animação de erro se não houver protocolo
        botaoCopiar.classList.add('botao-erro');
        botaoCopiar.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Gere um protocolo!';
        
        setTimeout(() => {
            botaoCopiar.classList.remove('botao-erro');
            botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar Protocolo';
        }, 2000);
    }
}

function limparProtocolo() {
    const botaoLimpar = document.querySelector('button[onclick="limparProtocolo()"]');
    
    document.getElementById('site-protocolo').value = '';
    document.getElementById('uc-protocolo').value = '';
    document.getElementById('endereco-protocolo').value = '';
    document.getElementById('protocolo-numero').value = '';
    document.getElementById('atendente-protocolo').value = '';
    document.getElementById('resultadoProtocolo').innerText = '';
    document.getElementById('site-select-protocolo').selectedIndex = 0;
    
    // Animação de limpeza
    botaoLimpar.classList.add('botao-info');
    botaoLimpar.innerHTML = '<i class="fa fa-check"></i> Limpo!';
    
    setTimeout(() => {
        botaoLimpar.classList.remove('botao-info');
        botaoLimpar.innerHTML = '<i class="fa fa-eraser"></i> Limpar';
    }, 2000);
}

function voltarAcionamentoProtocolo() {
    const protocoloContainer = document.querySelector('.protocolo-container');
    const mainForm = document.getElementById('stteForm');
    const mainResult = document.getElementById('resultado');
    
    // Ocultar Protocolo e mostrar formulário principal
    protocoloContainer.style.display = 'none';
    mainForm.style.display = 'block';
    mainResult.style.display = 'block';
} 