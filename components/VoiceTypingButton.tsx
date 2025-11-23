import React, { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  rows?: number;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

// Ícone de Microfone
const MicIcon = ({ isListening }: { isListening: boolean }) => (
    <div className={`transition-all duration-300 ${isListening ? 'text-red-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
        {isListening ? (
             <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </span>
            </span>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        )}
    </div>
);

export const VoiceTextarea: React.FC<VoiceComponentProps> = ({ value, onChange, className = '', disabled, ...props }) => {
  const { isListening, transcript, interimTranscript, startListening, stopListening, hasRecognitionSupport, setTranscript } = useSpeechRecognition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Ref para guardar o valor mais recente sem disparar o useEffect do transcript
  const valueRef = useRef(value);

  // Mantém a ref atualizada com o valor vindo das props
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Commit do texto final (Transcript) para o valor do input
  useEffect(() => {
    if (transcript) {
      const cleanTranscript = transcript.trim();
      if (!cleanTranscript) {
          setTranscript('');
          return;
      }

      // Lê o valor atual da ref
      const currentValue = valueRef.current || '';
      const currentValueTrimmed = currentValue.trim();

      // --- DEDUPLICAÇÃO DE SEGURANÇA ---
      // Verifica se o texto atual já termina com o que foi ditado.
      // Ex: Texto: "Advogado", Ditado: "Advogado". Resultado esperado: "Advogado".
      if (currentValueTrimmed.toLowerCase().endsWith(cleanTranscript.toLowerCase())) {
          setTranscript(''); // Limpa e ignora
          return;
      }

      const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
      const newValue = currentValue ? `${currentValue}${separator}${cleanTranscript}` : cleanTranscript;
      
      onChange(newValue);
      setTranscript(''); // Limpa o buffer do hook após usar
    }
  }, [transcript, onChange, setTranscript]); 

  const toggleListening = () => {
    if (disabled) return;
    if (isListening) stopListening();
    else startListening();
    
    // Focar no textarea ao iniciar/parar para melhor UX
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Valor visual: Valor real + Texto provisório (Interim)
  const displayValue = isListening && interimTranscript 
    ? (value ? `${value} ${interimTranscript}` : interimTranscript) 
    : value;

  return (
    <div className="relative group w-full">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${className} pr-10 transition-colors duration-200 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${isListening ? 'border-red-300 ring-1 ring-red-100 bg-red-50/10' : ''}`} 
        {...props}
      />
      {hasRecognitionSupport && !disabled && (
        <button
          type="button"
          onClick={toggleListening}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-gray-100 border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 z-10 cursor-pointer"
          title={isListening ? "Parar (clique para finalizar)" : "Digitar por voz"}
        >
          <MicIcon isListening={isListening} />
        </button>
      )}
    </div>
  );
};

export const VoiceInput: React.FC<VoiceComponentProps> = ({ value, onChange, className = '', disabled, ...props }) => {
    const { isListening, transcript, interimTranscript, startListening, stopListening, hasRecognitionSupport, setTranscript } = useSpeechRecognition();
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Ref para guardar o valor mais recente
    const valueRef = useRef(value);

    useEffect(() => {
      valueRef.current = value;
    }, [value]);
  
    useEffect(() => {
      if (transcript) {
        const cleanTranscript = transcript.trim();
        if (!cleanTranscript) {
            setTranscript('');
            return;
        }

        const currentValue = valueRef.current || '';
        const currentValueTrimmed = currentValue.trim();

        // --- DEDUPLICAÇÃO DE SEGURANÇA ---
        if (currentValueTrimmed.toLowerCase().endsWith(cleanTranscript.toLowerCase())) {
            setTranscript('');
            return;
        }

        const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
        const newValue = currentValue ? `${currentValue}${separator}${cleanTranscript}` : cleanTranscript;
        
        onChange(newValue);
        setTranscript('');
      }
    }, [transcript, onChange, setTranscript]);
  
    const toggleListening = () => {
      if (disabled) return;
      if (isListening) stopListening();
      else startListening();

      if (inputRef.current) inputRef.current.focus();
    };
  
    const displayValue = isListening && interimTranscript 
      ? (value ? `${value} ${interimTranscript}` : interimTranscript) 
      : value;
  
    return (
      <div className="relative group w-full">
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${className} pr-10 w-full transition-colors duration-200 disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${isListening ? 'border-red-300 ring-1 ring-red-100 bg-red-50/10' : ''}`}
          {...props}
        />
        {hasRecognitionSupport && !disabled && (
          <button
            type="button"
            onClick={toggleListening}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 p-1.5 rounded-md bg-white/80 hover:bg-gray-100 border border-transparent hover:border-gray-200 focus:outline-none z-10 cursor-pointer"
            title={isListening ? "Parar" : "Voz"}
          >
             <MicIcon isListening={isListening} />
          </button>
        )}
      </div>
    );
};

// Mantendo o export default para compatibilidade
const VoiceTypingButton: React.FC<{ onTextReceived: (text: string) => void; className?: string }> = ({ onTextReceived, className }) => {
    const { isListening, transcript, startListening, stopListening, hasRecognitionSupport, setTranscript } = useSpeechRecognition();

    useEffect(() => {
        if (transcript) {
            onTextReceived(transcript);
            setTranscript('');
        }
    }, [transcript, onTextReceived, setTranscript]);

    if (!hasRecognitionSupport) return null;

    return (
        <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-full ${className} ${isListening ? 'text-red-600 bg-red-100' : 'text-gray-500 bg-gray-100'}`}
        >
             <MicIcon isListening={isListening} />
        </button>
    );
}

export default VoiceTypingButton;