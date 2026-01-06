# Formato de Dados para Roteiro Experimental de Coleta Agrícola com Interação por Voz

**Especificação Técnica v8.0**

6 de janeiro de 2026

---

## Objetivo

Especificar o formato de dados JSON para roteiros experimentais em coleta agrícola via voz, permitindo expressão de incerteza, condicionais booleanos, repetição de blocos de etapas com subetapas encapsuladas e operações executivas de sincronização.

---

## Conceitos Fundamentais

### Etapas

Uma etapa produz dados estruturados, classificados conforme sua inclusão no relatório final:

- **Coleta de dados**: etapa que gera dados para o relatório (listada em `etapasDeColeta`).
- **Confirmação operacional**: etapa que gera dados internos (confirmar, validar) que não aparecem no relatório final.
- **Operação executiva**: execução imediata sem interação adicional ou com sincronização (exemplos: GPS, foto, espera por confirmação).
- **Etapa iterada**: etapa que contém subetapas encapsuladas e pode ser repetida, gerando múltiplas instâncias de seus dados.

### Incerteza: Campo `possibilidades`

Cada coleta registra um nível de certeza:

| possibilidades | Significado |
|---|---|
| 1 | Operador tem certeza (seleção única) |
| N > 1 | Operador está incerto (múltiplas opções) |
| "N" (string) | Número desconhecido de possibilidades |

### Condições

- **dependência_valor**: compara valor coletado em etapa anterior (operadores: `igual`, `diferente`, `contém`).
- **dependência_certeza**: condiciona execução ao nível de certeza (`certeza: true` executa se `possibilidades == 1`).
- **sempre_executar**: etapa executada sem condição.
- **booleana**: combina múltiplas condições com operadores `e`, `ou`, `não`.

### Etapas Iteradas

Uma etapa iterada contém `subetapas` (objetos completos, não apenas IDs) que serão repetidas conforme a lógica de repetição. Um campo `etapasDeColeta` especifica quais subetapas geram dados no relatório final. Cada iteração produz um array de dados das subetapas selecionadas.

---

## Estrutura Principal

Um roteiro experimental contém:

```json
{
  "id": "EXP-YYYY-NNN",
  "nome": "...",
  "descricao": "...",
  "responsavel": { "nome": "...", "contato": "..." },
  "localizacao": { "fazenda": "...", "talhoes": [...] },
  "tiposDeDados": [ { "id": "TD*", "nome": "...", ... } ],
  "validadores": [ { "id": "VAL*", "regra": {...} } ],
  "etapas": [ { "id": "E*", "nome": "...", ... } ],
  "etapasDeColeta": ["E1", "E3", ...],
  "metadados": { "versao": "8.0", "criadoEm": "..." }
}
```

---

## Tipos de Dados

```json
"tiposDeDados": [
  {
    "id": "TD1",
    "nome": "Nome Legível",
    "descricao": "Descrição",
    "tipoBase": "texto|lista|imagem|numero|geolocation",
    "opcoes": ["opcao1", "opcao2"]
  }
]
```

---

## Validadores

```json
"validadores": [
  {
    "id": "VAL1",
    "nome": "Nome Legível",
    "regra": { "regex": "^[A-Z0-9]{6}$" },
    "mensagemErro": "Mensagem ao usuário"
  }
]
```

---

## Etapas

### Etapa de Coleta com Voz

```json
{
  "id": "E1",
  "nome": "Nome da Etapa",
  "descricao": "Descrição",
  "tipoDado": "TD1",
  "validadores": ["VAL1"],
  "promptVoz": {
    "texto": "Instrução inicial falada",
    "repeticaoConfirmacao": "Repete: {{tipoNome}}: {{valor}}. Correto?",
    "confirmacao": true
  }
}
```

### Operação Executiva

Executa uma operação predefinida imediatamente, sem coleta de dados ou com sincronização:

```json
{
  "id": "E2",
  "nome": "Captura de Geolocalização",
  "tipoDado": "TD5",
  "operacao": "captura_gps",
  "confirmacao": false
}
```

### Sincronização por Palavra de Ativação

