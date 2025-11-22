import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Verifica compatibilidade do navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continua ouvindo mesmo após pausas
      recognition.interimResults = true; // Mostra resultados parciais enquanto fala
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let finalTranscriptChunk = '';
        let interimTranscriptChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptChunk += event.results[i][0].transcript;
          } else {
            interimTranscriptChunk += event.results[i][0].transcript;
          }
        }
        
        // Atualiza o transcript final
        if (finalTranscriptChunk) {
            setTranscript(prev => {
                // Adiciona espaço se já houver texto
                const newTranscript = prev ? `${prev} ${finalTranscriptChunk}` : finalTranscriptChunk;
                return newTranscript;
            });
        }
        
        setInterimTranscript(interimTranscriptChunk);
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento de fala:', event.error);
        if (event.error === 'not-allowed') {
            alert("Permissão de microfone negada. Verifique as configurações do navegador.");
            setIsListening(false);
        } else if (event.error === 'no-speech') {
             // Não faz nada, apenas silêncio detectado
             return; 
        } else {
             setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Erro ao iniciar escuta:", e);
        // Se o navegador achar que já está rodando, forçamos o estado visual
        setIsListening(true);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const hasRecognitionSupport = !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    hasRecognitionSupport,
    setTranscript // Exportado para permitir limpar o buffer externamente
  };
};