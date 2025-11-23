
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { AtaData, Testemunha, Reclamante, Reclamada } from '../types';
import { VoiceInput } from './VoiceTypingButton';
import { STEPS, MANUAL_DATA } from '../constants';

interface ChatAssistantProps {
  ataData: AtaData;
  onUpdateData: <K extends keyof AtaData>(key: K, value: AtaData[K]) => void;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  textosPadroes: Record<string, { title: string; text: string }[]>;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "🔍 Auditar inconsistências",
  "Redigir termo de conciliação",
  "Adicionar Reclamada",
  "Navegar para Atos Processuais",
  "Inserir ocorrência de ausência",
  "Como usar a digitação por voz?"
];

const ChatAssistant: React.FC<ChatAssistantProps> = ({ ataData, onUpdateData, setCurrentStep, textosPadroes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Olá! Sou seu assistente jurídico.\n\nAgora com **COMANDOS DE VOZ** e **NAVEGAÇÃO**!\n\nPosso preencher a ata, adicionar partes, mudar de tela ou tirar dúvidas sobre o sistema. Experimente dizer: "Vá para a tela de Partes" ou "Como adiciono um perito?".',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatSessionRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const getTools = (): FunctionDeclaration[] => {
    return [
      {
        name: "update_field",
        description: "Atualiza um campo simples do formulário (texto, número ou booleano).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            field: {
              type: Type.STRING,
              description: "O nome exato do campo no JSON da AtaData (ex: 'juizNome', 'aberturaHora', 'livreTexto', 'observacoesGerais').",
            },
            value: {
              type: Type.STRING,
              description: "O novo valor para o campo.",
            }
          },
          required: ["field", "value"],
        },
      },
      {
        name: "navigate_to_step",
        description: "Navega para uma etapa específica (aba) do aplicativo.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            stepIndex: {
              type: Type.NUMBER,
              description: `O índice da etapa (0 a ${STEPS.length - 1}). Mapeamento: ${STEPS.map((s, i) => `${i}=${s}`).join(', ')}.`,
            }
          },
          required: ["stepIndex"],
        },
      },
      {
        name: "add_party",
        description: "Adiciona um novo Reclamante ou Reclamada à lista.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: "'Reclamante' ou 'Reclamada'.",
            },
            name: { type: Type.STRING, description: "Nome da parte." },
            lawyer: { type: Type.STRING, description: "Nome do advogado (opcional)." },
            representative: { type: Type.STRING, description: "Nome do preposto (apenas para Reclamada)." },
          },
          required: ["type", "name"],
        },
      },
      {
        name: "update_party_details",
        description: "Atualiza detalhes de uma parte JÁ EXISTENTE (Reclamante ou Reclamada), como inserir advogado ou preposto.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            targetName: { 
              type: Type.STRING, 
              description: "Nome (ou parte do nome) da parte (pessoa ou empresa) a ser editada para encontrar na lista." 
            },
            field: { 
              type: Type.STRING, 
              description: "O campo a atualizar: 'advogado' ou 'representante' (preposto)." 
            },
            value: { 
              type: Type.STRING, 
              description: "O nome do advogado ou preposto a ser inserido." 
            },
            partyType: { 
              type: Type.STRING, 
              description: "Opcional: 'Reclamante' ou 'Reclamada' para ajudar na busca." 
            }
          },
          required: ["targetName", "field", "value"]
        }
      },
      {
        name: "append_occurrence",
        description: "Adiciona um texto livre ou ocorrência ao campo 'livreTexto' ou 'observacoesGerais', preservando o conteúdo anterior.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING, description: "O texto a ser adicionado." },
                targetField: { type: Type.STRING, description: "'livreTexto' ou 'observacoesGerais'. Default: 'livreTexto'." }
            },
            required: ["text"]
        }
      },
      {
        name: "add_witness",
        description: "Adiciona uma nova testemunha à lista de testemunhas.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            party: {
              type: Type.STRING,
              description: "De quem é a testemunha? 'Reclamante' ou 'Reclamada'.",
            },
            name: { type: Type.STRING, description: "Nome completo." },
            cpf: { type: Type.STRING, description: "CPF (opcional)." },
            address: { type: Type.STRING, description: "Endereço (opcional)." },
          },
          required: ["party", "name"],
        },
      },
      {
        name: "set_conciliation",
        description: "Define o status da conciliação.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                status: {
                    type: Type.STRING,
                    description: "'ACEITA', 'REJEITADA', 'PREJUDICADA'.",
                },
                terms: {
                    type: Type.STRING,
                    description: "Termos do acordo (apenas se status for ACEITA).",
                }
            },
            required: ["status"]
        }
      }
    ];
  };

  const executeFunctionCall = (functionCall: any) => {
    const { name, args, id } = functionCall;
    console.log(`Executing tool: ${name}`, args);

    let result = "Ação realizada com sucesso.";

    try {
        switch (name) {
            case "update_field":
                // @ts-ignore
                onUpdateData(args.field, args.value);
                result = `Campo '${args.field}' atualizado.`;
                break;
            
            case "navigate_to_step":
                const stepIdx = Number(args.stepIndex);
                if (stepIdx >= 0 && stepIdx < STEPS.length) {
                    setCurrentStep(stepIdx);
                    result = `Navegado para a etapa: ${STEPS[stepIdx]}`;
                } else {
                    result = "Índice de etapa inválido.";
                }
                break;

            case "add_party":
                const isReclamante = args.type.toLowerCase().includes('reclamante');
                const uniqueId = Date.now().toString();
                if (isReclamante) {
                    const newR: Reclamante = { 
                        id: uniqueId, 
                        nome: args.name, 
                        comparecimento: 'pessoalmente', 
                        advogado: args.lawyer || '' 
                    };
                    onUpdateData('reclamantes', [...ataData.reclamantes, newR]);
                } else {
                    const newR: Reclamada = { 
                        id: uniqueId, 
                        nome: args.name, 
                        representante: args.representative || '', 
                        advogado: args.lawyer || '' 
                    };
                    onUpdateData('reclamadas', [...ataData.reclamadas, newR]);
                }
                result = `${args.type} ${args.name} adicionado(a).`;
                break;
            
            case "update_party_details":
                const target = args.targetName.toLowerCase();
                let found = false;
                let typeFound = '';

                // Tentar encontrar na Reclamada
                if (!found && (!args.partyType || args.partyType.toLowerCase().includes('reclamada'))) {
                    const idx = ataData.reclamadas.findIndex(r => r.nome.toLowerCase().includes(target));
                    if (idx !== -1) {
                        const updatedReclamadas = [...ataData.reclamadas];
                        if (args.field === 'advogado') updatedReclamadas[idx].advogado = args.value;
                        if (args.field === 'representante') updatedReclamadas[idx].representante = args.value;
                        onUpdateData('reclamadas', updatedReclamadas);
                        found = true;
                        typeFound = 'Reclamada';
                    }
                }

                // Tentar encontrar no Reclamante (apenas advogado, Reclamante não tem preposto)
                if (!found && (!args.partyType || args.partyType.toLowerCase().includes('reclamante')) && args.field !== 'representante') {
                    const idx = ataData.reclamantes.findIndex(r => r.nome.toLowerCase().includes(target));
                    if (idx !== -1) {
                        const updatedReclamantes = [...ataData.reclamantes];
                        if (args.field === 'advogado') updatedReclamantes[idx].advogado = args.value;
                        onUpdateData('reclamantes', updatedReclamantes);
                        found = true;
                        typeFound = 'Reclamante';
                    }
                }

                if (found) {
                    result = `Atualizado ${args.field} para ${typeFound} contendo "${args.targetName}".`;
                } else {
                    result = `Não encontrei nenhuma parte com o nome "${args.targetName}" para atualizar.`;
                }
                break;
            
            case "append_occurrence":
                const field = args.targetField === 'observacoesGerais' ? 'observacoesGerais' : 'livreTexto';
                const currentVal = ataData[field] || '';
                const newVal = currentVal ? `${currentVal}\n\n${args.text}` : args.text;
                onUpdateData(field, newVal);
                result = `Texto adicionado ao campo ${field}.`;
                break;

            case "add_witness":
                const newWitness: Testemunha = {
                    id: Date.now().toString(),
                    nome: args.name,
                    cpf: args.cpf || '',
                    endereco: args.address || ''
                };
                const listKey = args.party.toLowerCase().includes('reclamante') 
                    ? 'gravacaoTestemunhasReclamante' 
                    : 'gravacaoTestemunhasReclamada';
                // @ts-ignore
                onUpdateData(listKey, [...(ataData[listKey] as Testemunha[]), newWitness]);
                result = `Testemunha ${args.name} adicionada.`;
                break;
            
            case "set_conciliation":
                onUpdateData('conciliacaoStatus', args.status);
                if (args.terms) {
                    onUpdateData('conciliacaoTermos', args.terms);
                }
                result = `Conciliação definida como ${args.status}.`;
                break;

            default:
                result = "Função desconhecida.";
        }
    } catch (e: any) {
        console.error("Erro ao executar tool:", e);
        result = `Erro ao executar ação: ${e.message}`;
    }

    return {
        functionResponse: {
            name: name,
            response: { result: result },
            id: id
        }
    }
  };


  const initializeChat = async () => {
    if (!process.env.API_KEY) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: '⚠️ ERRO: API_KEY não encontrada.',
        timestamp: new Date()
      }]);
      return null;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Convertendo o manual para texto simples para o contexto da IA
      const manualContext = MANUAL_DATA.map(s => `### ${s.title}\n${s.text}`).join('\n\n');

      const systemInstruction = `
        Você é um Auditor Jurídico e Assistente de Audiências Trabalhistas (CLT) altamente qualificado.
        
        CONTEXTO DO SISTEMA (MANUAL):
        ${manualContext}

        SUAS CAPACIDADES:
        1. **AUDITORIA:** Analise o JSON da ata em busca de erros lógicos (ex: datas passadas para audiências futuras, Reclamante ausente com depoimento preenchido).
        2. **OPERADOR:** Use as TOOLS para realizar ações no app.
           - Se o usuário disser "Vá para Conciliação", use 'navigate_to_step'.
           - Se disser "Adicione a empresa X", use 'add_party'.
           - Se disser "O advogado da empresa X é o Dr. Y", use 'update_party_details'.
        3. **SUPORTE:** Tire dúvidas sobre como usar o sistema baseando-se no CONTEXTO DO SISTEMA fornecido acima. Se o usuário perguntar "Como uso a voz?", responda com base no manual.
        
        DIRETRIZES:
        - Sempre que possível, execute a ação solicitada via Tool.
        - Seja conciso e profissional.
      `;

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: getTools() }],
        },
      });
      
      chatSessionRef.current = chat;
      return chat;
    } catch (error) {
      console.error("Erro ao inicializar IA:", error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue;
    setInputValue('');
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      let chat = chatSessionRef.current;
      if (!chat) {
        chat = await initializeChat();
      }

      if (chat) {
        const promptWithContext = `
--- ESTADO ATUAL (JSON) ---
${JSON.stringify(ataData, null, 2)}
---------------------------
USUÁRIO: ${userMsg}
        `;

        let result = await chat.sendMessage({ message: promptWithContext });
        
        while (result.functionCalls && result.functionCalls.length > 0) {
            const functionCall = result.functionCalls[0];
            
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: `⚙️ Processando: ${functionCall.name}...`, 
                timestamp: new Date() 
            }]);

            const toolResponsePart = executeFunctionCall(functionCall);
            // @ts-ignore
            result = await chat.sendMessage({ message: [toolResponsePart] });
        }

        if (result.text) {
             setMessages(prev => [...prev, { 
                role: 'model', 
                text: result.text, 
                timestamp: new Date() 
            }]);
        }
      }
    } catch (error) {
      console.error("Erro IA:", error);
      let errorMsg = "Erro ao processar.";
      if (error instanceof Error && (error.message.includes("API_KEY") || error.message.includes("400"))) {
          errorMsg = "Erro de Configuração da API Key.";
      }
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: errorMsg, 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
      setInputValue(suggestion);
      // Pequeno hack para focar no input após clicar na sugestão, se necessário
      setTimeout(() => {
          const input = document.querySelector('input[placeholder="Digite ou fale com a IA..."]') as HTMLInputElement;
          if(input) input.focus();
      }, 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-700 transition-all z-40 flex items-center gap-2 animate-bounce-subtle"
        title="Abrir Assistente IA"
      >
        <span className="text-2xl">🤖</span>
        <span className="font-semibold hidden md:inline">Assistente IA</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl z-40 flex flex-col border border-gray-200 transition-all duration-300 ${isExpanded ? 'w-[600px] h-[80vh]' : 'w-[350px] h-[600px]'}`}>
      {/* Header */}
      <div className="bg-brand-600 text-white p-3 rounded-t-lg flex justify-between items-center cursor-pointer" onClick={() => !isExpanded && setIsExpanded(true)}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-sm">Assistente Gemini</h3>
            <p className="text-xs text-brand-100">Navegação & Voz Ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                className="text-brand-100 hover:text-white p-1"
                title={isExpanded ? "Restaurar tamanho" : "Expandir"}
            >
                {isExpanded ? '↙️' : '↗️'}
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                className="text-brand-100 hover:text-white p-1 font-bold"
            >
                ✕
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-brand-100 text-brand-900 rounded-br-none border border-brand-200' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white p-3 rounded-lg rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões Rápidas */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <div className="flex gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
                <button 
                    key={idx}
                    onClick={() => handleSuggestionClick(prompt)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors shadow-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-200 font-bold' : 'bg-white border-brand-200 text-brand-700 hover:bg-brand-50'}`}
                >
                    {prompt}
                </button>
            ))}
          </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200 rounded-b-lg">
        <div className="flex gap-2 items-center">
          <VoiceInput
            value={inputValue}
            onChange={setInputValue}
            onKeyDown={handleKeyPress}
            placeholder="Digite ou fale com a IA..."
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-brand-600 text-white p-2 rounded-md hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors h-10 w-12 flex items-center justify-center shrink-0"
          >
            Env
          </button>
        </div>
        <div className="mt-2 text-[10px] text-gray-400 text-center flex justify-center items-center gap-1">
             <span>🎤 Use o microfone para ditar comandos.</span>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
