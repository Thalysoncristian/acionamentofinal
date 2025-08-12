// Importar coordenadas do arquivo separado
// As coordenadas são carregadas automaticamente pelo arquivo coordenadas.js

async function identificarCidade(lat, lng) {
    try {
        // Primeiro, usar LocationIQ para obter bairro e outros detalhes
        const API_KEY = 'pk.8d008de7d17f1ad2ebfb20d6a4e26e33';
        const responseLocationIQ = await fetch(`https://us1.locationiq.com/v1/reverse?key=${API_KEY}&lat=${lat}&lon=${lng}&format=json&`);
        const dataLocationIQ = await responseLocationIQ.json();
        console.log('Resposta LocationIQ:', dataLocationIQ);

        // Depois, usar Nominatim para obter cidade e estado
        const responseNominatim = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const dataNominatim = await responseNominatim.json();
        console.log('Resposta Nominatim:', dataNominatim);

        // Extrair cidade e estado do Nominatim
        const cidade = dataNominatim.address.city || 
                      dataNominatim.address.municipality || 
                      dataNominatim.address.town || 
                      dataNominatim.address.village || '';
        const estado = dataNominatim.address.state || '';

        // Extrair bairro e outros detalhes do LocationIQ
        const bairro = dataLocationIQ.address.suburb || 
                      dataLocationIQ.address.neighbourhood || 
                      dataLocationIQ.address.quarter || 
                      dataLocationIQ.address.residential || 
                      dataLocationIQ.address.district || 
                      dataLocationIQ.address.hamlet || 
                      dataLocationIQ.address.administrative_area_level_4 || 
                      dataLocationIQ.address.administrative_area_level_5 || 
                      '';
        
        const rua = dataLocationIQ.address.road || dataLocationIQ.address.street || dataLocationIQ.address.pedestrian || '';
        const numero = dataLocationIQ.address.house_number || '';
        const enderecoCompleto = [rua, numero, bairro].filter(Boolean).join(', ');
        
        console.log('Dados combinados:', { cidade, estado, bairro, enderecoCompleto });
        
        if (cidade) {
            return {
                cidade: cidade,
                estado: estado,
                bairro: bairro,
                rua: rua,
                numero: numero,
                localidade: `${cidade}/${estado}`,
                enderecoCompleto: enderecoCompleto || `${cidade}/${estado}`
            };
        } else {
            // Fallback usando display_name do Nominatim
            const partes = dataNominatim.display_name.split(',');
            const cidadeAlternativa = partes[0]?.trim() || '';
            const bairroAlternativo = partes[1]?.trim() || '';
            
            return {
                cidade: cidadeAlternativa,
                estado: estado,
                bairro: bairroAlternativo,
                rua: '',
                numero: '',
                localidade: cidadeAlternativa ? `${cidadeAlternativa}/${estado}` : dataNominatim.display_name.split(',')[0],
                enderecoCompleto: dataNominatim.display_name
            };
        }
    } catch (error) {
        console.error('Erro ao identificar localização:', error);
        return {
            cidade: '',
            estado: '',
            bairro: '',
            rua: '',
            numero: '',
            localidade: "Localização não identificada",
            enderecoCompleto: "Localização não identificada"
        };
    }
}

