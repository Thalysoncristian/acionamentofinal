    // Função para gerar o acionamento
    async function gerarAcionamento() {
        const site = document.getElementById("site-search").value.toUpperCase() || "";
        const uc = document.getElementById("uc").value || "";
        const endereco = document.getElementById("endereco").value || "";
        const protocolo = document.getElementById("protocolo").value.toUpperCase() || "";
        const atendente = document.getElementById("atendente").value.toUpperCase() || "";
        const horaData = new Date().toLocaleString('pt-BR');
        
        const coordenadas = {
            "AM0001F": {
                "lat": -3.08483,
                "lng": -60.072408
            },
            "AM0001R": {
                "lat": -3.102108,
                "lng": -59.943767
            },
            "PABLM50": {
                "lat": -1.351389,
                "lng": -48.433611
            },
            "RRSZW90": {
                "lat": 1.18219,
                "lng": -60.1909
            },
            "RRTIM01": {
                "lat": -1.411111,
                "lng": -60.673028
            }, 
            "RRURM01": {
                "lat": 4.595861,
                "lng": -60.164167
            },
            "RRURM02": {
                "lat": 4.415824,
                "lng": -60.078167
            },
            "RRURM03": {
                "lat": 4.737228,
                "lng": -60.361333
            },
            "RRVIV01": {
                "lat": 2.828334,
                "lng": -60.676342
            },
            "RRVIV02": {
                "lat": 2.828611,
                "lng": -60.675833
            },
            "RRVIV03": {
                "lat": 2.82308,
                "lng": -60.673442
            }
        };
        
        const coords = coordenadas[site];
        let cidadeTexto = "";
        if (coords) {
            const cidade = await identificarCidade(coords.lat, coords.lng);
            cidadeTexto = `\nCIDADE: ${cidade}`;
        }

        let resultado = `INFORMATIVO DE PROTOCOLO\nSITE: ${site}\nUC: ${uc}\nENDEREÇO: ${endereco}${cidadeTexto}\nPROTOCOLO: ${protocolo}\nATENDENTE: ${atendente}\nHORA E DATA: ${horaData}`;

        document.getElementById("resultado").innerText = resultado.trim();
    }

    // Função para copiar o acionamento gerado
    function copiarAcionamento() {
        const resultado = document.getElementById("resultado").innerText;
        navigator.clipboard.writeText(resultado);
        alert("Acionamento copiado para a área de transferência!");
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
                    div.addEventListener('click', function() {
                        document.getElementById('site-search').value = optionText;
                        dropdownContent.classList.remove('show');
                        preencherDados(options[i].value);
                    });
                    dropdownContent.appendChild(div);
                }
            }
            dropdownContent.classList.add('show');
        } else {
            dropdownContent.classList.remove('show');
        }
    });

    // Função para preencher dados de UC e Endereço
    function preencherDados(value) {
        const select = document.getElementById('site');
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                const dados = select.options[i].value.split('*');
                document.getElementById('uc').value = dados[1];
                document.getElementById('endereco').value = dados[2];
                found = true;
                break;
            }
        }
        if (found) {
            document.getElementById('rotasButton').style.display = 'block';
        } else {
            document.getElementById('uc').value = '';
            document.getElementById('endereco').value = '';
            document.getElementById('rotasButton').style.display = 'none';
        }
    }

    // Função para abrir o Google Maps com as coordenadas do KML
    function abrirGoogleMaps() {
        const coordenadas = {
            "AM0001F": {
                "lat": -3.08483,
                "lng": -60.072408
            },
            "AM0001R": {
                "lat": -3.102108,
                "lng": -59.943767
            },
            "PABLM50": {
                "lat": -1.351389,
                "lng": -48.433611
            },
            "RRSZW90": {
                "lat": 1.18219,
                "lng": -60.1909
            },
            "RRTIM01": {
                "lat": -1.411111,
                "lng": -60.673028
            }, 
            "RRURM01": {
                "lat": 4.595861,
                "lng": -60.164167
            },
            "RRURM02": {
                "lat": 4.415824,
                "lng": -60.078167
            },
            "RRURM03": {
                "lat": 4.737228,
                "lng": -60.361333
            },
            "RRVIV01": {
                "lat": 2.828334,
                "lng": -60.676342
            },
            "RRVIV02": {
                "lat": 2.828611,
                "lng": -60.675833
            },
            "RRVIV03": {
                "lat": 2.82308,
                "lng": -60.673442
            }
        };

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

    // Adiciona a chamada para limparCampos antes de preencher novos dados
    document.getElementById('site-search').addEventListener('input', function() {
        limparCampos();
        const searchValue = this.value.toLowerCase();
        const select = document.getElementById('site');
        const dropdownContent = document.getElementById('dropdown-content');
        dropdownContent.innerHTML = '';

        if (searchValue.length >= 1) {
            for (let i = 0; i < select.options.length; i++) {
                const option = select.options[i];
                if (option.text.toLowerCase().includes(searchValue)) {
                    const div = document.createElement('div');
                    div.textContent = option.text;
                    div.addEventListener('click', function() {
                        document.getElementById('site-search').value = option.text;
                        dropdownContent.classList.remove('show');
                        preencherDados(option.value);
                    });
                    dropdownContent.appendChild(div);
                }
            }
            dropdownContent.classList.add('show');
        } else {
            dropdownContent.classList.remove('show');
        }
    });

    async function identificarCidade(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
            const data = await response.json();
            
            // Tenta obter a cidade (municipality, city ou town)
            const cidade = data.address.municipality || data.address.city || data.address.town || data.address.village;
            const estado = data.address.state || '';
            
            if (cidade) {
                return `${cidade}/${estado}`;
            } else {
                return data.display_name.split(',')[0];
            }
        } catch (error) {
            console.error('Erro ao identificar cidade:', error);
            return "Localização não identificada";
        }
    }


