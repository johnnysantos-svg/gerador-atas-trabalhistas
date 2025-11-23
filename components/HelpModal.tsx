
import React, { useState } from 'react';
import { MANUAL_DATA } from '../constants';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [openSection, setOpenSection] = useState<string | null>('intro');

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

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
            {MANUAL_DATA.map((section) => (
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
                    {section.text.split('\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-2 last:mb-0">{paragraph}</p>
                    ))}
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