// Função para determinar o CN baseado na localidade
async function determinarCN(localidade) {
    if (!localidade) return '91'; // CN padrão caso não encontre a localidade
    
    // Definir as regiões do Pará por coordenadas
    const regioesPara = {
        '91': { // Região Metropolitana de Belém e nordeste
            minLat: -2.0,
            maxLat: 0.0,
            minLng: -49.0,
            maxLng: -47.0
        },
        '93': { // Oeste do estado
            minLat: -10.0,
            maxLat: -1.0,
            minLng: -58.0,
            maxLng: -52.0
        },
        '94': { // Sudeste do estado
            minLat: -8.0,
            maxLat: -4.0,
            minLng: -52.0,
            maxLng: -48.0
        }
    };

    const cnsPorEstado = {
        'Amazonas': '92',
        'Pará': '91', // Será sobrescrito pela lógica regional
        'Roraima': '95',
        'Amapá': '96',
        'Rondônia': '69',
        'Acre': '68',
        'Tocantins': '63',
        'Maranhão': '98',
        'Piauí': '86',
        'Ceará': '85',
        'Rio Grande do Norte': '84',
        'Paraíba': '83',
        'Pernambuco': '81',
        'Alagoas': '82',
        'Sergipe': '79',
        'Bahia': '71',
        'Minas Gerais': '31',
        'Espírito Santo': '27',
        'Rio de Janeiro': '21',
        'São Paulo': '11',
        'Paraná': '41',
        'Santa Catarina': '47',
        'Rio Grande do Sul': '51',
        'Mato Grosso do Sul': '67',
        'Mato Grosso': '65',
        'Goiás': '62',
        'Distrito Federal': '61'
    };

    try {
        // Se a localidade já contém o estado (formato CIDADE/ESTADO)
        const partes = localidade.split('/');
        if (partes.length > 1) {
            const estado = partes[1].trim();
            const cidade = partes[0].trim();
            
            // Se for Pará, tentar obter as coordenadas da cidade
            if (estado === 'Pará') {
                try {
                    // Usar a API do Nominatim para obter as coordenadas da cidade
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cidade)},${estado},Brasil&limit=1`);
                    const data = await response.json();
                    
                    if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        
                        // Verificar em qual região as coordenadas se encaixam
                        for (const [ddd, regiao] of Object.entries(regioesPara)) {
                            if (lat >= regiao.minLat && lat <= regiao.maxLat &&
                                lng >= regiao.minLng && lng <= regiao.maxLng) {
                                return ddd;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erro ao obter coordenadas da cidade:', error);
                }
                return '91'; // Se não conseguir determinar, retorna o DDD padrão de Belém
            }
            
            return cnsPorEstado[estado] || '91';
        }

        // Se não tiver o estado, tenta buscar usando as coordenadas do site
        const site = document.getElementById('site-search').value.toUpperCase();
        const coords = coordenadas[site];
        
        if (coords) {
            const localizacao = await identificarCidade(coords.lat, coords.lng);
            if (localizacao.estado === 'Pará') {
                // Verificar em qual região as coordenadas se encaixam
                for (const [ddd, regiao] of Object.entries(regioesPara)) {
                    if (coords.lat >= regiao.minLat && coords.lat <= regiao.maxLat &&
                        coords.lng >= regiao.minLng && coords.lng <= regiao.maxLng) {
                        return ddd;
                    }
                }
                return '91'; // Se não encontrar a região, retorna o DDD padrão de Belém
            }
            if (localizacao.estado) {
                return cnsPorEstado[localizacao.estado] || '91';
            }
        }

        return '91'; // CN padrão se não conseguir determinar
    } catch (error) {
        console.error('Erro ao determinar CN:', error);
        return '91';
    }
}

// Função para calcular o SLA baseado no tipo de alarme
function calcularSLA(tipoAlarme, dataHoraAcionamento) {
    if (!dataHoraAcionamento) return 'N/A';
    
    try {
        // Garantir que a data de acionamento seja válida
        const dataAcionamento = new Date(dataHoraAcionamento);
        if (isNaN(dataAcionamento.getTime())) {
            console.error('Data de acionamento inválida:', dataHoraAcionamento);
            return 'N/A';
        }
        
        let horasSLA = 4; // SLA padrão de 4 horas
        
        // Mapeamento dos SLAs por tipo de alarme
        const slaPorAlarme = {
            'AFCA': 4,  // FALHA DE ENERGIA
            'ABAT': 4,  // BATERIA EM DESCARGA
            'AFRET': 24, // FALHA DE RETIFICADOR
            'ADIF': 4,  // FALHA DE FUSÍVEL
            'AQDF': 4,  // FALHA DE QUADRO DE FORÇA
            'ABAL': 24, // FALHA DE BALIZAMENTO
            'AOGMG': 4, // GMG EM OPERAÇÃO
            'ACGMG': 4, // BAIXO NIVEL DE COMBUSTIVEL
            'AFGMG': 4, // FALHA NO GMG
            'ATEMP': 4, // ALTA TEMPERATURA
            'ATRO': 4,  // TROCADOR DE CALOR
            'ARCON': 4  // FALHA DE AR-CONDICIONADO
        };
        
        // Extrair o código do alarme (primeiros 4-5 caracteres)
        const codigoAlarme = tipoAlarme.split(' ')[0];
        horasSLA = slaPorAlarme[codigoAlarme] || 4;
        
        // Calcular a data/hora final do SLA
        const dataFinalSLA = new Date(dataAcionamento.getTime() + (horasSLA * 60 * 60 * 1000));
        
        // Verificar se a data final é válida
        if (isNaN(dataFinalSLA.getTime())) {
            console.error('Erro ao calcular data final do SLA');
            return 'N/A';
        }
        
        // Formatar a data/hora final do SLA
        const dia = String(dataFinalSLA.getDate()).padStart(2, '0');
        const mes = String(dataFinalSLA.getMonth() + 1).padStart(2, '0');
        const ano = dataFinalSLA.getFullYear();
        const hora = String(dataFinalSLA.getHours()).padStart(2, '0');
        const minuto = String(dataFinalSLA.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    } catch (error) {
        console.error('Erro ao calcular SLA:', error);
        return 'N/A';
    }
}

// Função para formatar data e hora
function formatarDataHora(data, tipo = 'padrao') {
    if (!data) return '';
    
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return '';
    
    // Formatar apenas hora (HH:mm)
    if (tipo === 'hora') {
        return dataObj.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Formatar data e hora (DD/MM/YYYY HH:mm)
    return dataObj.toLocaleString('pt-BR', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para calcular a distância entre duas coordenadas usando a fórmula de Haversine
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em quilômetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c;
    
    return distancia.toFixed(1); // Retorna a distância com 1 casa decimal
}

// Função para gerar o acionamento
async function gerarAcionamento() {
    try {
        const get = id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Elemento com id '${id}' não encontrado`);
                return '';
            }
            return element.value || '';
        };

        const getSelect = id => {
            const element = document.getElementById(id);
            if (!element || !element.options) {
                console.warn(`Select com id '${id}' não encontrado ou não é um select`);
                return '';
            }
            return element.options[element.selectedIndex]?.text || '';
        };

        // Calcular o SLA diretamente
        const alarmeSelect = document.getElementById('alarme');
        const dataHoraInput = document.getElementById('dataHora');
        let slaFormatado = 'N/A';
        
        if (alarmeSelect && dataHoraInput) {
            const tipoAlarme = alarmeSelect.options[alarmeSelect.selectedIndex].text;
            const dataHoraAcionamento = dataHoraInput.value;
            slaFormatado = calcularSLA(tipoAlarme, dataHoraAcionamento);
        }
        
        // Formatar apenas a hora para acionamento e previsão
        const dataHoraFormatada = formatarDataHora(get('dataHora'), 'hora');
        const previsaoFormatada = formatarDataHora(get('previsao'), 'hora');

        const site = get('site-search') || getSelect('site');
        const localidade = get('localidade');
        const endereco = get('endereco');
        
        // Verificar se o campo UC está visível e se tem valor
        const ucInput = document.getElementById('uc');
        const uc = (ucInput.style.display !== 'none' && ucInput.value.trim() !== '') ? get('uc') : '';

        // Se o campo CN estiver visível, usar o valor digitado, senão determinar automaticamente
        const cnInput = document.getElementById('cn');
        const cn = cnInput.style.display === 'block' ? get('cn') : await determinarCN(localidade);

        // Verificar se o site está no select e se tem UC
        const select = document.getElementById('site');
        let temUC = false;
        if (select) {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
                const dados = selectedOption.value.split('*');
                temUC = dados[1] && dados[1].trim() !== '';
            }
        }

        let informe = [
            '*INFORMATIVO DE ACIONAMENTO*',
            `*ANALISTA NOC:* ${get('analista')}`,
            `*SUPERVISOR:* ${get('supervisor')}`,
            `*CN:* ${cn}`,
            `*ESTAÇÃO:* ${site}`,
            localidade ? `*LOCALIDADE:* ${localidade}` : '',
            endereco ? `*ENDEREÇO:* ${endereco}` : '',
            temUC ? `*UC:* ${uc}` : '', // Só inclui UC se o site tiver UC
            `*ALARME:* ${getSelect('alarme')}`,
            `*AMI:* ${get('ami')}`,
            `*INC:* ${get('inc')}`,
            dataHoraFormatada ? `*HORA DO ACIONAMENTO:* ${dataHoraFormatada}` : '',
            previsaoFormatada ? `*PREVISÃO:* ${previsaoFormatada}` : '',
            `*SLA ATÉ:* ${slaFormatado}`,
            `*TÉCNICO ACIONADO:* ${get('tecnico')}`
        ];

        const informeFinal = informe.filter(linha => linha.trim()).join('\n');

        const resultadoElement = document.getElementById('resultado');
        if (resultadoElement) {
            resultadoElement.innerText = informeFinal;
            
            // Animação de sucesso no botão gerar
            const botaoGerar = document.querySelector('button[onclick="gerarAcionamento()"]');
            if (botaoGerar) {
                botaoGerar.classList.add('botao-sucesso');
                botaoGerar.innerHTML = '<i class="fa fa-check"></i> Gerado!';
                
                setTimeout(() => {
                    botaoGerar.classList.remove('botao-sucesso');
                    botaoGerar.innerHTML = '<i class="fa fa-cogs"></i> Gerar';
                }, 2000);
            }
        } else {
            console.error('Elemento de resultado não encontrado');
            alert('Erro ao gerar relatório: elemento de resultado não encontrado');
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório. Por favor, verifique se todos os campos estão presentes.');
    }
}