Uma operação de sincronização é um tipo de `operacao` que aguarda uma palavra de ativação do operador antes de prosseguir para a próxima etapa. Ela não coleta dados, apenas sincroniza o fluxo da coleta com a prontidão do operador:

```json
{
  "id": "E3",
  "nome": "Aguardar Preparação",
  "descricao": "Sincronização antes de iniciar próxima fase",
  "operacao": "espera",
  "promptVoz": {
    "texto": "Você está pronto para a próxima etapa? Diga pronto quando estiver",
    "palavraAcao": "pronto",
    "confirmacao": false
  },
  "condicao": { "tipo": "sempre_executar" }
}
```

**Propriedades**:
- `operacao`: tipo de operação executiva (`"espera"` para sincronização por palavra de ativação).
- `promptVoz.palavraAcao`: palavra chave que o operador deve dizer para prosseguir.
- Não produz dados no relatório (operação operacional apenas).
- `confirmacao`: geralmente `false`, pois não há confirmação de valor a registrar.

**Valores de `operacao`**:
- `"captura_gps"`: captura coordenadas de geolocalização.
- `"captura_foto"`: dispara câmera para captura de imagem.
- `"espera"`: aguarda confirmação vocal do operador (palavra de ativação).

### Etapa Iterada (com Subetapas Encapsuladas)

```json
{
  "id": "E5",
  "nome": "Bloco de Repetição",
  "descricao": "Repetição de múltiplas observações",
  "subetapas": [
    {
      "id": "E5_1",
      "nome": "Coleta Primária",
      "tipoDado": "TD1",
      "validadores": ["VAL1"],
      "promptVoz": {
        "texto": "Primeiro dado?",
        "confirmacao": true
      }
    },
    {
      "id": "E5_2",
      "nome": "Coleta Secundária",
      "tipoDado": "TD2",
      "promptVoz": {
        "texto": "Segundo dado?",
        "confirmacao": true
      }
    }
  ],
  "etapasDeColeta": ["E5_1", "E5_2"],
  "repeticao": {
    "habilitada": true,
    "condicao": {
      "tipo": "validacao_usuario",
      "mensagem": "Deseja coletar nova observação?"
    }
  }
}
```

**Propriedades**:
- `subetapas`: array de objetos de etapa (definições completas, não IDs). Cada subetapa é definida uma única vez dentro do escopo da etapa iterada.
- `etapasDeColeta`: lista de IDs de subetapas cujos dados aparecerão no relatório final. Subetapas omitidas são operacionais.

Ao ser repetida n vezes, produz no relatório:

```json
"E5": [
  {
    "E5_1": { "valor": "...", "possibilidades": 1 },
    "E5_2": { "valor": "...", "possibilidades": 1 }
  },
  {
    "E5_1": { "valor": "...", "possibilidades": 1 },
    "E5_2": { "valor": "...", "possibilidades": 1 }
  }
]
```

---

## Condições

### Dependência de Valor

```json
"condicao": {
  "tipo": "dependencia_valor",
  "etapaReferencia": "E3",
  "operador": "contem",
  "valor": "Praga"
}
```

### Dependência de Certeza

```json
"condicao": {
  "tipo": "dependencia_certeza",
  "etapaReferencia": "E3",
  "certeza": true
}
```

### Condição Booleana

Combina múltiplas condições usando operadores lógicos:

```json
"condicao": {
  "tipo": "booleana",
  "operador": "e",
  "condicoes": [
    {
      "tipo": "dependencia_valor",
      "etapaReferencia": "E1",
      "operador": "contem",
      "valor": "Praga"
    },
    {
      "tipo": "dependencia_certeza",
      "etapaReferencia": "E2",
      "certeza": true
    }
  ]
}
```

**Operadores booleanos**:
- `e`: todas as condições devem ser verdadeiras.
- `ou`: ao menos uma condição deve ser verdadeira.
- `não`: nega a condição (aplicado a uma única condição).

---

## Repetição

```json
"repeticao": {
  "habilitada": true,
  "condicao": {
    "tipo": "validacao_usuario",
    "mensagem": "Deseja repetir?"
  }
}
```

---

## Interpolação de Variáveis

