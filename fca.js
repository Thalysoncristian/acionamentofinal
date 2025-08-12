// Funções para o sistema FCA
function toggleFCA() {
    const fcaContainer = document.querySelector('.fca-container');
    const mainForm = document.getElementById('stteForm');
    const mainResult = document.getElementById('resultado');
    const utilitarioDistancia = document.querySelector('.utilitario-distancia');
    
    if (fcaContainer.style.display === 'none') {
        // Mostrar FCA e ocultar outros
        fcaContainer.style.display = 'block';
        mainForm.style.display = 'none';
        mainResult.style.display = 'none';
        utilitarioDistancia.style.display = 'none';
        
        // Sempre definir data e hora atual quando abrir o FCA
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const dataHoraString = `${ano}-${mes}-${dia}T${hora}:${minuto}`;
        document.getElementById('dataHoraFCA').value = dataHoraString;
        
        // Limpar resultado anterior
        document.getElementById('resultadoFCA').innerText = '';
    } else {
        // Ocultar FCA e mostrar formulário principal
        fcaContainer.style.display = 'none';
        mainForm.style.display = 'block';
        mainResult.style.display = 'block';
    }
}

function gerarFCA() {
    const noc = document.getElementById('noc').value.toUpperCase() || '';
    const dataHoraInput = document.getElementById('dataHoraFCA').value;
    const fator = document.getElementById('fator').value.toUpperCase() || '';
    const causa = document.getElementById('causa').value.toUpperCase() || '';
    const acao = document.getElementById('acao').value.toUpperCase() || '';
    const botaoGerar = document.querySelector('button[onclick="gerarFCA()"]');
    
    // Formatar data e hora
    let dataHoraFormatada = '';
    if (dataHoraInput) {
        const data = new Date(dataHoraInput);
        dataHoraFormatada = data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        const agora = new Date();
        dataHoraFormatada = agora.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    const fca = `INFORME DE FCA STTE
NOC: ${noc}
DATA E HORA: ${dataHoraFormatada}
FATOR: ${fator}
CAUSA: ${causa}
AÇÃO: ${acao}`;
    
    document.getElementById('resultadoFCA').innerText = fca;
    
    // Animação de sucesso
    botaoGerar.classList.add('botao-sucesso');
    botaoGerar.innerHTML = '<i class="fa fa-check"></i> FCA Gerado!';
    
    setTimeout(() => {
        botaoGerar.classList.remove('botao-sucesso');
        botaoGerar.innerHTML = '<i class="fa fa-file-text"></i> Gerar FCA';
    }, 2000);
}

function copiarFCA() {
    const resultado = document.getElementById('resultadoFCA').innerText;
    const botaoCopiar = document.querySelector('button[onclick="copiarFCA()"]');
    
    if (resultado.trim()) {
        // Adicionar classe de animação
        botaoCopiar.classList.add('botao-sucesso');
        botaoCopiar.innerHTML = '<i class="fa fa-check"></i> Copiado!';
        
        navigator.clipboard.writeText(resultado).then(() => {
            // Remover animação após 2 segundos
            setTimeout(() => {
                botaoCopiar.classList.remove('botao-sucesso');
                botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar FCA';
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
                botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar FCA';
            }, 2000);
        });
    } else {
        // Animação de erro se não houver FCA
        botaoCopiar.classList.add('botao-erro');
        botaoCopiar.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Gere um FCA!';
        
        setTimeout(() => {
            botaoCopiar.classList.remove('botao-erro');
            botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar FCA';
        }, 2000);
    }
}

function limparFCA() {
    const botaoLimpar = document.querySelector('button[onclick="limparFCA()"]');
    
    document.getElementById('noc').value = '';
    document.getElementById('fator').value = '';
    document.getElementById('causa').value = '';
    document.getElementById('acao').value = '';
    document.getElementById('resultadoFCA').innerText = '';
    
    // Sempre definir data e hora atual quando limpar
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    const dataHoraString = `${ano}-${mes}-${dia}T${hora}:${minuto}`;
    document.getElementById('dataHoraFCA').value = dataHoraString;
    
    // Animação de limpeza
    botaoLimpar.classList.add('botao-info');
    botaoLimpar.innerHTML = '<i class="fa fa-check"></i> Limpo!';
    
    setTimeout(() => {
        botaoLimpar.classList.remove('botao-info');
        botaoLimpar.innerHTML = '<i class="fa fa-eraser"></i> Limpar';
    }, 2000);
}

function voltarAcionamento() {
    const fcaContainer = document.querySelector('.fca-container');
    const mainForm = document.getElementById('stteForm');
    const mainResult = document.getElementById('resultado');
    const utilitarioDistancia = document.querySelector('.utilitario-distancia');
    
    // Ocultar FCA e mostrar formulário principal
    fcaContainer.style.display = 'none';
    mainForm.style.display = 'block';
    mainResult.style.display = 'block';
} 