// Função para copiar o acionamento gerado
function copiarAcionamento() {
    const resultado = document.getElementById('resultado')?.innerText;
    const botaoCopiar = document.querySelector('button[onclick="copiarAcionamento()"]');
    
    if (!resultado) {
        // Animação de erro se não houver relatório
        botaoCopiar.classList.add('botao-erro');
        botaoCopiar.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Gere um relatório!';
        
        setTimeout(() => {
            botaoCopiar.classList.remove('botao-erro');
            botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar';
        }, 2000);
        return;
    }
    
    // Adicionar classe de animação
    botaoCopiar.classList.add('botao-sucesso');
    botaoCopiar.innerHTML = '<i class="fa fa-check"></i> Copiado!';
    
    navigator.clipboard.writeText(resultado)
        .then(() => {
            // Remover animação após 2 segundos
            setTimeout(() => {
                botaoCopiar.classList.remove('botao-sucesso');
                botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar';
            }, 2000);
        })
        .catch(err => {
            console.error('Erro ao copiar:', err);
            // Animação de erro
            botaoCopiar.classList.remove('botao-sucesso');
            botaoCopiar.classList.add('botao-erro');
            botaoCopiar.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Erro!';
            
            setTimeout(() => {
                botaoCopiar.classList.remove('botao-erro');
                botaoCopiar.innerHTML = '<i class="fa fa-copy"></i> Copiar';
            }, 2000);
        });
}