| Variável | Descrição |
|---|---|
| `{{tipoNome}}` | Nome do tipo de dado |
| `{{valor}}` | Valor coletado |
| `{{nomeEtapa}}` | Nome da etapa |

---

## Fluxo de Execução

1. Carregar e validar roteiro.
2. Para cada etapa:
   1. Verificar `condição` (incluindo booleanas).
   2. Se coleta com voz: exibir `promptVoz.texto`, capturar entrada, validar.
   3. Se operação executiva: executar imediatamente (GPS, foto) ou sincronizar (espera).
   4. Se etapa iterada: para cada iteração, executar subetapas conforme condição de repetição.
   5. Se `confirmacao == true`: repetir valor e aguardar confirmação.
   6. Registrar dados com `valor` e `possibilidades`.
3. Gerar relatório incluindo apenas etapas em `etapasDeColeta`.

---

## Exemplo: Roteiro de Detecção de Anomalias com Condições e Sincronização

Experimento com etapa iterada que encapsula suas subetapas, operação de sincronização entre fases, e execução condicional de coletas para doenças e pragas:

```json
{
  "id": "EXP-2026-ANOM-005",
  "nome": "Detecção de Anomalias com Condições e Sincronização",
  "descricao": "Roteiro com etapa iterada encapsulada, operação de sincronização, e coleta condicional de pragas ou doenças",
  
  "responsavel": {
    "nome": "Departamento de Fitopatologia",
    "contato": "contato@instituicao.br"
  },

  "localizacao": {
    "fazenda": "Fazenda Experimental",
    "municipio": "São Paulo",
    "estado": "SP",
    "coordenadas": { "lat": -23.5505, "lon": -46.6333 },
    "talhoes": [
      {
        "id": "TAL-A",
        "nome": "Talhão A",
        "area": "5 hectares",
        "parcelas": [
          {
            "id": "P-A1",
            "nome": "Parcela A1",
            "coordenadas": { "lat": -23.5500, "lon": -46.6330 }
          }
        ]
      }
    ]
  },

  "tiposDeDados": [
    {
      "id": "TD1",
      "nome": "Tipo de Anomalia",
      "tipoBase": "lista",
      "opcoes": ["Praga", "Doença"]
    },
    {
      "id": "TD2",
      "nome": "Pragas Aceitáveis",
      "tipoBase": "lista",
      "opcoes": ["Mosca-branca", "Ácaro-rajado", "Lagarta-do-cartucho", "Percevejo-castanho", "Outra"]
    },
    {
      "id": "TD3",
      "nome": "Doenças Aceitáveis",
      "tipoBase": "lista",
      "opcoes": ["Ferrugem", "Oídio", "Mancha-alvo", "Murcha", "Outra"]
    },
    {
      "id": "TD4",
      "nome": "Foto",
      "tipoBase": "imagem"
    },
    {
      "id": "TD5",
      "nome": "Localização",
      "tipoBase": "geolocation"
    }
  ],

  "validadores": [
    {
      "id": "VAL1",
      "nome": "Obrigatório",
      "regra": { "obrigatorio": true },
      "mensagemErro": "Campo obrigatório"
    }
  ],

  "etapas": [
    {
      "id": "E1",
      "nome": "Instrução Inicial",
      "descricao": "Sincroniza com operador antes de iniciar",
      "operacao": "espera",
      "promptVoz": {
        "texto": "Você está pronto para começar a coleta de anomalias? Diga pronto quando estiver posicionado na parcela",
        "palavraAcao": "pronto",
        "confirmacao": false
      },
      "condicao": { "tipo": "sempre_executar" }
    },
    {
      "id": "E2",
      "nome": "Repetição de Anomalias",
      "descricao": "Bloco iterado com subetapas encapsuladas e execução condicional para pragas e doenças",
      "subetapas": [
        {
          "id": "E2_1",
          "nome": "Tipo de Anomalia",
          "tipoDado": "TD1",
          "validadores": ["VAL1"],
          "promptVoz": {
            "texto": "A anomalia observada é uma praga ou uma doença?",
            "repeticaoConfirmacao": "Você respondeu {{valor}}. Correto?",
            "confirmacao": true
          }
        },
        {
          "id": "E2_2",
          "nome": "Identificar Praga",
          "tipoDado": "TD2",
          "validadores": ["VAL1"],
          "condicao": {
            "tipo": "dependencia_valor",
            "etapaReferencia": "E2_1",
            "operador": "contem",
            "valor": "Praga"
          },
          "promptVoz": {
            "texto": "Qual praga foi observada?",
            "repeticaoConfirmacao": "Você mencionou {{valor}}. Confirmar?",
            "confirmacao": true
          }
        },
        {
          "id": "E2_3",
          "nome": "Identificar Doença",
          "tipoDado": "TD3",
          "validadores": ["VAL1"],
          "condicao": {
            "tipo": "dependencia_valor",
            "etapaReferencia": "E2_1",
            "operador": "contem",
            "valor": "Doença"
          },
          "promptVoz": {
            "texto": "Qual doença foi observada?",
            "repeticaoConfirmacao": "Você mencionou {{valor}}. Confirmar?",
            "confirmacao": true
          }
        },
        {
          "id": "E2_4",
          "nome": "Foto da Anomalia",
          "tipoDado": "TD4",
          "operacao": "captura_foto",
          "condicao": { "tipo": "sempre_executar" },
          "promptVoz": {
            "texto": "Diga capturar para fotografar a anomalia",
            "palavraAcao": "capturar",
            "confirmacao": true
          }
        }
      ],
      "etapasDeColeta": ["E2_1", "E2_2", "E2_3", "E2_4"],
      "repeticao": {
        "habilitada": true,
        "condicao": {
          "tipo": "validacao_usuario",
          "mensagem": "Mais anomalias?"
        }
      }
    },
    {
      "id": "E3",
      "nome": "Preparação Final",
      "descricao": "Sincroniza antes de registrar GPS final",
      "operacao": "espera",
      "promptVoz": {
        "texto": "Você explorou toda a parcela? Diga pronto para registrar a localização final",
        "palavraAcao": "pronto",
        "confirmacao": false
      },
      "condicao": { "tipo": "sempre_executar" }
    },
    {
      "id": "E4",
      "nome": "Geolocalizacao Final",
      "tipoDado": "TD5",
      "operacao": "captura_gps",
      "condicao": { "tipo": "sempre_executar" },
      "confirmacao": false
    }
  ],

  "etapasDeColeta": ["E2", "E4"],

  "metadados": {
    "versao": "8.0",
    "criadoEm": "2026-01-06",
    "ultimaAtualizacao": "2026-01-06"
  }
}
```

