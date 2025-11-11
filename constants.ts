
import { AtosProcessuaisOpcao, ReplicaPrazo, ContestacaoTipo } from './types';

export const STEPS = [
  "Início",
  "Cabeçalho",
  "Abertura",
  "Partes",
  "Instalação",
  "Conciliação",
  "Contestação e Réplica",
  "Atos Processuais",
  "Encerramento",
  "Finalizar",
];

export const REPLICA_TEXTS: Record<ReplicaPrazo, string> = {
  [ReplicaPrazo.INICIAL]: "Pela ordem, o Juízo deferiu à parte autora o prazo até 01 dia antes da próxima audiência para manifestação sobre defesa e documentos, independentemente de notificação.",
  [ReplicaPrazo.UNA]: "Pelo Juízo, foi deferido, por conta da celeridade processual, sem prejuízo para o desenvolvimento regular do processo, o prazo de 02 dias úteis para a parte reclamante se manifestar sobre defesa e documentos na oportunidade das razões finais em memoriais, caso queira.",
  [ReplicaPrazo.PERICIA]: "Defiro à parte autora o prazo de 10 dias para manifestação sobre defesa e documentos, independentemente de notificação.",
  [ReplicaPrazo.NAO_SE_APLICA]: "",
  [ReplicaPrazo.PERSONALIZADO]: "",
};

export const CONTESTACAO_TEXTS: Record<ContestacaoTipo, string> = {
    [ContestacaoTipo.ESCRITA]: "Contestação escrita, dada por lida, e juntada aos autos com documentos",
    [ContestacaoTipo.ORAL]: "Contestação oral",
    [ContestacaoTipo.SEM_CONTESTACAO]: "Sem contestação",
    [ContestacaoTipo.PERSONALIZADO]: "",
};


export const ATOS_PROCESSUAIS_OPTIONS = [
    { id: AtosProcessuaisOpcao.INICIAL, icon: '📅', title: 'Designar Instrução', description: 'Marcar nova audiência de instrução.' },
    { id: AtosProcessuaisOpcao.PERICIA_MEDICA, icon: '🏥', title: 'Perícia Médica', description: 'Doença Ocupacional.' },
    { id: AtosProcessuaisOpcao.PERICIA_INSALUBRIDADE, icon: '⚠️', title: 'Perícia Insalub./Peric.', description: 'Adicional de Insalubridade ou Periculosidade.' },
    { id: AtosProcessuaisOpcao.PERICIA_CONTABIL, icon: '💰', title: 'Perícia Contábil', description: 'Questões financeiras e contábeis.' },
    { id: AtosProcessuaisOpcao.GRAVACAO, icon: '🎥', title: 'Gravação de Instrução', description: 'Audiência com depoimentos gravados.' },
    { id: AtosProcessuaisOpcao.ADIAMENTO_FRACIONAMENTO, icon: '🗓️', title: 'Adiamento/Fracionamento', description: 'Adiar ou fracionar a audiência por determinação do juízo.' },
    { id: AtosProcessuaisOpcao.SUSPENSAO_PEJOTIZACAO, icon: '⏸️', title: 'Suspensão (Pejotização)', description: 'Suspender o processo devido à decisão do STF sobre pejotização.' },
    { id: AtosProcessuaisOpcao.LIVRE, icon: '✍️', title: 'Outras Ocorrências', description: 'Situações não previstas e texto livre.' },
    { id: AtosProcessuaisOpcao.MATERIA_DIREITO, icon: '⚖️', title: 'Encerramento (Matéria de Direito)', description: 'Julgamento antecipado por matéria de direito e prova documental.' },
];