// Função para buscar site e filtrar opções
document.getElementById("site-search").addEventListener("input", function() {
    const filter = this.value.toUpperCase();
    const options = document.getElementById("site").options;
    const dropdownContent = document.getElementById('dropdown-content');
    dropdownContent.innerHTML = '';

    if (filter.length >= 1) {
        for (let i = 0; i < options.length; i++) {
            const optionText = options[i].text.toUpperCase();
            if (optionText.includes(filter)) {
                const div = document.createElement('div');
                div.textContent = optionText;
                div.addEventListener('click', async function() {
                    document.getElementById('site-search').value = optionText;
                    document.getElementById('site').selectedIndex = i;
                    dropdownContent.classList.remove('show');
                    await preencherDados(options[i].value);
                });
                dropdownContent.appendChild(div);
            }
        }
        dropdownContent.classList.add('show');
    } else {
        dropdownContent.classList.remove('show');
    }
});

// Função para preencher dados de UC, Endereço e Localidade
async function preencherDados(value) {
    const select = document.getElementById('site');
    const enderecoInput = document.getElementById('endereco');
    const ucInput = document.getElementById('uc');
    const ucLabel = document.querySelector('label[for="uc"]');
    const siteSearch = document.getElementById('site-search');
    const cnInput = document.getElementById('cn');
    const cnLabel = document.querySelector('label[for="cn"]');
    
    // Verifica se o valor digitado corresponde a algum site no banco
    const siteDigitado = siteSearch.value.toUpperCase().trim();
    const coords = coordenadas[siteDigitado];
    
    console.log('Site digitado:', siteDigitado); // Debug
    console.log('Coordenadas encontradas:', coords); // Debug
    
    // Se não encontrou coordenadas, verifica se o site está no select
    if (!coords) {
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value.includes(siteDigitado)) {
                const dados = select.options[i].value.split('*');
                const siteText = select.options[i].text;
                
                // Verifica se o site tem UC (segundo elemento do array)
                if (dados[1] && dados[1].trim() !== '') {
                    ucInput.value = dados[1];
                    ucInput.style.display = 'block';
                    ucLabel.style.display = 'block';
                } else {
                    ucInput.value = '';
                    ucInput.style.display = 'none';
                    ucLabel.style.display = 'none';
                }
                
                // Se o site não tem UC, o endereço está no próprio texto da opção
                if (!dados[1] || dados[1].trim() === '') {
                    enderecoInput.value = siteText.split('*')[1] || '';
                } else {
                    enderecoInput.value = dados[2] || '';
                }
                
                document.getElementById('localidade').value = '';
                
                // Sempre permitir edição do endereço
                enderecoInput.readOnly = false;
                
                // Mostrar campo CN para preenchimento manual
                cnInput.style.display = 'block';
                cnLabel.style.display = 'block';
                cnInput.readOnly = false;
                cnInput.value = '';
                
                document.getElementById('rotasButton').style.display = 'none';
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.log('Site não encontrado no banco de dados'); // Debug
            enderecoInput.readOnly = false;
            enderecoInput.value = '';
            ucInput.value = '';
            ucInput.style.display = 'none';
            ucLabel.style.display = 'none';
            document.getElementById('localidade').value = '';
            document.getElementById('rotasButton').style.display = 'none';
            
            // Mostrar campo CN para preenchimento manual
            cnInput.style.display = 'block';
            cnLabel.style.display = 'block';
            cnInput.readOnly = false;
            cnInput.value = '';
        }
        return;
    }
    
    // Se encontrou coordenadas, continua com o preenchimento normal
    let found = false;
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
            const dados = select.options[i].value.split('*');
            const siteText = select.options[i].text;
            
            // Verifica se o site tem UC (segundo elemento do array)
            if (dados[1] && dados[1].trim() !== '') {
                ucInput.value = dados[1];
                ucInput.style.display = 'block';
                ucLabel.style.display = 'block';
            } else {
                ucInput.value = '';
                ucInput.style.display = 'none';
                ucLabel.style.display = 'none';
            }
            
            try {
                console.log('Chamando identificarCidade com:', coords.lat, coords.lng); // Debug
                const localizacao = await identificarCidade(coords.lat, coords.lng);
                console.log('Localização identificada:', localizacao); // Debug
                
                // Preencher localidade e endereço (ocultos)
                document.getElementById('localidade').value = localizacao.localidade;
                
                // Se o site não tem UC, o endereço está no próprio texto da opção
                if (!dados[1] || dados[1].trim() === '') {
                    enderecoInput.value = siteText.split('*')[1] || '';
                } else if (dados[2]) {
                    enderecoInput.value = dados[2];
                    // Adicionar bairro se disponível e não estiver no endereço
                    if (localizacao.bairro && !enderecoInput.value.includes(localizacao.bairro)) {
                        enderecoInput.value = `${enderecoInput.value}, ${localizacao.bairro}`;
                    }
                } else {
                    enderecoInput.value = localizacao.enderecoCompleto;
                }
                
                // Ocultar campo CN pois será preenchido automaticamente
                cnInput.style.display = 'none';
                cnLabel.style.display = 'none';
                
                // Sempre permitir edição do endereço
                enderecoInput.readOnly = false;
            } catch (error) {
                console.error('Erro ao identificar cidade:', error);
                document.getElementById('localidade').value = '';
                
                // Se o site não tem UC, o endereço está no próprio texto da opção
                if (!dados[1] || dados[1].trim() === '') {
                    enderecoInput.value = siteText.split('*')[1] || '';
                } else {
                    enderecoInput.value = dados[2] || '';
                }
                
                // Garantir que o endereço seja editável mesmo em caso de erro
                enderecoInput.readOnly = false;
                
                // Em caso de erro, mostrar campo CN para preenchimento manual
                cnInput.style.display = 'block';
                cnLabel.style.display = 'block';
                cnInput.readOnly = false;
                cnInput.value = '';
            }
            
            found = true;
            document.getElementById('rotasButton').style.display = 'block';
            break;
        }
    }
    
    if (!found) {
        console.log('Nenhuma opção correspondente encontrada para o valor:', value); // Debug
        enderecoInput.readOnly = false;
        enderecoInput.value = '';
        ucInput.value = '';
        ucInput.style.display = 'none';
        ucLabel.style.display = 'none';
        document.getElementById('localidade').value = '';
        document.getElementById('rotasButton').style.display = 'none';
        
        // Mostrar campo CN para preenchimento manual
        cnInput.style.display = 'block';
        cnLabel.style.display = 'block';
        cnInput.readOnly = false;
        cnInput.value = '';
    }
}

