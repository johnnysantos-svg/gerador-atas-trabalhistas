import { AtaData, AtosProcessuaisOpcao, ConciliacaoStatus, ContestacaoTipo, ReplicaPrazo, SectionInputMode } from './types';
import { REPLICA_TEXTS, CONTESTACAO_TEXTS, ATOS_PROCESSUAIS_OPTIONS } from './constants';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const getAcaoAbbreviation = (tipoAcao: string): string => {
    if (!tipoAcao) return '';
    if (tipoAcao.toLowerCase().includes('sumaríssimo')) return 'ATSum';
    if (tipoAcao.toLowerCase().includes('ordinário')) return 'ATOrd';
    return tipoAcao.split(' ').map(word => word[0]).join('').toUpperCase();
}


export const generateAtaHtml = (data: AtaData): string => {
    let html = '';
    let closingBlockAdded = false;
    const formatParagraphs = (text: string) => text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');

    // 1. Header
    if (data.preencherDadosIniciais) {
        if (data.headerMode === SectionInputMode.PASTE) {
            html += `<div style="text-align: center;">${data.headerPastedText.replace(/\n/g, '<br />')}</div>`;
        } else {
            html += `<div style="text-align: center;">`;
            html += `<p><strong>PODER JUDICIÁRIO</strong></p>`;
            html += `<p><strong>JUSTIÇA DO TRABALHO</strong></p>`;
            html += `<p><strong>TRIBUNAL REGIONAL DO TRABALHO DA 19ª REGIÃO</strong></p>`;
            if(data.varaTrabalho) html += `<p><strong>${data.varaTrabalho.toUpperCase()}</strong></p><br/>`;
            if(data.numeroProcesso) html += `<p><strong>${getAcaoAbbreviation(data.tipoAcao)} ${data.numeroProcesso}</strong></p>`;
            
            const reclamanteNomes = data.reclamantes.map(r => r.nome).filter(Boolean);
            if(reclamanteNomes.length > 0) {
                const nomeHeader = reclamanteNomes.length > 1 ? `${reclamanteNomes[0]} E OUTRO(S)` : reclamanteNomes[0];
                html += `<p><strong>RECLAMANTE: ${nomeHeader.toUpperCase()}</strong></p>`;
            }
            
            const reclamadaNomes = data.reclamadas.map(r => r.nome).filter(Boolean);
            if(reclamadaNomes.length > 0) {
                const nomeHeader = reclamadaNomes.length > 1 ? `${reclamadaNomes[0]} E OUTRO(S)` : reclamadaNomes[0];
                html += `<p><strong>RECLAMADO(A): ${nomeHeader.toUpperCase()}</strong></p>`;
            }
            html += `</div><br/><br/>`;
        }
    }

    html += `<h2 style="text-align: center;"><strong>ATA DE AUDIÊNCIA</strong></h2><br/>`;

    if (data.preencherDadosIniciais) {
        // Introductory Paragraph
        if (data.incluirParagrafoIntrodutorio) {
            html += `<p><em>Em ${data.dataAudiencia || '[Data por extenso]'}, na sala de sessões da MM. ${data.varaTrabalho || '[Vara do Trabalho]'}, sob a direção do(a) Exmo(a). Sr(a). Juiz(a) do Trabalho ${data.juizNome || '[Nome do Juiz]'}, realizou-se audiência relativa à ${data.tipoAcao || '[Tipo de Ação]'} número ${data.numeroProcesso || '[Número do Processo]'}, supramencionada.</em></p><br/>`;
        }

        // 2. Abertura
        if (data.aberturaMode === SectionInputMode.PASTE) {
            html += `<p><strong>${data.aberturaPastedText}</strong></p><br/>`;
        } else if (data.aberturaHora) {
            html += `<p><strong>Às ${data.aberturaHora}, aberta a audiência, foram apregoadas as partes.</strong></p><br/>`;
        }
        
        // 3. Reclamante
        if (data.reclamanteMode === SectionInputMode.PASTE) {
            html += `<p><strong>${data.reclamantePastedText.replace(/\n/g, '<br/>')}</strong></p><br/>`;
        } else {
            const filledReclamantes = data.reclamantes.filter(r => r.nome);
            if (filledReclamantes.length > 0) {
                let text = '';
                if (filledReclamantes.length === 1) {
                    const r = filledReclamantes[0];
                    text += `Presente a parte reclamante ${r.nome}, ${r.comparecimento}`;
                    if (r.advogado) {
                        text += `, acompanhado(a) de seu(sua) advogado(a), Dr(a). ${r.advogado}.`;
                    } else {
                        text += '.';
                    }
                } else {
                    text += `Presentes as partes reclamantes: `;
                    filledReclamantes.forEach((r, index) => {
                        text += `${r.nome}, ${r.comparecimento}`;
                        if (r.advogado) {
                            text += `, acompanhado(a) de seu(sua) advogado(a), Dr(a). ${r.advogado}`;
                        }
                        text += (index === filledReclamantes.length - 1) ? '.' : '; ';
                    });
                }
                html += `<p><strong>${text}</strong></p><br/>`;
            }
        }


        // 4. Reclamada
        if (data.reclamadaMode === SectionInputMode.PASTE) {
            html += `<p><strong>${data.reclamadaPastedText.replace(/\n/g, '<br/>')}</strong></p><br/>`;
        } else {
             const filledReclamadas = data.reclamadas.filter(r => r.nome);
            if (filledReclamadas.length > 0) {
                let text = '';
                if (filledReclamadas.length === 1) {
                    const r = filledReclamadas[0];
                    text += `Presente a parte reclamada ${r.nome}`;
                     if (r.representante) {
                        text += `, representado(a) pelo(a) preposto(a) Sr.(a) ${r.representante}`;
                     }
                     if (r.advogado) {
                        text += `, acompanhado(a) de seu(sua) advogado(a), Dr(a). ${r.advogado}.`;
                     } else {
                        text += '.';
                     }
                } else {
                    text += `Presentes as partes reclamadas: `;
                    filledReclamadas.forEach((r, index) => {
                        text += `${r.nome}`;
                        if (r.representante) {
                            text += `, representado(a) pelo(a) preposto(a) Sr.(a). ${r.representante}`;
                        }
                        if (r.advogado) {
                            text += `, acompanhado(a) de seu(sua) advogado(a), Dr(a). ${r.advogado}`;
                        }
                        text += (index === filledReclamadas.length - 1) ? '.' : '; ';
                    });
                }
                html += `<p><strong>${text}</strong></p><br/>`;
            }
        }

        // Estudantes
        if (data.estudanteMode === SectionInputMode.PASTE && data.estudantePastedText) {
            html += `<p><strong>${data.estudantePastedText.replace(/\n/g, '<br/>')}</strong></p><br/>`;
        } else if (data.estudantes && data.estudantes.length > 0) {
            data.estudantes.forEach(estudante => {
                if (estudante.nome) { 
                    html += `<p><strong>PRESENTE O(A) ESTUDANTE DE DIREITO: ${estudante.nome}, CPF ${estudante.cpf || 'não informado'}, FACULDADE ${estudante.faculdade || 'não informada'}, ${estudante.periodo || 'não informado'} PERÍODO. (DADOS TRANSCRITOS COM A ANUÊNCIA EXPRESSA DO ESTUDANTE).</strong></p><br/>`;
                }
            });
        }
        
        if (data.participacaoVideoconferencia) {
            html += `<p><strong>A participação de todos os presentes se deu por meio de videoconferência.</strong></p><br/>`;
        }
    }

    html += `<p style="text-align: center;"><strong>INSTALADA A AUDIÊNCIA.</strong></p><br/>`;
    
    if (data.conciliacaoStatus) {
        if (data.conciliacaoStatus === ConciliacaoStatus.ACEITA) {
            html += `<p style="text-align: center;"><strong>CONCILIAÇÃO</strong></p>`;
            html += `<p>${(data.conciliacaoTermos || 'Termos a serem descritos.').replace(/\n/g, '<br/>')}</p><br/>`;
        } else {
            html += `<p><strong>CONCILIAÇÃO ${data.conciliacaoStatus}.</strong></p><br/>`;
        }
    }

    if (data.contestacaoTipo) {
        const contestacao = data.contestacaoTipo === ContestacaoTipo.PERSONALIZADO ? data.contestacaoTexto : CONTESTACAO_TEXTS[data.contestacaoTipo];
        html += `<p><strong>CONTESTAÇÃO:</strong> ${contestacao}</p><br/>`;
    }

    if(data.replicaPrazo) {
        const replica = data.replicaPrazo === ReplicaPrazo.PERSONALIZADO ? data.replicaTexto : REPLICA_TEXTS[data.replicaPrazo];
        if (replica) html += `<p>${replica}</p><br/>`;
    }

    if (data.observacoesGerais) {
        html += `<p>${data.observacoesGerais.replace(/\n/g, '<br/>')}</p><br/>`;
    }

    // 8. Atos Processuais
    const hasContentInLivreTexto = !!data.livreTexto.trim();
    const hasNonLivreAct = data.atosProcessuaisOpcoes.some(id => id !== AtosProcessuaisOpcao.LIVRE);
    const isLivreOnly = data.atosProcessuaisOpcoes.length === 1 && data.atosProcessuaisOpcoes[0] === AtosProcessuaisOpcao.LIVRE;
    let atosHtml = '';

    // Insert cumulative text BEFORE if needed
    if (hasContentInLivreTexto && hasNonLivreAct && data.livreTextoPosicao === 'antes') {
        atosHtml += formatParagraphs(data.livreTexto);
    }

    const orderedIds = data.orderedAtos || [];
    const regularActs = orderedIds.filter(id => id !== AtosProcessuaisOpcao.GRAVACAO);

    regularActs.forEach(actId => {
        const option = ATOS_PROCESSUAIS_OPTIONS.find(opt => opt.id === actId);
        if (!option) return;

        switch(option.id) {
            case AtosProcessuaisOpcao.INICIAL:
                atosHtml += formatParagraphs(`Audiência de <strong>INSTRUÇÃO TELEPRESENCIAL</strong> para o dia ${data.instrucaoData || '[DATA]'} às ${data.instrucaoHora || '[HORA]'}, quando as partes deverão comparecer, na forma da lei, para prestar depoimento pessoal, sob pena de confissão ficta, sendo desde logo informado que as testemunhas comparecerão independentemente de intimação, na forma do artigo 825 da CLT.`);
                break;
            case AtosProcessuaisOpcao.PERICIA_MEDICA:
                atosHtml += formatParagraphs(`Em razão da alegação de ${data.periciaMedicaDoenca || '[TIPO DE DOENÇA]'}, o Juiz determinou a realização de perícia, a cargo do(a) Dr(a). ${data.periciaMedicaPerito || '[NOME DO PERITO]'}, que fica desde já nomeado(a) e que deverá ser notificado(a) para entregar o laudo no prazo de 30 dias. O(A) SR.(A) PERITO(A) DEVERÁ COMUNICAR ÀS PARTES, POR ESCRITO, A DATA E HORÁRIO DA REALIZAÇÃO DA PERÍCIA.\n\nCONTATO DO RECLAMANTE: ${data.periciaMedicaContatoReclamante || '[TELEFONE]'}. CONTATO DO ADVOGADO DO RECLAMANTE: ${data.periciaMedicaContatoAdvogado || '[TELEFONE]'}. CONTATO DA RECLAMADA: ${data.periciaMedicaContatoReclamada || '[TELEFONE]'} e E-mail: ${data.periciaMedicaEmailReclamada || '[EMAIL]'}.\n\nAs partes deverão apresentar quesitos e assistentes técnicos, querendo, no prazo de 05 dias.\n\nO(a) perito(a) deverá responder aos seguintes quesitos do Juízo:\n1) O(a) reclamante é portador(a) das enfermidades alegadas na inicial?\n2) Há nexo de causalidade entre tais enfermidades e as atividades funcionais do(a) reclamante na reclamada?\n3) A reclamada, por imprudência, negligência ou imperícia contribuiu para o surgimento ou para o agravamento das enfermidades do(a) reclamante?\n4) A reclamada deixou de cumprir alguma norma específica de segurança do trabalho que poderia ter evitado ou diminuído os efeitos da enfermidade do(a) reclamante?\n5) Dessas enfermidades resultou para o(a) reclamante incapacidade para o trabalho, total ou parcial, temporária ou permanente?\n\nApresentado o laudo, providencie a secretaria vistas às partes pelo prazo comum e preclusivo de 5 dias.\n\nEm havendo impugnação ao laudo pericial, a Secretaria deverá providenciar a intimação do(a) perito(a) para que se pronuncie, prestando os esclarecimentos necessários, no prazo de 05 dias. Apresentados os esclarecimentos do(a) perito(a), deverá ser dado vistas às partes, pelo prazo comum e preclusivo de 05 dias.\n\nSobre a ultima manifestação pericial poderão as partes se manifestar na audiência abaixo designada, onde se encerrará formalmente a instrução.\n\n<strong>AUTOS FORA DE PAUTA. AGUARDAR CONCLUSÃO DA PERÍCIA. AS PARTES E SEUS ADVOGADOS SERÃO INTIMADOS DA PRÓXIMA AUDIÊNCIA.</strong>`);
                break;
            case AtosProcessuaisOpcao.PERICIA_INSALUBRIDADE:
                atosHtml += formatParagraphs(`Em razão do pedido de <strong>${data.periciaInsalubridadeTipo || '[TIPO DE ADICIONAL]'}</strong>, o Juiz determinou a realização de perícia, a cargo do Dr. ${data.periciaInsalubridadePerito || '[NOME DO PERITO]'}, que fica desde já nomeado e deverá ser notificado para entregar o laudo no prazo de 30 dias. O SR. PERITO DEVERÁ COMUNICAR ÀS PARTES, POR ESCRITO, A DATA E HORÁRIO DA REALIZAÇÃO DA PERÍCIA.\n\nCONTATO DO RECLAMANTE: ${data.periciaInsalubridadeContatoReclamante || '[TELEFONE]'}. CONTATO DO ADVOGADO DO RECLAMANTE: ${data.periciaInsalubridadeContatoAdvogado || '[TELEFONE]'}. CONTATO DA RECLAMADA: ${data.periciaInsalubridadeContatoReclamada || '[TELEFONE]'}.\n\nPrazo comum de 05 dias para as partes apresentarem quesitos e indicarem assistentes técnicos, caso queiram.\n\nApresentado o laudo, providencie a secretaria vistas às partes pelo prazo comum de 5 dias.\n\n<strong>AUTOS FORA DE PAUTA. AGUARDAR CONCLUSÃO DA PERÍCIA. AS PARTES E SEUS ADVOGADOS SERÃO INTIMADOS DA PRÓXIMA AUDIÊNCIA.</strong>`);
                break;
            case AtosProcessuaisOpcao.PERICIA_CONTABIL:
                atosHtml += formatParagraphs(`Determina-se realização de perícia contábil, nomeando-se de logo ${data.periciaContabilPerito || '[NOME DO PERITO]'}, que deverá apresentar o laudo em 30 dias.\n\nPara apresentação de quesitos e indicação de assistente técnico terão as partes o prazo comum de 5 dias.\n\n<strong>AUTOS FORA DE PAUTA. AGUARDar CONCLUSÃO DA PERÍCIA. AS PARTES E SEUS ADVOGADOS SERÃO INTIMADOS DA PRÓXIMA AUDIÊNCIA.</strong>`);
                break;
            case AtosProcessuaisOpcao.LIVRE:
                if (isLivreOnly && hasContentInLivreTexto) {
                    atosHtml += formatParagraphs(data.livreTexto);
                }
                break;
            case AtosProcessuaisOpcao.MATERIA_DIREITO:
                atosHtml += formatParagraphs(`Pela ordem, as partes não têm provas pessoais a apresentar, por se tratar de matéria de direito e de fato calcada em prova documental, em razão do que o Juízo determinou o julgamento antecipado da lide.\n\nSem mais provas, encerra-se a instrução.\n\nRazões finais remissivas.\n\nConciliação novamente recusada.\n\nAutos conclusos para sentença, da qual os procuradores serão intimados.`);
                break;
            case AtosProcessuaisOpcao.ADIAMENTO_FRACIONAMENTO:
                atosHtml += formatParagraphs(`Pelo Juízo, tendo em vista a ${data.adiamentoMotivo || '[MOTIVO]'}, determinou-se o adiamento/fracionamento desta assentada para a data abaixo designada.\nAdio a audiência para o dia ${data.adiamentoData || '[DATA]'}, às ${data.adiamentoHora || '[HORA]'}, quando as partes deverão comparecer, sob as penas do arts. 844 e 852-A da CLT;`);
                break;
            case AtosProcessuaisOpcao.SUSPENSAO_PEJOTIZACAO:
                atosHtml += formatParagraphs(`Em razão da decisão do C. STF, relatoria do Ministro Gilmar Mendes, colacionada nos autos do Tema 1389 de Repercussão Geral no Supremo Tribunal Federal, o Juízo entendeu que a demanda fática jurídica deste processo se enquadra no comando cautelar de suspensão de todos os procedimentos judiciais em que se discute fraude ao contrato de emprego por meio de contrato de prestação de serviço autônomo, como é do caso de trabalhador reclamante contratado por MEI, mediante a forma de microempreendedor individual, não obstante a evidente natureza subalterna das atividades que executa na qualidade de [QUALIDADE/FUNÇÃO DO TRABALHOR].\n\nIsto posto, observe-se a suspensão processual até posterior deliberação do Ministro Gilmar Mendes ou do Pleno do C.STF.\n\nAUTOS SOBRESTADOS EM RAZÃO DA DECISÃO DO C.STF`);
                break;
        }
    });

    html += atosHtml;

    // Insert cumulative text AFTER if needed
    if (hasContentInLivreTexto && hasNonLivreAct && data.livreTextoPosicao === 'depois') {
        html += formatParagraphs(data.livreTexto);
    }
    
    // Handle GRAVACAO last as it provides its own closing block
    if (orderedIds.includes(AtosProcessuaisOpcao.GRAVACAO)) {
        let gravacaoHtml = '';
        const texto_atencao_lgpd = `ATENÇÃO: A audiência será gravada, nos termos do que prevê o Ato CGJT 11/2020 e Resolução CSJT n.º 313, de 22 de outubro de 2021. Os vídeos dos depoimentos disponíveis na plataforma PJE mídias poderão ser acessados emdocumento anexo à certidão de juntada de gravação.

Diante dos termos e princípios vigentes a partir da lei 13.709/18(LGPD) e considerando o disposto no artigo 5º, incisos V e X, da Constituição Federalde1988, ficam todos os participantes deste ato, sujeitos processuais ou não,advertidos a respeito das cautelas necessárias em relação ao tratamento dos dadosdecorrentes dessa sessão, em especial devendo considerar o princípio da finalidade, necessidade e transparência (art. 6º, incisos I, III e VI), além da boa-fé e interesse público (art. 7º, §3º, da LGPD), sem prejuízo das demais disposições inscritas na norma. Adverte-se que é vedada a utilização, divulgação, compartilhamento e/ou publicação das imagens e sons relativos à presente audiência, por qualquer método, assim como é proibida a divulgação ou a propagação da gravação extra autos, para terceiros, sem autorização das partes aqui envolvidas no processo judicial, fora do âmbito do mesmo, sob pena de responsabilização administrativa, cível e criminal [se audiência presencial -podendo ainda os presentes responder perante as partes, advogados e testemunha(s)], em razão do direito de imagem e das disposições insertas na LGPD.

O CNJ definiu na Resolução nº 105 de 2010 que "depoimentos documentados por meio audiovisual não precisam de transcrição". O Conselho Superior da Justiça do Trabalho, seguindo entendimento já firmado pelo CNJ e pelo Corregedor Geral da Justiça do Trabalho em diversos Pedidos de Providência, disciplinou a questão na Resolução nº 313/2021. Para facilitar o trabalho de valoração e argumentação sobre os depoimentos gravados em audiência, o Juízo disponibilizará, por meio de Certidão, a degravação dos depoimentos gravados, realizada por meio de Inteligência Artificial, valendo, em caso de divergência, o teor e o contexto objeto da gravação em vídeo do depoimento, colacionado via PJE MÍDIAS.

As partes e patronos são orientados, neste momento, de que as perguntas serão realizadas por "tópicos" e na ordem, acordados previamente entre as partes e o Juízo. Esta sistemática tem como intuito o cumprimento do art. 3º da Resolução n. 313/2021 do CSJT.`;
        gravacaoHtml += formatParagraphs(texto_atencao_lgpd);
        
        const topicos = `As partes fixam que produzirão provas sobre o(s) seguinte(s) tópico(s):\n${(data.gravacaoTopicos || '[LISTA DE TÓPICOS]').split('\n').map(t => ` - ${t}`).join('\n')}`;
        gravacaoHtml += formatParagraphs(topicos);

        gravacaoHtml += formatParagraphs(`INTERROGATÓRIO DO RECLAMANTE, ÀS PERGUNTAS DISSE: <strong>GRAVADO</strong>`);
        gravacaoHtml += formatParagraphs(`INTERROGATÓRIO DO PREPOSTO DA RECLAMADA: <strong>GRAVADO</strong>`);
        
        if (!data.gravacaoSemTestemunhasReclamante && data.gravacaoTestemunhasReclamante.length > 0) {
            data.gravacaoTestemunhasReclamante.forEach(t => {
                const nome = t.nome || 'nome';
                const cpf = t.cpf || 'CPF';
                const endereco = t.endereco ? `residente na ${t.endereco}` : 'residente na Rua , nº    , Bairro , cidade    /AL';
                
                let witnessText = `INTERROGATÓRIO DA TESTEMUNHA DO RECLAMANTE, ${nome}, CPF ${cpf}, ${endereco}.`;
                
                if (!data.contraditaTexto) {
                    witnessText += ` A testemunha foi advertida e compromissada sob as penas da lei. Aos costumes nada disse. Às perguntas respondeu: <strong>GRAVADO</strong>`;
                }
                
                gravacaoHtml += formatParagraphs(witnessText);
            });
        }
        if (!data.gravacaoSemTestemunhasReclamada && data.gravacaoTestemunhasReclamada.length > 0) {
            data.gravacaoTestemunhasReclamada.forEach(t => {
                const nome = t.nome || 'nome';
                const cpf = t.cpf || 'CPF';
                const endereco = t.endereco ? `residente na ${t.endereco}` : 'residente na Rua , nº    , Bairro , cidade    /AL';
                
                let witnessText = `INTERROGATÓRIO DA TESTEMUNHA DA RECLAMADA, ${nome}, CPF ${cpf}, ${endereco}.`;

                if (!data.contraditaTexto) {
                     witnessText += ` A testemunha foi advertida e compromissada sob as penas da lei. Aos costumes nada disse. Às perguntas respondeu: <strong>GRAVADO</strong>`;
                }

                gravacaoHtml += formatParagraphs(witnessText);
            });
        }

        if (data.contraditaTexto) {
            gravacaoHtml += formatParagraphs(`<strong>CONTRADITA DE TESTEMUNHA:</strong>\n${data.contraditaTexto}`);
        }
        
        gravacaoHtml += formatParagraphs(`A título experimental, será juntado uma transcrição dos depoimentos realizada por Inteligência Artificial, mas esclarece-se que o que prevalecerá, em caso de eventual divergência, é a gravação em vídeo.`);

        gravacaoHtml += formatParagraphs(`Sem mais provas, encerra-se a instrução.`);
        
        let razoesFinaisText = '';
        if (data.gravacaoRazoesFinais === 'remissivas') {
            razoesFinaisText = 'Razões finais remissivas.';
        } else if (data.gravacaoRazoesFinais === 'memoriais') {
            razoesFinaisText = 'Razões finais em memoriais devem ser juntadas pelas partes no prazo de 02 dias, e não sendo juntadas serão consideradas remissivas.';
        } else if (data.gravacaoRazoesFinais === 'memoriais_data') {
            razoesFinaisText = 'Razões finais em memoriais devem ser juntadas pelas partes até o dia xx/xx/202x, e não sendo juntadas serão consideradas remissivas.';
        } else {
            razoesFinaisText = data.gravacaoRazoesFinaisTexto;
        }
        gravacaoHtml += formatParagraphs(razoesFinaisText);
        
        gravacaoHtml += formatParagraphs(`Conciliação novamente recusada.`);
        gravacaoHtml += formatParagraphs(`Autos conclusospara sentença, da qual os procuradores serão intimados.`);

        html += gravacaoHtml;
        closingBlockAdded = true; // GRAVACAO provides the full closing block
    }
    
    if (!closingBlockAdded) {
        if (data.textoLivreEncerramento) {
            html += formatParagraphs(data.textoLivreEncerramento);
        }
        html += `<p>Cientes os presentes.</p><br/>`;
        html += `<p>Audiência encerrada às ${data.encerramentoHora || '[HORA]'}.</p><br/>`;
        html += `<p>Nada mais.</p>`;
    } else {
        // If GRAVACAO was used, it already has its own closing. Append final parts.
        html += `<p>Cientes os presentes.</p><br/>`;
        html += `<p>Audiência encerrada às ${data.encerramentoHora || '[HORA]'}.</p><br/>`;
        html += `<p>Nada mais.</p>`;
    }

    return html;
};