### Exemplo de Interação com Operador (Execução Condicional e Sincronização)

A seguir, um exemplo de diálogo durante a execução do roteiro com condições e operações de sincronização:

```
[Roteiro iniciado]

[Etapa E1: Operação de Sincronização]

SISTEMA: "Você está pronto para começar a coleta de anomalias? Diga pronto quando estiver posicionado na parcela"

OPERADOR: [Caminha até a parcela]

OPERADOR: "Pronto"
[OPERACAO EXECUTIVA: E1 sincronizado - prossegue para próxima etapa]

[Etapa E2, primeira iteração]

SISTEMA: "A anomalia observada é uma praga ou uma doença?"
OPERADOR: "Praga"
[COLETA: E2_1 - Tipo de Anomalia = "Praga", possibilidades = 1]

SISTEMA: "Você respondeu Praga. Correto?"
OPERADOR: "Sim"

[Etapa E2_2 executada - Identificar Praga (E2_3 é pulada por condição não atendida)]

SISTEMA: "Qual praga foi observada?"
OPERADOR: "Mosca-branca"
[COLETA: E2_2 - Pragas Aceitáveis = "Mosca-branca", possibilidades = 1]

SISTEMA: "Você mencionou Mosca-branca. Confirmar?"
OPERADOR: "Sim"

SISTEMA: "Diga capturar para fotografar a anomalia"
OPERADOR: "Capturar"
[OPERACAO EXECUTIVA: Câmera disparada]
[COLETA: E2_4 - Foto = "foto_20260106_103000.jpg", possibilidades = 1]

SISTEMA: "Foto registrada. Mais anomalias?"
OPERADOR: "Sim"

[Etapa E2, segunda iteração]

SISTEMA: "A anomalia observada é uma praga ou uma doença?"
OPERADOR: "Doença"
[COLETA: E2_1 - Tipo de Anomalia = "Doença", possibilidades = 1]

SISTEMA: "Você respondeu Doença. Correto?"
OPERADOR: "Sim"

[Etapa E2_2 é pulada (condição não atendida) - E2_3 é executada]

SISTEMA: "Qual doença foi observada?"
OPERADOR: "Ferrugem ou Oídio, não tenho certeza"
[COLETA: E2_3 - Doenças Aceitáveis = ["Ferrugem", "Oídio"], possibilidades = 2]

SISTEMA: "Você mencionou Ferrugem, Oídio. Confirmar?"
OPERADOR: "Confirma"

SISTEMA: "Diga capturar para fotografar a anomalia"
OPERADOR: "Capturar"
[OPERACAO EXECUTIVA: Câmera disparada]
[COLETA: E2_4 - Foto = "foto_20260106_103100.jpg", possibilidades = 1]

SISTEMA: "Foto registrada. Mais anomalias?"
OPERADOR: "Não"

[Etapa E3: Operação de Sincronização Final]

SISTEMA: "Você explorou toda a parcela? Diga pronto para registrar a localização final"

OPERADOR: [Retorna à posição inicial]

OPERADOR: "Pronto"
[OPERACAO EXECUTIVA: E3 sincronizado - prossegue para GPS]

[Etapa E4: GPS automático]

[OPERACAO EXECUTIVA: GPS capturado]
[COLETA: E4 - Localização = {"lat":-23.5500,"lon":-46.6330}, possibilidades = 1]

[Roteiro finalizado]

SISTEMA: "Coleta finalizada. Dados salvos com sucesso."
```

