export interface Perito {
  id: string;
  user_id: string;
  nome: string;
}

export interface Juiz {
  id: string;
  user_id: string;
  nome: string;
}

export interface TextoPadrao {
  id: string;
  titulo: string;
  texto: string;
}

export interface TextoPadraoDB {
  id: string;
  user_id: string;
  category: string;
  title: string;
  text: string;
}

export interface Profile {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  organization: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
    id: string;
    email: string;
    role: string;
    full_name: string | null;
    phone: string | null;
    organization: string | null;
}

export interface Testemunha {
  id: string;
  nome: string;
  cpf: string;
  endereco: string;
}

export interface Estudante {
  id: string;
  nome: string;
  cpf: string;
  faculdade: string;
  periodo: string;
}

export interface Reclamante {
  id:string;
  nome: string;
  comparecimento: string;
  advogado: string;
}

export interface Reclamada {
  id: string;
  nome: string;
  representante: string;
  advogado: string;
}


export enum SectionInputMode {
  MANUAL = 'MANUAL',
  PASTE = 'PASTE',
  DEFAULT = 'DEFAULT',
}

export enum ConciliacaoStatus {
  ACEITA = 'ACEITA',
  REJEITADA = 'REJEITADA',
  PREJUDICADA = 'PREJUDICADA',
}

export enum ReplicaPrazo {
  INICIAL = 'INICIAL',
  UNA = 'UNA',
  PERICIA = 'PERICIA',
  NAO_SE_APLICA = 'NAO_SE_APLICA',
  PERSONALIZADO = 'PERSONALIZADO',
}

export enum ContestacaoTipo {
  ESCRITA = 'ESCRITA',
  ORAL = 'ORAL',
  SEM_CONTESTACAO = 'SEM_CONTESTACAO',
  PERSONALIZADO = 'PERSONALIZADO',
}

export enum AtosProcessuaisOpcao {
  INICIAL = 'A',
  PERICIA_MEDICA = 'B',
  PERICIA_INSALUBRIDADE = 'C',
  PERICIA_CONTABIL = 'D',
  GRAVACAO = 'E',
  LIVRE = 'F',
  MATERIA_DIREITO = 'G',
  ADIAMENTO_FRACIONAMENTO = 'H',
  SUSPENSAO_PEJOTIZACAO = 'I',
}

export interface AtaData {
  preencherDadosIniciais: boolean;

  // 1. Header
  headerMode: SectionInputMode;
  headerPastedText: string;
  dataAudiencia: string;
  varaTrabalho: string;
  juizNome: string;
  tipoAcao: string;
  numeroProcesso: string;
  incluirParagrafoIntrodutorio: boolean;

  // 2. Abertura
  aberturaMode: SectionInputMode;
  aberturaPastedText: string;
  aberturaHora: string;
  participacaoVideoconferencia: boolean;

  // 3. Reclamante
  reclamanteMode: SectionInputMode;
  reclamantePastedText: string;
  reclamantes: Reclamante[];


  // 4. Reclamada
  reclamadaMode: SectionInputMode;
  reclamadaPastedText: string;
  reclamadas: Reclamada[];

  // Estudantes
  estudanteMode: SectionInputMode;
  estudantePastedText: string;
  estudantes: Estudante[];

  // 6. Conciliação
  conciliacaoStatus?: ConciliacaoStatus;
  conciliacaoTermos: string;

  // 7. Contestação
  contestacaoTipo?: ContestacaoTipo;
  contestacaoTexto: string;
  
  // 7.1 Réplica
  replicaPrazo?: ReplicaPrazo;
  replicaTexto: string;

  // Free text observations
  observacoesGerais: string;

  // 8. Atos Processuais
  atosProcessuaisOpcoes: AtosProcessuaisOpcao[];
  orderedAtos: AtosProcessuaisOpcao[];
  livreTextoPosicao: 'antes' | 'depois';
  
  // 8A
  instrucaoData: string;
  instrucaoHora: string;

  // 8B
  periciaMedicaPerito: string;
  periciaMedicaDoenca: string;
  periciaMedicaContatoReclamante: string;
  periciaMedicaContatoAdvogado: string;
  periciaMedicaContatoReclamada: string;
  periciaMedicaEmailReclamada: string;

  // 8C
  periciaInsalubridadePerito: string;
  periciaInsalubridadeTipo: string;
  periciaInsalubridadeContatoReclamante: string;
  periciaInsalubridadeContatoAdvogado: string;
  periciaInsalubridadeContatoReclamada: string;

  // 8D
  periciaContabilPerito: string;

  // 8E
  gravacaoTopicos: string;
  gravacaoTestemunhasReclamante: Testemunha[];
  gravacaoTestemunhasReclamada: Testemunha[];
  gravacaoSemTestemunhasReclamante: boolean;
  gravacaoSemTestemunhasReclamada: boolean;
  contraditaTexto: string;
  gravacaoRazoesFinais: string;
  gravacaoRazoesFinaisTexto: string;

  // 8F
  livreTexto: string;
  
  // 8H
  adiamentoMotivo: string;
  adiamentoData: string;
  adiamentoHora: string;

  // 10. Encerramento
  encerramentoHora: string;
  textoLivreEncerramento: string;
}