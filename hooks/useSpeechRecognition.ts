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
  const isListeningRef = useRef(false); // Ref to track user intent synchronously

  useEffect(() => {
    // Verifica compatibilidade do navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      // 'continuous: false' is more stable on mobile (prevents duplication bugs)
      // We implement "continuous" behavior by auto-restarting in onend
      recognition.continuous = false; 
      recognition.interimResults = true; 
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
                // Adiciona espaço se já houver texto no buffer temporário (raro com continuous: false, mas seguro)
                const newTranscript = prev ? `${prev} ${finalTranscriptChunk}` : finalTranscriptChunk;
                return newTranscript;
            });
        }
        
        setInterimTranscript(interimTranscriptChunk);
      };

      recognition.onerror = (event: any) => {
        // 'no-speech' and 'aborted' are common, non-critical errors
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
             console.error('Erro no reconhecimento de fala:', event.error);
        }
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            alert("Permissão de microfone negada ou indisponível.");
            isListeningRef.current = false;
            setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart mechanism
        if (isListeningRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // If start fails unexpectedly, sync state to false
                console.debug("Failed to restart recognition", e);
                isListeningRef.current = false;
                setIsListening(false);
            }
        } else {
            setIsListening(false);
            setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
      } catch (e) {
        console.error("Erro ao iniciar escuta:", e);
        setIsListening(true); // Optimistic UI update
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, []);

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