export const generateDocx = (data: AtaData): Document => {
  const paragraphs: Paragraph[] = [];

  const html = generateAtaHtml(data);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  Array.from(tempDiv.children).forEach(child => {
      let alignment = (child as HTMLElement).style.textAlign === 'center' ? AlignmentType.CENTER : AlignmentType.JUSTIFIED;

      if(child.tagName === 'BR') {
          paragraphs.push(new Paragraph({text: ""}));
          return;
      }
      
      let textContent = child.textContent || "";
      if (child.tagName === 'H2') {
          paragraphs.push(new Paragraph({ text: textContent, heading: HeadingLevel.HEADING_2, alignment }));
      } else {
          const children: TextRun[] = [];
          
          Array.from(child.childNodes).forEach(node => {
              if (node.nodeType === Node.TEXT_NODE) {
                  children.push(new TextRun({ text: node.textContent || '' }));
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const el = node as HTMLElement;
                  children.push(new TextRun({ 
                      text: el.textContent || '', 
                      bold: el.tagName === 'STRONG',
                  }));
              }
          });

          paragraphs.push(new Paragraph({ children, alignment }));
      }
  });

  const doc = new Document({
    styles: {
        paragraphStyles: [
            { id: "normal", name: "Normal", run: { font: "Times New Roman", size: 24 } },
            { id: "heading1", name: "Heading 1", basedOn: "normal", next: "normal", run: { size: 28, bold: true } },
        ]
    },
    sections: [{
      children: paragraphs,
    }],
  });


  return doc;
};