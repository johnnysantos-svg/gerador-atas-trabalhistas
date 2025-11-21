import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { AtaData } from '../types';

interface ChatAssistantProps {
  ataData: AtaData;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ ataData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Olá! Sou seu assistente jurídico. Posso ajudar a redigir tópicos, sugerir fundamentações ou revisar o texto da ata. Como posso ajudar?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Referência para manter a sessão do chat
  const chatSessionRef = useRef<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const initializeChat = async () => {
    // Verifica process.env.API_KEY (injetado pelo Vite/Vercel)
    if (!process.env.API_KEY) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: '⚠️ ERRO DE CONFIGURAÇÃO: A chave da API (API_KEY) não foi encontrada. Se você está no Vercel, vá em Settings > Environment Variables e adicione a chave API_KEY com o valor da sua credencial Gemini.',
        timestamp: new Date()
      }]);
      return null;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Contexto do sistema (Persona)
      const systemInstruction = `
        Você é um assistente jurídico especializado em Audiências Trabalhistas (CLT) e Processo do Trabalho no Brasil.
        Seu objetivo é auxiliar na redação de atas de audiência.
        
        DIRETRIZES:
        1. Responda de forma concisa, formal e jurídica.
        2. Ao sugerir textos para a ata, use linguagem impessoal (terceira pessoa).
        3. Se o usuário pedir para redigir um acordo ou texto, USE ESTRITAMENTE OS NOMES E DADOS fornecidos no contexto da mensagem.
        4. Se os dados (como nomes das partes) estiverem vazios no contexto JSON, avise o usuário que o campo parece vazio.
        5. Citação de leis: Use a CLT, CPC e Súmulas do TST quando pertinente.
      `;

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
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
    
    // Mostra a mensagem do usuário na tela
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      let chat = chatSessionRef.current;
      if (!chat) {
        chat = await initializeChat();
      }

      if (chat) {
        // Envia o estado ATUAL da ata (JSON) junto com a mensagem
        // Isso garante que a IA veja o que o usuário acabou de digitar
        const promptWithContext = `
--- CONTEXTO: DADOS ATUAIS DO FORMULÁRIO DA ATA ---
${JSON.stringify(ataData, null, 2)}
---------------------------------------------------
SOLICITAÇÃO DO USUÁRIO:
${userMsg}
        `;

        const result: GenerateContentResponse = await chat.sendMessage({ message: promptWithContext });
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: result.text || "Não foi possível gerar uma resposta.", 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error("Erro na comunicação com a IA:", error);
      let errorMsg = "Desculpe, ocorreu um erro ao processar sua solicitação.";
      if (error instanceof Error && (error.message.includes("API_KEY") || error.message.includes("400"))) {
          errorMsg = "Erro de API Key. Verifique se a variável de ambiente API_KEY está configurada corretamente no Vercel.";
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-700 transition-all z-40 flex items-center gap-2 animate-bounce-subtle"
        title="Abrir Assistente IA"
      >
        <span className="text-2xl">🤖</span>
        <span className="font-semibold hidden md:inline">Assistente Jurídico</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl z-40 flex flex-col border border-gray-200 transition-all duration-300 ${isExpanded ? 'w-[600px] h-[80vh]' : 'w-[350px] h-[500px]'}`}>
      {/* Header */}
      <div className="bg-brand-600 text-white p-3 rounded-t-lg flex justify-between items-center cursor-pointer" onClick={() => !isExpanded && setIsExpanded(true)}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-sm">Assistente Gemini</h3>
            <p className="text-xs text-brand-100">Lendo dados em tempo real</p>
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

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ex: Sugira um texto para acordo..."
            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-brand-600 text-white p-2 rounded-md hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Env
          </button>
        </div>
        <div className="mt-2 text-[10px] text-gray-400 text-center">
            IA conectada aos dados do formulário.
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;