**Notação utilizada**:
- **SISTEMA**: prompts de voz sintética do roteiro.
- **OPERADOR**: entrada de voz do operador em campo.
- **[COLETA: ...]**: registro de dados coletados (etapa, valor, possibilidades).
- **[OPERACAO EXECUTIVA: ...]**: execução de operação (GPS, foto, sincronização).
- **[Etapa Xx_y é pulada (condição não atendida)]**: indica que a etapa não foi executada porque sua condição não foi satisfeita.

### Dados no Relatório Final

Após a conclusão do roteiro, o relatório final contém apenas as subetapas cujos dados foram coletados (operações de sincronização não aparecem pois são operacionais):

```json
{
  "E2": [
    {
      "E2_1": {
        "valor": "Praga",
        "possibilidades": 1,
        "timestamp": "2026-01-06T10:30:00Z"
      },
      "E2_2": {
        "valor": "Mosca-branca",
        "possibilidades": 1,
        "timestamp": "2026-01-06T10:30:30Z"
      },
      "E2_4": {
        "valor": "foto_20260106_103000.jpg",
        "possibilidades": 1,
        "timestamp": "2026-01-06T10:30:45Z"
      }
    },
    {
      "E2_1": {
        "valor": "Doença",
        "possibilidades": 1,
        "timestamp": "2026-01-06T10:31:00Z"
      },
      "E2_3": {
        "valor": ["Ferrugem", "Oídio"],
        "possibilidades": 2,
        "timestamp": "2026-01-06T10:31:30Z"
      },
      "E2_4": {
        "valor": "foto_20260106_103100.jpg",
        "possibilidades": 1,
        "timestamp": "2026-01-06T10:31:45Z"
      }
    }
  ],
  "E4": {
    "valor": { "lat": -23.5500, "lon": -46.6330 },
    "possibilidades": 1,
    "timestamp": "2026-01-06T10:32:00Z"
  }
}
```

**Observações**:
- E2 é um array de duas iterações (duas anomalias foram registradas).
- Na primeira iteração, apenas E2_1 (tipo), E2_2 (praga) e E2_4 (foto) aparecem. E2_3 (doença) foi pulada pois a condição não foi atendida.
- Na segunda iteração, apenas E2_1 (tipo), E2_3 (doença) e E2_4 (foto) aparecem. E2_2 (praga) foi pulada pois a condição não foi atendida.
- Operações de sincronização (E1 e E3 com `operacao: "espera"`) não geram dados no relatório - são puramente operacionais.
- E4 é uma coleta única de GPS (após todas as iterações de E2).
- Timestamps registram o momento exato de cada coleta.