export const FREE_TEXT_TEMPLATES = {
    "Questões de Competência": [
        { title: "EXCEÇÃO DE INCOMPETÊNCIA EM PEÇA APARTADA", text: "A reclamada xxx apresenta a exceção de incompetência relativa de Id fd66226, como Habilitação. \nAcontece que o art. 800, caput, da CLT, que foi alterado pela Reforma Trabalhista, preceitua que a exceção de incompetência deve que ser apresentada em peça que \"sinalize a existência desta exceção\", no prazo de cinco dias a contar da notificação, antes da audiência. \nA nova redação do referido artigo, portanto, é clara e expressa quanto à necessidade da apresentação da exceção da incompetência territorial em peça apartada, no quinquídio contado da notificação da parte e antes da audiência. \nDesse modo, a exceção de incompetência relativa possui prazo próprio, que deve ser observado pela parte demandada e alegada em peça própria e autônoma, e não como preliminar de contestação, sob pena de prorrogação da competência. \nEm razão disso, que deixo de conhecer a exceção de incompetência relativa." },
    ],
    "Questões Processuais": [
        { title: "AUSÊNCIA DE PARTE RECLAMANTE", text: "Ausente a parte reclamante, embora ciente. A parte reclamada requereu o arquivamento do feito, o que foi deferido pelo Juízo, nos termos do art. 844 da CLT." },
        { title: "AUSÊNCIA DO RECLAMANTE – ARQUIVAMENTO", text: "Decretou-se o ARQUIVAMENTO: Tendo em vista a ausência injustificada do reclamante, determino o ARQUIVAMENTO DA RECLAMATÓRIA, NOS TERMOS DO ARTIGO 844 DA CLT. \nCustas no importe de R$XXXXX, calculadas sobre o valor de R$ XXXXX, atribuído à causa, pela parte autora, sendo dispensado o seu recolhimento neste processo, mas mantido o seu recolhimento como condição de procedibilidade de uma nova reclamação. \n\nDecorrido o prazo de 15 dias úteis, sem justificativa do reclamante,\narquivem-se os autos.\nPartes presentes cientes.\nAudiência encerrada às xx:xx." },
        { title: "ENCERRAMENTO DE INSTRUÇÃO - AUSÊNCIA DO RECLAMANTE", text: "Declara o juízo o estado de contumácia do reclamante, na forma da Súmula nº 74 do TST, cujos efeitos serão analisados em sentença.\nSem mais provas a produzir pela parte reclamada.\nRazões finais reiterativas do reclamado.\nPrejudicada as razões finais do reclamante, bem como a proposta de Conciliação.\nAutos seguem conclusos para sentença. Proferida a sentença, as partes serão intimadas na forma legal.\nPartes presentes cientes.\nAudiência encerrada às xx:xx." },
        { title: "AUSÊNCIA DE PARTE RECLAMADA", text: "Ausente a parte reclamada, embora ciente. A parte reclamante requereu a aplicação da revelia e confissão quanto à matéria de fato, o que será analisado em sentença." },
        { title: "AUSÊNCIA DO RECLAMADO: REVELIA", text: "pegar texto no sistema e colocar o ID da notificação\n\nO Juízo encerrou a instrução.\nRazões finais remissivas pelo reclamante.\nPrejudicada as razões finais da reclamada bem como a derradeira proposta de conciliação.\nAutos seguem conclusos para sentença. \nProferida a sentença as partes serão intimadas na forma legal. \nPartes presentes cientes.\nAudiência encerrada às xx:xx." },
        { title: "PEDIDO DE ADIAMENTO", text: "A parte [RECLAMANTE/RECLAMADA] requereu o adiamento da audiência pelo motivo de [MOTIVO]. A parte contrária concordou/discordou. O Juízo DEFERIU/INDEFERIU o pedido." },
        { title: "NOTIFICAÇÃO FORA DO PRAZO LEGAL", text: "PELA ORDEM, observou o Juízo que os reclamados não foram notificados dentro do prazo legal, razão pela qual a audiência foi adiada para a data\nabaixo designada.\nAdio a audiência para o dia [DATA], às [HORA], quando as partes deverão comparecer, sob as penas do arts. 844 e 852-A da CLT;\n\nCientes os presentes.\nAudiência encerrada às [HORA].\nNada mais." },
        { title: "DESIGNAR ENCERRAMENTO DA INSTRUÇÃO", text: "Designada audiência para ENCERRAMENTO DA INSTRUÇÃO TELEPRESENCIAL para o dia xx/xx/202x às xx:xx, facultando-se a presença das partes e seus procuradores e juntada de razões finais em memoriais, não sendo apresentadas razões finais, serão consideradas remissivas." },
        { title: "HABILITAÇÃO DE HERDEIROS NO PROCESSO", text: "Pelo Juízo, foi determinada a diligência pela Secretaria da Vara junto ao sistema PREVJUD, com o fim de identificar dependentes econômicos do empregado falecido, Sr xxxx, junto ao INSS, em eventual benefício de pensão por morte. A diligência se faz necessária pois o espólio do Sr xxxxx se apresenta representado por xxxxxxxxx, sob a afirmação de inexistência de cônjuge, filhos e outros herdeiros na linha direta e vertical sucessória ascendente ou descendentes." },
        { title: "HABILITAÇÃO DE HERDEIROS NO PROCESSO (SUPRIDA)", text: " Pelo Juízo, foi suprida a omissão judicial em relação ao pronunciamento de habilitação dos herdeiros necessários trabalhistas acima identificadas, com base nos documentos requisitados pelo Juízo colacionados na manifestação de idxxxx , com fulcro na Lei 6.858 de 24 de novembro de 1980, considerando a inexistência de dependentes econômicos habilitados junto ao INSS e apenas a indicação de sucessores maiores de idade, os quais acordam em nomearxxxxxxx com a inventariante \"ad hoc\" neste processo, para o fim de representação processual de todos os demais herdeiros, a saber:" },
        { title: "HOMOLOGAÇÃO HERDEIROS – HABILITADOS", text: "Pelo Juízo, foi homologada a habilitação dos herdeiros necessários trabalhistas, com base na certidão de dependentes econômicos do empregado falecido, obtida junto ao sistema PREVJUD do INSS, sendo de ressaltar que ..." },
        { title: "PROCESSOS IGPS - MPT", text: "Intime-se o MPT para participar da audiência, considerando a\npercepção do Juízo de que são fortes os indícios de intermediação irregular de mão de obra para o município de Penedo e outras cidades da jurisdição da Vara do Trabalho de Penedo, por meio de contratos de prestação de serviços de atividades subalternas, sem contextualização de autonomia e gestão própria de trabalho,\ngeridos pelo INSTITUTO DE GESTAO DE POLITICAS PUBLICAS SOCIAIS - IGPS" },
        { title: "REMETER OS AUTOS AO JUIZ QUE FEZ A INSTRUÇÃO", text: "Remetam-se os autos a Exm. Dr. xxxx, responsável pela colheita do interrogatório das partes e depoimento das testemunhas (ata Id xxx), nos termos do art. 163 da consolidação dos provimentos da Corregedoria Regional deste E.TRT." },
        { title: "DESISTÊNCIA DE PEDIDO (INSALUBRIDADE)", text: "Neste ato a parte autora desiste do pedido ADICIONAL DE INSALUBRIDADE da petição inicial. \nHOMOLOGO, extinguindo o feito sem resolução do mérito no particular, nos termos do artigo 485, VIII, do CPC. Custas ao final." },
        { title: "SUSPENSÃO PEJOTIZAÇÃO", text: "Em razão da decisão do C. STF, relatoria do Ministro Gilmar Mendes, colacionada nos autos do Tema 1389 de Repercussão Geral no Supremo Tribunal Federal, o Juízo entendeu que a demanda fática jurídica deste processo se enquadra no comando cautelar de suspensão de todos os procedimentos judiciais em que se discute fraude ao contrato de emprego por meio de contrato de prestação de serviço autônomo, como é do caso de trabalhador reclamante contratado por MEI, mediante a forma de microempreendedor individual, não obstante a evidente natureza subalterna das atividades que executa na qualidade de xxxx.\nIsto posto, observe-se a suspensão processual até posterior deliberação do Ministro Gilmar Mendes ou do Pleno do C.STF.\nAUTOS SOBRESTADOS EM RAZÃO DA DECISÃO DO C.STF \nCientes os presentes.\nAudiência encerrada às xx:xx" },
        { title: "CONSIGNAR PROTESTOS", text: "Consignados os protestos da parte reclamante/reclamada." },
        { title: "REQUERIMENTOS PELAS PARTES", text: "O(a) advogado(a) da parte reclamante/reclamada requer:\"xxxx\"\nPelo Juízo foi..." }
    ],
    "Decisões Judiciais": [
        { title: "AUTOS CONCLUSOS PARA SENTENÇA", text: "Sem mais provas, encerra-se a instrução processual. Razões finais remissivas. Conciliação final rejeitada. Autos conclusos para prolação de sentença, da qual as partes serão intimadas." },
        { title: "ENCERRAMENTO (RFS NOS AUTOS, PARTES CIENTES)", text: "O Juízo encerrou a instrução.\nRazões finais já colacionadas aos autos pelas partes.\nConciliação prejudicada.\nAutos seguem conclusos para sentença. Proferida a sentença as partes serão intimadas na forma legal.\nPartes presentes cientes." }
    ]
};