// Função para abrir o Google Maps com as coordenadas do KML
function abrirGoogleMaps() {
    const site = document.getElementById('site-search').value.toUpperCase();
    const coords = coordenadas[site];

    if (coords) {
        const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15`;
        window.open(url, '_blank');
    } else {
        alert('Coordenadas não encontradas para o site selecionado.');
    }
}

document.addEventListener('click', function(event) {
  const dropdownContent = document.getElementById('dropdown-content');
  if (!event.target.matches('#site-search')) {
      dropdownContent.classList.remove('show');
  }
});

// Função para limpar campos UC e Endereço antes de preencher novos dados
function limparCampos() {
  document.getElementById('uc').value = '';
  document.getElementById('endereco').value = '';
}

// Modificar o event listener do campo de busca de site
document.getElementById('site-search').addEventListener('input', async function() {
    limparCampos();
    const filter = this.value.toUpperCase();
    const select = document.getElementById('site');
    const dropdownContent = document.getElementById('dropdown-content');
    dropdownContent.innerHTML = '';

    // Verificar se o valor digitado corresponde exatamente a algum site
    const siteExato = Array.from(select.options).find(option => 
        option.text.toUpperCase() === filter
    );

    if (siteExato) {
        // Se encontrou um site exato, selecionar automaticamente
        select.selectedIndex = Array.from(select.options).indexOf(siteExato);
        await preencherDados(siteExato.value);
        dropdownContent.classList.remove('show');
        return;
    }

    // Se não encontrou site exato, mostrar sugestões
    if (filter.length >= 1) {
        for (let i = 0; i < select.options.length; i++) {
            const optionText = select.options[i].text.toUpperCase();
            if (optionText.includes(filter)) {
                const div = document.createElement('div');
                div.textContent = select.options[i].text;
                div.addEventListener('click', async function() {
                    document.getElementById('site-search').value = select.options[i].text;
                    select.selectedIndex = i;
                    dropdownContent.classList.remove('show');
                    await preencherDados(select.options[i].value);
                });
                dropdownContent.appendChild(div);
            }
        }
        dropdownContent.classList.add('show');
    } else {
        dropdownContent.classList.remove('show');
    }
});

// Adicionar event listener para colar no campo de site
document.getElementById('site-search').addEventListener('paste', async function(e) {
    // Permitir que o evento de colar ocorra normalmente
    setTimeout(async () => {
        const valorColado = this.value.toUpperCase().trim();
        const select = document.getElementById('site');
        
        // Procurar por uma correspondência exata
        const siteExato = Array.from(select.options).find(option => 
            option.text.toUpperCase() === valorColado
        );

        if (siteExato) {
            // Se encontrou um site exato, selecionar automaticamente
            select.selectedIndex = Array.from(select.options).indexOf(siteExato);
            await preencherDados(siteExato.value);
            document.getElementById('dropdown-content').classList.remove('show');
        }
    }, 0);
});

// Funções para mostrar/esconder campos detalhados
function toggleModulo() {
    const moduloDescricao = document.getElementById('moduloDescricao');
    const moduloLabel = document.querySelector('label[for="moduloDescricao"]');
    const moduloVandalizado = document.getElementById('moduloVandalizado');
    if (moduloDescricao && moduloLabel && moduloVandalizado) {
        const display = moduloVandalizado.value === 'SIM' ? 'block' : 'none';
        moduloDescricao.style.display = display;
        moduloLabel.style.display = display;
    }
}

function toggleFibras() {
    const fibrasDetalhes = document.getElementById('fibrasDetalhes');
    const fibrasVandalizadas = document.getElementById('fibrasVandalizadas');
    if (fibrasDetalhes && fibrasVandalizadas) {
        fibrasDetalhes.style.display = fibrasVandalizadas.value === 'SIM' ? 'block' : 'none';
    }
}

function toggleCabos() {
    const cabosDetalhes = document.getElementById('cabosDetalhes');
    const cabosVandalizados = document.getElementById('cabosVandalizados');
    if (cabosDetalhes && cabosVandalizados) {
        cabosDetalhes.style.display = cabosVandalizados.value === 'SIM' ? 'block' : 'none';
    }
}

function toggleBaterias() {
    const bateriasDetalhes = document.getElementById('bateriasDetalhes');
    const bateriasVandalizadas = document.getElementById('bateriasVandalizadas');
    if (bateriasDetalhes && bateriasVandalizadas) {
        bateriasDetalhes.style.display = bateriasVandalizadas.value === 'SIM' ? 'block' : 'none';
    }
}

// Função para inicializar os campos condicionais
function inicializarCamposCondicionais() {
    toggleModulo();
    toggleFibras();
    toggleCabos();
    toggleBaterias();
}

// Adicionar chamada para inicializar campos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializarCamposCondicionais();
    carregarTodasOpcoes(); // Carregar opções dos arquivos HTML separados
});

// Atualizar o event listener do select site
document.getElementById('site').addEventListener('change', async function() {
    await preencherDados(this.value);
});

// Remover a função compartilharWhatsApp e substituir por toggleUtilitarioDistancia
function toggleUtilitarioDistancia() {
    const utilitario = document.querySelector('.utilitario-distancia');
    const botao = document.querySelector('button[onclick="toggleUtilitarioDistancia()"]');
    
    if (utilitario.style.display === 'none') {
        // Mostrar o utilitário
        utilitario.style.display = 'block';
        botao.innerHTML = '<i class="fa fa-times"></i> Fechar';
        botao.style.backgroundColor = '#dc3545'; // Vermelho para indicar que pode fechar
        
        // Limpar os campos e resultado
        document.getElementById('site-origem').value = '';
        document.getElementById('site-destino').value = '';
        document.getElementById('resultado-distancia').innerHTML = '';
    } else {
        // Ocultar o utilitário
        utilitario.style.display = 'none';
        botao.innerHTML = '<i class="fa fa-calculator"></i> Calcular Distância';
        botao.style.backgroundColor = '#07407e'; // Voltar à cor original
    }
}

// Função para calcular distância entre dois sites específicos
async function calcularDistanciaEntreSites() {
    const siteOrigem = document.getElementById('site-origem').value.toUpperCase().trim();
    const siteDestino = document.getElementById('site-destino').value.toUpperCase().trim();
    const resultadoElement = document.getElementById('resultado-distancia');
    const API_KEY = 'pk.8d008de7d17f1ad2ebfb20d6a4e26e33';
    
    // Verificar se os sites existem no banco de dados
    const coordsOrigem = coordenadas[siteOrigem];
    const coordsDestino = coordenadas[siteDestino];
    
    if (!coordsOrigem || !coordsDestino) {
        let mensagem = 'Sites não encontrados no banco de dados:';
        if (!coordsOrigem) mensagem += `\n- ${siteOrigem}`;
        if (!coordsDestino) mensagem += `\n- ${siteDestino}`;
        resultadoElement.innerHTML = mensagem.replace(/\n/g, '<br>');
        return;
    }

    // Mostrar mensagem de carregamento
    resultadoElement.innerHTML = '<div class="loading">Calculando rota...</div>';
    
    try {
        // Calcular a distância em linha reta primeiro
        const distanciaLinhaReta = calcularDistancia(
            coordsOrigem.lat, coordsOrigem.lng,
            coordsDestino.lat, coordsDestino.lng
        );

        // Tentar obter a rota usando LocationIQ
        const url = `https://us1.locationiq.com/v1/directions/driving/${coordsOrigem.lng},${coordsOrigem.lat};${coordsDestino.lng},${coordsDestino.lat}?key=${API_KEY}&overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const rota = data.routes[0];
            const distanciaRota = (rota.distance / 1000).toFixed(1); // Converter metros para km
            const tempoEstimado = Math.round(rota.duration / 60); // Converter segundos para minutos
            
            // Formatar o resultado
            const resultado = `
                <strong>Distância entre sites:</strong><br>
                De: ${siteOrigem} (${coordsOrigem.lat.toFixed(6)}, ${coordsOrigem.lng.toFixed(6)})<br>
                Para: ${siteDestino} (${coordsDestino.lat.toFixed(6)}, ${coordsDestino.lng.toFixed(6)})<br>
                <strong>Distância da rota: ${distanciaRota} km</strong><br>
                <em>Distância em linha reta: ${distanciaLinhaReta} km</em><br>
                <strong>Tempo estimado: ${tempoEstimado} minutos</strong><br>
                <button onclick="abrirRotaNoMaps('${siteOrigem}', '${siteDestino}')" class="btn-rota">
                    <i class="fa fa-map-marker"></i> Abrir rota no mapa
                </button>
            `;
            
            resultadoElement.innerHTML = resultado;
        } else {
            throw new Error('Não foi possível calcular a rota');
        }
    } catch (error) {
        console.error('Erro ao calcular rota:', error);
        // Em caso de erro, mostrar apenas a distância em linha reta
        resultadoElement.innerHTML = `
            <div class="error">
                Não foi possível calcular a rota completa. Mostrando distância em linha reta...<br>
                <strong>Distância em linha reta:</strong><br>
                De: ${siteOrigem} (${coordsOrigem.lat.toFixed(6)}, ${coordsOrigem.lng.toFixed(6)})<br>
                Para: ${siteDestino} (${coordsDestino.lat.toFixed(6)}, ${coordsDestino.lng.toFixed(6)})<br>
                <strong>Distância: ${calcularDistancia(
                    coordsOrigem.lat, coordsOrigem.lng,
                    coordsDestino.lat, coordsDestino.lng
                )} km</strong>
            </div>
        `;
    }
}