**Benefícios da abordagem com condições e sincronização**:
- Subetapas são *declaradas uma única vez* dentro da etapa iterada pai.
- **Execução condicional** reduz para o operador apenas as perguntas relevantes.
- **Operações de sincronização** (tipo de operação executiva) sincronizam o fluxo da coleta com a prontidão do operador no campo.
- Dados no relatório refletem apenas o que foi realmente coletado.
- Campo `etapasDeColeta` dentro da etapa iterada controla quais subetapas geram dados no relatório.
- Estrutura hierárquica clara e encapsulada com lógica condicional e sincronização.

---

## Resumo Executivo

### Estrutura de Roteiro

Um **roteiro experimental** é um documento JSON que descreve o fluxo de coleta de dados em campo via voz. Composto por:

- **Metadados**: ID, nome, responsável, localização (fazenda, talhões, parcelas).
- **Tipos de Dados**: definições reutilizáveis (lista, texto, imagem, GPS).
- **Validadores**: regras de validação genéricas (regex, obrigatoriedade).
- **Etapas**: sequência ordenada de coletas, operações executivas e blocos iterados.
- **etapasDeColeta**: lista que especifica quais etapas geram dados para o relatório final.

### Quatro Tipos de Etapas

1. **Coleta com voz**: exibe prompt, captura entrada, valida, confirma, registra com nível de certeza.
2. **Operação executiva**: executa imediatamente (exemplos: GPS, foto, sincronização com espera).
3. **Confirmação operacional**: valida dados; registra internamente mas não aparece no relatório final.
4. **Etapa iterada**: contém subetapas encapsuladas que são repetidas; cada iteração produz um array no relatório.

### Operações Executivas

Operações executivas executam operações predefinidas imediatamente ou sincronizam o fluxo sem coleta de dados:

| `operacao` | Descrição | Produz Dados |
|---|---|---|
| `captura_gps` | Captura coordenadas de geolocalização | Sim |
| `captura_foto` | Dispara câmera para captura de imagem | Sim |
| `espera` | Aguarda palavra de ativação do operador | Não |

### Etapas Iteradas: Encapsulamento

Uma etapa iterada (com `subetapas`) pode ser repetida múltiplas vezes. As subetapas são **definidas uma única vez** dentro do escopo da etapa iterada:

```json
"E2": {
  "subetapas": [
    { "id": "E2_1", ... },
    { "id": "E2_2", ... }
  ],
  "etapasDeColeta": ["E2_1", "E2_2"]
}
```

No relatório final, cada iteração produz um array:

```json
"E2": [
  { "E2_1": {...}, "E2_2": {...} },
  { "E2_1": {...}, "E2_2": {...} }
]
```

### Incerteza e Condicionamento Booleano

Cada coleta registra `possibilidades` (1 = certeza; N > 1 = incerteza). Etapas posteriores podem ser condicionadas via:

- **dependência_valor**: "se valor de E3 contém X".
- **dependência_certeza**: "se E3 foi certo (possibilidades == 1)".
- **booleana**: combina múltiplas condições com operadores `e`, `ou`, `não`.
- **sempre_executar**: sem condição.

### Fluxo Típico com Condições e Sincronização

O operador percorre as etapas sequencialmente. Para cada etapa:

1. Sistema verifica condição (booleana ou simples).
2. Se condição atendida:
   1. Coleta com voz: exibir prompt, capturar entrada, confirmar.
   2. Operação executiva: executar (GPS, foto) ou sincronizar (espera por palavra de ativação).
   3. Etapa iterada: repetir subetapas (definidas internamente) até cancelamento.
3. **Se não atendida: pular etapa silenciosamente** (não aparece no relatório).
4. Registrar dados com timestamp e nível de certeza.
5. Ao fim: gerar relatório incluindo apenas etapas em `etapasDeColeta` (global e dentro de etapas iteradas).

---

**Documento finalizado** | v8.0 | 6 de janeiro de 2026
