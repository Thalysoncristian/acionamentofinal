# Sistema de Acionamento STTE

## Descrição
Sistema desenvolvido para gerenciamento e geração de informativos de acionamento para a STTE, facilitando o processo de registro e acompanhamento de ocorrências técnicas.

## Características Principais

### 1. Geração de Informativos
- Geração automática de informativos de acionamento
- Suporte a diferentes tipos de alarmes com SLAs específicos
- Cálculo automático de SLA baseado no tipo de alarme
- Formatação padronizada dos informativos

### 2. Tipos de Alarmes Suportados
- AFCA - FALHA DE ENERGIA (SLA 4H)
- ABAT - BATERIA EM DESCARGA (SLA 4H)
- AFRET - FALHA DE RETIFICADOR (SLA 24H)
- ADIF - FALHA DE FUSÍVEL (SLA 4H)
- AQDF - FALHA DE QUADRO DE FORÇA (SLA 4H)
- ABAL - FALHA DE BALIZAMENTO (SLA 24H)
- AOGMG - GMG EM OPERAÇÃO (SLA 4H)
- ACGMG - BAIXO NÍVEL DE COMBUSTÍVEL (SLA 4H)
- AFGMG - FALHA NO GMG (SLA 4H)
- ATEMP - ALTA TEMPERATURA (SLA 4H)
- ATRO - TROCADOR DE CALOR (SLA 4H)
- ARCON - FALHA DE AR-CONDICIONADO (SLA 4H)

### 3. Funcionalidades de Localização
- Busca automática de CN (Código de Núcleo) por estado
- Identificação automática de localidade baseada em coordenadas
- Suporte a coordenadas geográficas para sites cadastrados
- Mapeamento completo de estados brasileiros

### 4. Interface do Usuário
- Interface web responsiva e moderna
- Busca dinâmica de estações
- Campos condicionais para diferentes tipos de ocorrências
- Suporte a cópia rápida do informativo gerado
- Integração com ícones e estilos modernos (Font Awesome, Bootstrap)

### 5. Campos do Informativo
- Analista NOC
- Supervisor
- CN (Código de Núcleo)
- Estação
- Localidade
- Endereço
- UC (Unidade Consumidora)
- Alarme
- AMI
- INC
- Hora do Acionamento
- Previsão
- SLA
- Técnico Acionado

### 6. Recursos Técnicos
- Aplicação Web Progressiva (PWA)
- Service Worker para funcionamento offline
- Armazenamento local de dados
- Validação de formulários
- Tratamento de erros robusto

### 7. Segurança e Confiabilidade
- Validação de dados de entrada
- Tratamento de erros em todas as operações
- Backup automático de dados
- Proteção contra perda de dados

## Requisitos Técnicos
- Navegador web moderno com suporte a JavaScript
- Conexão com internet para funcionalidades online
- Suporte a Service Workers para funcionalidades offline

## Como Usar
1. Acesse a interface web do sistema
2. Preencha os campos necessários do formulário
3. Selecione o tipo de alarme apropriado
4. Clique em "Gerar" para criar o informativo
5. Use o botão "Copiar" para copiar o informativo para a área de transferência

## Suporte
Para suporte técnico ou dúvidas, entre em contato com a equipe de TI da STTE.
