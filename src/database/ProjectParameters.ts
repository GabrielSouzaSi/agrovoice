export interface Responsavel {
    nome: string;
    contato: string;
}

export interface Coordenadas {
    lat: number;
    lon: number;
}

export interface Parcela {
    id: string;
    nome: string;
    coordenadas: Coordenadas;
}

export interface Talhao {
    id: string;
    nome: string;
    area: string;
    parcelas: Parcela[];
}

export interface Localizacao {
    fazenda: string;
    municipio: string;
    estado: string;
    coordenadas: Coordenadas;
    talhoes: Talhao[];
}

export interface TipoDado {
    id: string;
    nome: string;
    tipoBase: string;
    opcoes?: string[];
}

export interface Validador {
    id: string;
    nome: string;
    regra: { obrigatorio: boolean };
    mensagemErro: string;
}

export interface PromptVoz {
    texto: string;
    palavraAcao?: string;
    confirmacao: boolean;
    repeticaoConfirmacao?: string;
}

export interface Condicao {
    tipo: string;
    etapaReferencia?: string;
    operador?: string;
    valor?: string;
    mensagem?: string;
}

export interface Repeticao {
    habilitada: boolean;
    condicao: Condicao;
}

export interface Etapa {
    id: string;
    nome: string;
    descricao?: string;
    operacao?: string;
    promptVoz?: PromptVoz;
    condicao?: Condicao;
    tipoDado?: string;
    validadores?: string[];
    subetapas?: Etapa[];
    etapasDeColeta?: string[];
    repeticao?: Repeticao;
    confirmacao?: boolean;
}

export interface Metadados {
    versao: string;
    criadoEm: string;
    ultimaAtualizacao: string;
}

export interface ProjectConfig {
    id: string;
    nome: string;
    descricao: string;
    responsavel: Responsavel;
    localizacao: Localizacao;
    tiposDeDados: TipoDado[];
    validadores: Validador[];
    etapas: Etapa[];
    etapasDeColeta: string[];
    metadados: Metadados;
}

class ProjectParameters {
    private static instance: ProjectParameters;
    private config: ProjectConfig;

    private constructor() {
        this.config = {
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
        };
    }

    public static getInstance(): ProjectParameters {
        if (!ProjectParameters.instance) {
            ProjectParameters.instance = new ProjectParameters();
        }
        return ProjectParameters.instance;
    }

    public getConfig(): ProjectConfig {
        return this.config;
    }

    public getStepById(id: string): Etapa | undefined {
        const findStep = (steps: Etapa[]): Etapa | undefined => {
            for (const step of steps) {
                if (step.id === id) return step;
                if (step.subetapas) {
                    const found = findStep(step.subetapas);
                    if (found) return found;
                }
            }
            return undefined;
        };
        return findStep(this.config.etapas);
    }

    public getDataTypeById(id: string): TipoDado | undefined {
        return this.config.tiposDeDados.find(td => td.id === id);
    }
}

export default ProjectParameters;