// Função para abrir a rota no mapa (usando OpenStreetMap)
function abrirRotaNoMaps(siteOrigem, siteDestino) {
    const coordsOrigem = coordenadas[siteOrigem];
    const coordsDestino = coordenadas[siteDestino];
    
    if (coordsOrigem && coordsDestino) {
        // Usar OpenStreetMap para mostrar a rota
        const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${coordsOrigem.lat},${coordsOrigem.lng};${coordsDestino.lat},${coordsDestino.lng}`;
        window.open(url, '_blank');
    }
}

// Adicionar autocomplete para os campos de site
document.addEventListener('DOMContentLoaded', function() {
    // Configurar autocomplete para site de origem
    const siteOrigemInput = document.getElementById('site-origem');
    const dropdownOrigem = document.getElementById('dropdown-origem');
    
    siteOrigemInput.addEventListener('input', function() {
        const filter = this.value.toUpperCase();
        dropdownOrigem.innerHTML = '';
        
        if (filter.length >= 1) {
            for (const [site, coords] of Object.entries(coordenadas)) {
                if (site.includes(filter)) {
                    const div = document.createElement('div');
                    div.textContent = site;
                    div.addEventListener('click', function() {
                        siteOrigemInput.value = site;
                        dropdownOrigem.classList.remove('show');
                    });
                    dropdownOrigem.appendChild(div);
                }
            }
            dropdownOrigem.classList.add('show');
        } else {
            dropdownOrigem.classList.remove('show');
        }
    });
    
    // Configurar autocomplete para site de destino
    const siteDestinoInput = document.getElementById('site-destino');
    const dropdownDestino = document.getElementById('dropdown-destino');
    
    siteDestinoInput.addEventListener('input', function() {
        const filter = this.value.toUpperCase();
        dropdownDestino.innerHTML = '';
        
        if (filter.length >= 1) {
            for (const [site, coords] of Object.entries(coordenadas)) {
                if (site.includes(filter)) {
                    const div = document.createElement('div');
                    div.textContent = site;
                    div.addEventListener('click', function() {
                        siteDestinoInput.value = site;
                        dropdownDestino.classList.remove('show');
                    });
                    dropdownDestino.appendChild(div);
                }
            }
            dropdownDestino.classList.add('show');
        } else {
            dropdownDestino.classList.remove('show');
        }
    });
    
    // Fechar dropdowns quando clicar fora
    document.addEventListener('click', function(event) {
        if (!event.target.matches('#site-origem')) {
            dropdownOrigem.classList.remove('show');
        }
        if (!event.target.matches('#site-destino')) {
            dropdownDestino.classList.remove('show');
        }
    });
});


