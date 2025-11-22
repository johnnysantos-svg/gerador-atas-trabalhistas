
import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [openSection, setOpenSection] = useState<string | null>('intro');

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections: ManualSection[] = [
    {
      id: 'intro',
      title: 'Visão Geral',
      icon: '👋',
      content: (
        <p>
          Bem-vindo ao <strong>Gerador de Atas Trabalhistas</strong>. Esta ferramenta foi desenhada para agilizar a criação de atas de audiência, permitindo preenchimento manual, colagem de dados do PJe e ditado por voz. O sistema segue um fluxo passo-a-passo lógico, do cabeçalho ao encerramento.
        </p>
      )
    },
    {
      id: 'voice',
      title: 'Digitação por Voz',
      icon: '🎤',
      content: (
        <div className="space-y-2">
          <p>
            A maioria dos campos de texto possui um ícone de microfone no canto direito.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li><strong>Para usar:</strong> Clique no ícone do microfone ou dentro do campo.</li>
            <li><strong>Tempo Real:</strong> O texto aparecerá dentro da caixa enquanto você fala (em cinza/vermelho claro).</li>
            <li><strong>Pausas:</strong> Ao fazer uma pausa na fala, o sistema confirma o texto e o adiciona ao conteúdo existente.</li>
            <li><strong>Permissão:</strong> É necessário autorizar o uso do microfone no navegador.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'flow',
      title: 'Navegação Passo-a-Passo',
      icon: '👣',
      content: (
        <div className="space-y-2">
          <p>O sistema é dividido em 6 etapas principais (botões no topo):</p>
          <ol className="list-decimal pl-5 space-y-1 text-gray-700">
            <li><strong>Início:</strong> Configuração do cabeçalho (Juiz, Vara, Processo).</li>
            <li><strong>Partes:</strong> Cadastro de Reclamante(s), Reclamada(s) e Advogados.</li>
            <li><strong>Conciliação:</strong> Termos de acordo ou rejeição da proposta.</li>
            <li><strong>Contestação/Réplica:</strong> Registro da defesa e prazos.</li>
            <li><strong>Atos Processuais:</strong> O coração da ata (Perícias, Depoimentos, Adiamentos).</li>
            <li><strong>Encerramento:</strong> Horário final e texto livre.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'acts',
      title: 'Atos Processuais e Ordenação',
      icon: '⚡',
      content: (
        <div className="space-y-2">
          <p>
            Na etapa <strong>5. Atos Processuais</strong>, você pode selecionar múltiplos eventos que ocorreram na audiência (ex: Perícia + Gravação).
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li><strong>Múltipla Escolha:</strong> Clique nos cartões para ativar/desativar um ato.</li>
            <li><strong>Reordenação:</strong> Se selecionar mais de um ato, uma lista aparecerá. <strong>Arraste e solte</strong> os itens para definir a ordem em que aparecerão no texto final da ata.</li>
            <li><strong>Gravação:</strong> A opção "Gravação de Instrução" permite cadastrar testemunhas e gera automaticamente os textos da LGPD e encerramento da instrução.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'templates',
      title: 'Templates e Ocorrências',
      icon: '📝',
      content: (
        <div className="space-y-2">
          <p>
            Na etapa de Atos Processuais (opção "Outras Ocorrências") e no Encerramento, você encontrará botões de <strong>Templates Rápidos</strong>.
          </p>
          <p>
            Clique neles para inserir textos jurídicos prontos (ex: Ausência do Reclamante, Protestos, etc.). Você pode criar seus próprios textos no menu de configurações (⚙️).
          </p>
        </div>
      )
    },
    {
      id: 'ai',
      title: 'Assistente Jurídico (IA)',
      icon: '🤖',
      content: (
        <p>
          No canto inferior direito, há um botão flutuante do Assistente. Ele utiliza Inteligência Artificial (Gemini) e tem acesso aos dados que você já preencheu no formulário. Use-o para pedir sugestões de redação, resumir fatos ou formatar textos de acordos complexos.
        </p>
      )
    },
    {
      id: 'export',
      title: 'Finalização e Exportação',
      icon: '💾',
      content: (
        <div className="space-y-2">
          <p>
            Ao finalizar, você entra no "Modo Zen" (visualização de tela cheia).
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li><strong>Copiar:</strong> Copia o texto formatado (HTML) para colar diretamente no PJe.</li>
            <li><strong>Exportar .docx:</strong> Baixa um arquivo Word formatado (incluindo Brasão).</li>
            <li><strong>Salvar Automático:</strong> O sistema salva seu progresso no navegador automaticamente.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>📚</span> Manual Rápido do Sistema
            </h2>
            <p className="text-brand-100 text-sm mt-1">Guia de utilização do Gerador de Atas</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 bg-brand-700 hover:bg-brand-800 rounded-full p-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${openSection === section.id ? 'bg-brand-50 text-brand-800' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="text-xl">{section.icon}</span>
                    <span>{section.title}</span>
                  </div>
                  <span className={`transform transition-transform duration-200 ${openSection === section.id ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {openSection === section.id && (
                  <div className="p-4 border-t border-gray-100 text-sm leading-relaxed text-gray-600 bg-white animate-slide-down">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t text-right">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-medium shadow-sm transition-all"
          >
            Entendi, vamos começar!
          </button>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;
