
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AtaData, Perito, Testemunha, Estudante, ConciliacaoStatus, ReplicaPrazo, ContestacaoTipo, AtosProcessuaisOpcao, SectionInputMode, Reclamante, Reclamada, Juiz, TextoPadraoDB, Profile, UserWithProfile } from './types';
import { STEPS, ATOS_PROCESSUAIS_OPTIONS, CONTESTACAO_TEXTS, CONCILIACAO_ACEITA_TEMPLATE, FREE_TEXT_TEMPLATES, REPLICA_TEXTS } from './constants';
import PeritoSelector from './components/PeritoSelector';
import JuizSelector from './components/JuizSelector';
import Preview from './components/Preview';
import { getJuizes, addJuiz, deleteJuiz, getPeritos, addPerito, deletePerito, getTextosPadroes, addTextoPadrao, updateTextoPadrao, deleteTextoPadrao, getCurrentUserProfile, listUsers } from './api';
import { Packer } from 'docx';
import saveAs from 'file-saver';
import { generateDocx, generateAtaHtml } from './ata-generator';
import { Session } from '@supabase/supabase-js';
import { initializeSupabase, getSupabase } from './supabaseClient';
import Auth from './components/Auth';
import UserManagementModal from './components/UserManagementModal';
import ProfileManagementModal from './components/ProfileManagementModal';
import ChatAssistant from './components/ChatAssistant';
import VoiceTypingButton, { VoiceInput, VoiceTextarea } from './components/VoiceTypingButton';
import HelpModal from './components/HelpModal';


const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const getInitialAtaData = (): AtaData => {
  return {
    preencherDadosIniciais: true,
    headerMode: SectionInputMode.MANUAL,
    headerPastedText: '',
    tribunalRegiao: '19',
    dataAudiencia: '',
    varaTrabalho: '',
    juizNome: '',
    tipoAcao: '',
    numeroProcesso: '',
    incluirParagrafoIntrodutorio: true,
    aberturaMode: SectionInputMode.DEFAULT,
    aberturaPastedText: '',
    aberturaHora: '',
    participacaoVideoconferencia: false,
    reclamanteMode: SectionInputMode.MANUAL,
    reclamantePastedText: '',
    reclamantes: [{ id: uniqueId(), nome: '', comparecimento: 'pessoalmente', advogado: '' }],
    reclamadaMode: SectionInputMode.MANUAL,
    reclamadaPastedText: '',
    reclamadas: [{ id: uniqueId(), nome: '', representante: '', advogado: '' }],
    estudanteMode: SectionInputMode.MANUAL,
    estudantePastedText: '',
    estudantes: [],
    conciliacaoStatus: undefined,
    conciliacaoTermos: '',
    contestacaoTipo: undefined,
    contestacaoTexto: '',
    replicaPrazo: undefined,
    replicaTexto: '',
    observacoesGerais: '',
    atosProcessuaisOpcoes: [],
    orderedAtos: [],
    livreTextoPosicao: 'depois',
    instrucaoData: '',
    instrucaoHora: '',
    adiamentoMotivo: '',
    adiamentoData: '',
    adiamentoHora: '',
    periciaMedicaPerito: '',
    periciaMedicaDoenca: '',
    periciaMedicaContatoReclamante: '',
    periciaMedicaContatoAdvogado: '',
    periciaMedicaContatoReclamada: '',
    periciaMedicaEmailReclamada: '',
    periciaInsalubridadePerito: '',
    periciaInsalubridadeTipo: 'ADICIONAL DE INSALUBRIDADE',
    periciaInsalubridadeContatoReclamante: '',
    periciaInsalubridadeContatoAdvogado: '',
    periciaInsalubridadeContatoReclamada: '',
    periciaContabilPerito: '',
    gravacaoTopicos: '',
    gravacaoTestemunhasReclamante: [],
    gravacaoTestemunhasReclamada: [],
    gravacaoSemTestemunhasReclamante: false,
    gravacaoSemTestemunhasReclamada: false,
    contraditaTexto: '',
    gravacaoRazoesFinais: 'remissivas',
    gravacaoRazoesFinaisTexto: '',
    livreTexto: '',
    encerramentoHora: '',
    textoLivreEncerramento: '',
  };
};

type FreeTextTemplates = Record<string, { title: string; text: string }[]>;

// Convert default templates to the DB format so they can be displayed in the modal.
const defaultTemplatesAsDb: Omit<TextoPadraoDB, 'user_id'>[] = Object.entries(FREE_TEXT_TEMPLATES).flatMap(([category, templates]) => 
    templates.map((template, index) => ({
        // Use a unique but identifiable ID for defaults.
        id: `default-${category.replace(/\s+/g, '')}-${index}`, 
        category,
        title: template.title,
        text: template.text,
    }))
);

// Modal de Confirmação de Reset
interface ResetConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
             <div className="bg-white rounded-lg shadow-xl w-[95%] max-w-md p-6 flex flex-col modal-animate" onClick={e => e.stopPropagation()}>
                <div className="flex items-center mb-4 text-red-600">
                     <span className="text-3xl mr-3">⚠️</span>
                     <h3 className="text-xl font-bold text-gray-900">Reiniciar Ata?</h3>
                </div>
                <p className="text-gray-600 mb-6 text-base leading-relaxed">
                    Tem certeza que deseja <strong>apagar todos os dados</strong> preenchidos e começar um documento do zero? <br/><br/>
                    Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-end space-x-3 mt-auto">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">Cancelar</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors shadow-sm">Sim, Limpar Tudo</button>
                </div>
             </div>
        </div>
    )
}

interface CadastroModalProps {
    isOpen: boolean;
    onClose: () => void;
    juizes: Juiz[];
    setJuizes: React.Dispatch<React.SetStateAction<Juiz[]>>;
    peritos: Perito[];
    setPeritos: React.Dispatch<React.SetStateAction<Perito[]>>;
}

const CadastroModal: React.FC<CadastroModalProps> = ({ isOpen, onClose, juizes, setJuizes, peritos, setPeritos }) => {
    const [activeTab, setActiveTab] = useState<'juizes' | 'peritos'>('juizes');
    const [newJuizName, setNewJuizName] = useState('');
    const [newPeritoName, setNewPeritoName] = useState('');

    if (!isOpen) return null;

    const handleAddJuiz = async () => {
        if (newJuizName.trim()) {
            try {
                const newJuiz = await addJuiz(newJuizName.trim().toUpperCase());
                setJuizes(prev => [...prev, newJuiz].sort((a, b) => a.nome.localeCompare(b.nome)));
                setNewJuizName('');
            } catch (error) {
                console.error("Erro ao adicionar juiz:", error);
                alert("Falha ao adicionar juiz. Verifique o console para mais detalhes.");
            }
        }
    };
    
    const handleDeleteJuiz = async (id: string) => {
       try {
            await deleteJuiz(id);
            setJuizes(prev => prev.filter(j => j.id !== id));
        } catch (error) {
            console.error("Erro ao remover juiz:", error);
            alert("Falha ao remover juiz. Verifique o console para mais detalhes.");
        }
    };

    const handleAddPerito = async () => {
        if (newPeritoName.trim()) {
           try {
                const newPerito = await addPerito(newPeritoName.trim().toUpperCase());
                setPeritos(prev => [...prev, newPerito].sort((a, b) => a.nome.localeCompare(b.nome)));
                setNewPeritoName('');
            } catch (error) {
                console.error("Erro ao adicionar perito:", error);
                alert("Falha ao adicionar perito. Verifique o console para mais detalhes.");
            }
        }
    };

    const handleDeletePerito = async (id: string) => {
        try {
            await deletePerito(id);
            setPeritos(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Erro ao remover perito:", error);
            alert("Falha ao remover perito. Verifique o console para mais detalhes.");
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-[95%] md:w-full md:max-w-2xl max-h-[80vh] flex flex-col modal-animate" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Gerenciar Cadastros</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-2xl">&times;</button>
                </div>
                <div className="border-b">
                    <nav className="flex space-x-4 px-4">
                        <button onClick={() => setActiveTab('juizes')} className={`py-3 px-1 border-b-2 font-medium ${activeTab === 'juizes' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Juízes</button>
                        <button onClick={() => setActiveTab('peritos')} className={`py-3 px-1 border-b-2 font-medium ${activeTab === 'peritos' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Peritos</button>
                    </nav>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {activeTab === 'juizes' && (
                        <div>
                            <ul className="space-y-2 mb-4">
                                {juizes.map(juiz => (
                                    <li key={juiz.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{juiz.nome}</span>
                                        <button onClick={() => handleDeleteJuiz(juiz.id)} className="text-red-500 hover:text-red-700 font-semibold px-2">Remover</button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex space-x-2">
                                <input type="text" value={newJuizName} onChange={e => setNewJuizName(e.target.value)} placeholder="Nome do Juiz" className="flex-grow p-2 border rounded" onKeyDown={(e) => e.key === 'Enter' && handleAddJuiz()}/>
                                <button onClick={handleAddJuiz} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">Adicionar</button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'peritos' && (
                         <div>
                            <ul className="space-y-2 mb-4">
                                {peritos.map(perito => (
                                    <li key={perito.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{perito.nome}</span>
                                        <button onClick={() => handleDeletePerito(perito.id)} className="text-red-500 hover:text-red-700 font-semibold px-2">Remover</button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex space-x-2">
                                <input type="text" value={newPeritoName} onChange={e => setNewPeritoName(e.target.value)} placeholder="Nome do Perito" className="flex-grow p-2 border rounded" onKeyDown={(e) => e.key === 'Enter' && handleAddPerito()} />
                                <button onClick={handleAddPerito} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">Adicionar</button>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="p-4 bg-gray-50 border-t text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Fechar</button>
                </div>
            </div>
        </div>
    );
};

interface TextosPadroesModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: TextoPadraoDB[];
    onDataChange: () => Promise<void>; // Updated return type to Promise
}

const TextosPadroesModal: React.FC<TextosPadroesModalProps> = ({ isOpen, onClose, templates, onDataChange }) => {
    const [editingTemplate, setEditingTemplate] = useState<Partial<TextoPadraoDB> | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const groupedTemplates = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
            acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
    }, {} as Record<string, TextoPadraoDB[]>);
    
    const categories = Object.keys(groupedTemplates).sort();

    const handleEdit = (template: TextoPadraoDB) => {
        setEditingTemplate({ ...template });
    };
    
    const handleAddNew = () => {
        setEditingTemplate({ category: '', title: '', text: '' });
    };

    const handleDelete = async (id: string) => {
        if (id.startsWith('default-')) {
            alert('Textos padrão do sistema não podem ser excluídos.');
            return;
        }
        
        if (!window.confirm("Tem certeza que deseja excluir este texto padrão? A ação não pode ser desfeita.")) {
            return;
        }

        setDeletingIds(prev => new Set(prev).add(id));

        try {
            await deleteTextoPadrao(id);
            await onDataChange(); 
        } catch (error) {
            console.error("Erro ao excluir texto padrão:", error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Não foi possível excluir o texto:\n\n${message}`);
        } finally {
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };
    
    const handleSave = async () => {
        if (!editingTemplate || !editingTemplate.category?.trim() || !editingTemplate.title?.trim() || !editingTemplate.text?.trim()) {
            alert("Por favor, preencha Categoria, Título e Texto.");
            return;
        }

        try {
            const { id, category, title, text } = editingTemplate;
            if (id && !id.startsWith('default-')) {
                await updateTextoPadrao(id, { category, title, text });
            } else {
                await addTextoPadrao({ category, title, text });
            }
            await onDataChange(); 
            setEditingTemplate(null);
        } catch (error) {
            console.error("Erro ao salvar texto padrão:", error);
            alert("Falha ao salvar texto.");
        }
    };


    const handleFormChange = (field: keyof Omit<TextoPadraoDB, 'id' | 'user_id'>, value: string) => {
        setEditingTemplate(prev => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-[95%] md:w-full md:max-w-4xl max-h-[90vh] flex flex-col modal-animate" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Gerenciar Textos Padrão</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                             <h3 className="text-lg font-semibold">Textos existentes</h3>
                             <button onClick={handleAddNew} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 md:hidden">+ Novo</button>
                        </div>
                        {categories.map(category => (
                            <div key={category}>
                                <h4 className="font-bold text-brand-700 text-sm">{category}</h4>
                                <ul className="ml-2 md:ml-4 space-y-1 mt-1">
                                    {groupedTemplates[category].map(template => (
                                        <li key={template.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm p-2 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-colors gap-2 sm:gap-0">
                                            <span className="font-medium text-gray-700">{template.title}</span>
                                            <div className="space-x-3 flex items-center self-end sm:self-auto">
                                                <button onClick={() => handleEdit(template)} className="text-blue-600 hover:underline text-xs font-semibold p-1">Editar</button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDelete(template.id);
                                                    }} 
                                                    className={`text-red-600 hover:underline text-xs font-semibold p-1 ${template.id.startsWith('default-') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={template.id.startsWith('default-') || deletingIds.has(template.id)}
                                                    title={template.id.startsWith('default-') ? 'Textos padrão do sistema não podem ser excluídos' : 'Excluir texto padrão'}
                                                >
                                                    {deletingIds.has(template.id) ? '...' : 'Excluir'}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    
                    <div className={`md:block ${editingTemplate ? 'block' : 'hidden'}`}>
                         <h3 className="text-lg font-semibold border-b pb-2 mb-4">{editingTemplate?.id && !editingTemplate.id.startsWith('default-') ? 'Editando Texto' : 'Adicionar Novo Texto'}</h3>
                         {editingTemplate ? (
                             <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <label className="block text-sm font-medium">Categoria</label>
                                    <input type="text" value={editingTemplate.category || ''} onChange={e => handleFormChange('category', e.target.value.toUpperCase())} className="w-full p-2 border rounded" list="categories-datalist"/>
                                    <datalist id="categories-datalist">
                                        {categories.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Título</label>
                                    <input type="text" value={editingTemplate.title || ''} onChange={e => handleFormChange('title', e.target.value.toUpperCase())} className="w-full p-2 border rounded"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Texto</label>
                                    <textarea value={editingTemplate.text || ''} onChange={e => handleFormChange('text', e.target.value)} rows={8} className="w-full p-2 border rounded"></textarea>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                                    <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded">Salvar</button>
                                </div>
                            </div>
                         ) : (
                            <div className="text-center p-4 border-2 border-dashed rounded-lg h-full flex flex-col justify-center items-center bg-gray-50 min-h-[200px]">
                                <p className="text-gray-500 mb-4">Selecione um texto da lista para editar ou clique abaixo para criar um novo.</p>
                                <button onClick={handleAddNew} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm">
                                    + Adicionar Novo Texto
                                </button>
                            </div>
                         )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Fechar</button>
                </div>
            </div>
        </div>
    );
};

const SupabaseConfigModal: React.FC<{ isOpen: boolean; onSave: (url: string, key: string) => void; }> = ({ isOpen, onSave }) => {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (url.trim() && key.trim()) {
            onSave(url.trim(), key.trim());
        } else {
            alert('Por favor, preencha a URL e a Chave Anon.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-[95%] max-w-md modal-animate">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold">Configurar Conexão com Supabase</h2>
                    <p className="text-sm text-gray-600 mt-1">Por favor, insira a URL e a Chave Pública (anon) do seu projeto Supabase.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="supabase-url" className="block text-sm font-medium text-gray-700">URL do Projeto</label>
                        <input
                            type="text"
                            id="supabase-url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://[ID-DO-PROJETO].supabase.co"
                            className="mt-1 block w-full p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="supabase-key" className="block text-sm font-medium text-gray-700">Chave Anon (Pública)</label>
                        <input
                            type="text"
                            id="supabase-key"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            placeholder="eyJhbGciOiJI..."
                            className="mt-1 block w-full p-2 border rounded-md"
                        />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t text-right">
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">Salvar e Conectar</button>
                </div>
            </div>
        </div>
    );
};

interface FreeTextSectionProps {
    ataData: AtaData;
    handleDataChange: <K extends keyof AtaData>(key: K, value: AtaData[K]) => void;
    textosPadroes: FreeTextTemplates;
    isCumulative?: boolean;
    rows?: number;
}

const FreeTextSection: React.FC<FreeTextSectionProps> = ({ 
    ataData, 
    handleDataChange, 
    textosPadroes, 
    isCumulative = true, 
    rows = 10 
}) => {
    
  return (
    <div className={isCumulative ? "mt-8 pt-6 border-t border-gray-200" : ""}>
       
       <div className="mb-4">
        <h4 className="font-semibold mb-2 text-gray-800">Opção F: Templates Rápidos</h4>
        <div className="flex flex-wrap gap-2">
            {Object.entries(textosPadroes).map(([category, templates]) => (
                <div key={category} className="w-full mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{category}</p>
                    <div className="flex flex-wrap gap-2">
                        {(templates as { title: string; text: string }[]).map(template => (
                            <button 
                                key={template.title} 
                                onClick={() => handleDataChange('livreTexto', ataData.livreTexto + template.text + '\n\n')} 
                                className="text-xs sm:text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100 transition-colors active:bg-blue-200"
                            >
                                {template.title}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
       </div>
       
       {!isCumulative ? (
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold">Texto Livre/Outras Ocorrências</h2>
            </div>
       ) : (
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-700">Texto Livre/Outras Ocorrências</h3>
            </div>
       )}

      {isCumulative && (
          <>
            <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                 <label className="text-sm font-medium text-gray-700">Posição na Ata:</label>
                 <div className="flex space-x-2 w-full sm:w-auto">
                    <button 
                        onClick={() => handleDataChange('livreTextoPosicao', 'antes')} 
                        className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs sm:text-sm rounded ${ataData.livreTextoPosicao === 'antes' ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Antes dos Atos
                    </button>
                    <button 
                        onClick={() => handleDataChange('livreTextoPosicao', 'depois')} 
                        className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs sm:text-sm rounded ${ataData.livreTextoPosicao === 'depois' ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Depois dos Atos
                    </button>
                 </div>
            </div>

            <div className="mb-2">
                <p className="text-sm text-gray-500">
                    O texto inserido aqui será adicionado à ata, juntamente com a opção principal selecionada.
                </p>
            </div>
          </>
       )}

      <VoiceTextarea 
        value={ataData.livreTexto} 
        onChange={val => handleDataChange('livreTexto', val)} 
        rows={rows} 
        className="w-full p-2 border rounded" 
        placeholder={isCumulative ? "Digite ou cole outras ocorrências aqui..." : "Digite aqui..."}
      />
    </div>
  );
};

const AtoFormPart: React.FC<{
    option: typeof ATOS_PROCESSUAIS_OPTIONS[number];
    ataData: AtaData;
    handleDataChange: <K extends keyof AtaData>(key: K, value: AtaData[K]) => void;
    peritos: Perito[];
    removeTestemunha: (type: 'Reclamante' | 'Reclamada', index: number) => void;
    updateTestemunha: (type: 'Reclamante' | 'Reclamada', index: number, field: keyof Testemunha, value: string) => void;
    addTestemunha: (type: 'Reclamante' | 'Reclamada') => void;
}> = ({ option, ataData, handleDataChange, peritos, removeTestemunha, updateTestemunha, addTestemunha }) => {
    switch(option.id) {
      case AtosProcessuaisOpcao.INICIAL:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><VoiceInput placeholder="Data da próxima audiência (DD/MM/AAAA)" value={ataData.instrucaoData} onChange={val => handleDataChange('instrucaoData', val)} className="p-2 border rounded"/><VoiceInput placeholder="Horário (HH:MM)" value={ataData.instrucaoHora} onChange={val => handleDataChange('instrucaoHora', val)} className="p-2 border rounded"/></div></div>);
      case AtosProcessuaisOpcao.PERICIA_MEDICA:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><div className="space-y-4"><PeritoSelector id="perito-medico" label="Nome do(a) Perito(a)" peritos={peritos} value={ataData.periciaMedicaPerito} onChange={v => handleDataChange('periciaMedicaPerito', v)}/><VoiceInput placeholder="Tipo de doença alegada" value={ataData.periciaMedicaDoenca} onChange={val => handleDataChange('periciaMedicaDoenca', val)} className="p-2 border rounded w-full"/><VoiceInput placeholder="Contato do reclamante (telefone)" value={ataData.periciaMedicaContatoReclamante} onChange={val => handleDataChange('periciaMedicaContatoReclamante', val)} className="p-2 border rounded w-full"/><VoiceInput placeholder="Contato do advogado do reclamante (telefone)" value={ataData.periciaMedicaContatoAdvogado} onChange={val => handleDataChange('periciaMedicaContatoAdvogado', val)} className="p-2 border rounded w-full"/><VoiceInput placeholder="Contato da reclamada (telefone)" value={ataData.periciaMedicaContatoReclamada} onChange={val => handleDataChange('periciaMedicaContatoReclamada', val)} className="p-2 border rounded w-full"/><VoiceInput placeholder="E-mail da reclamada" value={ataData.periciaMedicaEmailReclamada} onChange={val => handleDataChange('periciaMedicaEmailReclamada', val)} className="p-2 border rounded w-full"/></div></div>);
      case AtosProcessuaisOpcao.PERICIA_INSALUBRIDADE:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><div className="space-y-4"><PeritoSelector id="perito-insalubridade" label="Nome do(a) Perito(a)" peritos={peritos} value={ataData.periciaInsalubridadePerito} onChange={v => handleDataChange('periciaInsalubridadePerito', v)}/><select value={ataData.periciaInsalubridadeTipo} onChange={e => handleDataChange('periciaInsalubridadeTipo', e.target.value)} className="p-2 border rounded w-full"><option>ADICIONAL DE INSALUBRIDADE</option><option>ADICIONAL DE PERICULOSIDADE</option><option>ADICIONAL DE INSALUBRIDADE/PERICULOSIDADE</option></select><VoiceInput placeholder="Contato do reclamante (telefone)" value={ataData.periciaInsalubridadeContatoReclamante} onChange={val => handleDataChange('periciaInsalubridadeContatoReclamante', val)} className="p-2 border rounded w-full"/><VoiceInput placeholder="Contato do advogado do reclamante (telefone)" value={ataData.periciaInsalubridadeContatoAdvogado} onChange={val => handleDataChange('periciaInsalubridadeContatoAdvogado', val)} className="p-2 border rounded w-full"/><VoiceInput placeholder="Contato da reclamada (telefone)" value={ataData.periciaInsalubridadeContatoReclamada} onChange={val => handleDataChange('periciaInsalubridadeContatoReclamada', val)} className="p-2 border rounded w-full"/></div></div>);
      case AtosProcessuaisOpcao.PERICIA_CONTABIL:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><div className="space-y-4"><PeritoSelector id="perito-contabil" label="Nome do(a) Perito(a) Contábil" peritos={peritos} value={ataData.periciaContabilPerito} onChange={v => handleDataChange('periciaContabilPerito', v)}/></div></div>);
      case AtosProcessuaisOpcao.GRAVACAO:
            const contraditaTemplate = `Testemunha contraditada por xxxxxx
Interrogada, a testemunha respondeu, conforme gravação.
Pelo Juízo, foi rejeitada (1) / acolhida (2) a contradita, conforme gravação. Consignados os protestos da parte plúrima reclamada
(1)A testemunha foi advertida e compromissada sob as penas da lei /(2) passou a ser ouvida como informante. Aos costumes nada disse. Às perguntas respondeu: GRAVADO`;
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-4">{option.title}</h2>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="font-semibold">Tópicos de prova</label>
                            </div>
                            <VoiceTextarea value={ataData.gravacaoTopicos} onChange={val => handleDataChange('gravacaoTopicos', val)} rows={4} className="w-full p-2 border rounded" placeholder="Um tópico por linha..." />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-2">Testemunhas do Reclamante</h3>
                            <div className="flex items-center mb-2">
                                <input type="checkbox" id="sem-test-reclamante" checked={ataData.gravacaoSemTestemunhasReclamante} onChange={e => handleDataChange('gravacaoSemTestemunhasReclamante', e.target.checked)} className="mr-2"/>
                                <label htmlFor="sem-test-reclamante">Sem testemunhas</label>
                            </div>
                            {!ataData.gravacaoSemTestemunhasReclamante && (
                                <div className="space-y-2">
                                    {ataData.gravacaoTestemunhasReclamante.map((t, i) => (
                                        <div key={t.id} className="p-2 border rounded space-y-2 relative">
                                            <button onClick={() => removeTestemunha('Reclamante', i)} className="absolute top-2 right-2 text-red-500 font-bold">X</button>
                                            <VoiceInput value={t.nome} onChange={val => updateTestemunha('Reclamante', i, 'nome', val)} placeholder="Nome" className="p-2 border rounded w-full"/>
                                            <VoiceInput value={t.cpf} onChange={val => updateTestemunha('Reclamante', i, 'cpf', val)} placeholder="CPF" className="p-2 border rounded w-full"/>
                                            <VoiceInput value={t.endereco} onChange={val => updateTestemunha('Reclamante', i, 'endereco', val)} placeholder="Endereço" className="p-2 border rounded w-full"/>
                                        </div>
                                    ))}
                                    <button onClick={() => addTestemunha('Reclamante')} className="px-4 py-2 bg-gray-200 rounded">+ Adicionar Testemunha</button>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-2">Testemunhas da Reclamada</h3>
                             <div className="flex items-center mb-2">
                                <input type="checkbox" id="sem-test-reclamada" checked={ataData.gravacaoSemTestemunhasReclamada} onChange={e => handleDataChange('gravacaoSemTestemunhasReclamada', e.target.checked)} className="mr-2"/>
                                <label htmlFor="sem-test-reclamada">Sem testemunhas</label>
                            </div>
                            {!ataData.gravacaoSemTestemunhasReclamada && (
                                <div className="space-y-2">
                                    {ataData.gravacaoTestemunhasReclamada.map((t, i) => (
                                         <div key={t.id} className="p-2 border rounded space-y-2 relative">
                                            <button onClick={() => removeTestemunha('Reclamada', i)} className="absolute top-2 right-2 text-red-500 font-bold">X</button>
                                            <VoiceInput value={t.nome} onChange={val => updateTestemunha('Reclamada', i, 'nome', val)} placeholder="Nome" className="p-2 border rounded w-full"/>
                                            <VoiceInput value={t.cpf} onChange={val => updateTestemunha('Reclamada', i, 'cpf', val)} placeholder="CPF" className="p-2 border rounded w-full"/>
                                            <VoiceInput value={t.endereco} onChange={val => updateTestemunha('Reclamada', i, 'endereco', val)} placeholder="Endereço" className="p-2 border rounded w-full"/>
                                        </div>
                                    ))}
                                    <button onClick={() => addTestemunha('Reclamada')} className="px-4 py-2 bg-gray-200 rounded">+ Adicionar Testemunha</button>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <label className="font-semibold" htmlFor="contradita-texto">Contradita de Testemunha (se houver)</label>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleDataChange('contraditaTexto', contraditaTemplate)}
                                    className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1 hover:bg-blue-200"
                                >
                                    Inserir texto modelo
                                </button>
                            </div>
                            <VoiceTextarea 
                                id="contradita-texto"
                                value={ataData.contraditaTexto} 
                                onChange={val => handleDataChange('contraditaTexto', val)} 
                                rows={5} 
                                className="w-full p-2 border rounded" 
                                placeholder={contraditaTemplate}
                            />
                        </div>
                        <div>
                            <label className="font-semibold">Razões Finais</label>
                            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                <button onClick={() => handleDataChange('gravacaoRazoesFinais', 'remissivas')} className={`px-3 py-1 text-sm rounded-md ${ataData.gravacaoRazoesFinais === 'remissivas' ? 'bg-brand-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Remissivas</button>
                                <button onClick={() => handleDataChange('gravacaoRazoesFinais', 'memoriais')} className={`px-3 py-1 text-sm rounded-md ${ataData.gravacaoRazoesFinais === 'memoriais' ? 'bg-brand-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Memoriais (2 dias)</button>
                                <button onClick={() => handleDataChange('gravacaoRazoesFinais', 'memoriais_data')} className={`px-3 py-1 text-sm rounded-md ${ataData.gravacaoRazoesFinais === 'memoriais_data' ? 'bg-brand-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Memoriais (com data)</button>
                                <button onClick={() => handleDataChange('gravacaoRazoesFinais', 'personalizado')} className={`px-3 py-1 text-sm rounded-md ${ataData.gravacaoRazoesFinais === 'personalizado' ? 'bg-brand-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>Personalizado</button>
                            </div>
                            {ataData.gravacaoRazoesFinais === 'personalizado' && (
                                <VoiceTextarea 
                                    value={ataData.gravacaoRazoesFinaisTexto} 
                                    onChange={val => handleDataChange('gravacaoRazoesFinaisTexto', val)} 
                                    rows={3} 
                                    className="w-full p-2 border rounded" 
                                    placeholder="Digite o texto personalizado das razões finais..."
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
      case AtosProcessuaisOpcao.ADIAMENTO_FRACIONAMENTO:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><div className="space-y-4"><VoiceInput placeholder="Motivo do adiamento" value={ataData.adiamentoMotivo} onChange={val => handleDataChange('adiamentoMotivo', val)} className="p-2 border rounded w-full"/><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><VoiceInput placeholder="Data (DD/MM/AAAA)" value={ataData.adiamentoData} onChange={val => handleDataChange('adiamentoData', val)} className="p-2 border rounded"/><VoiceInput placeholder="Horário (HH:MM)" value={ataData.adiamentoHora} onChange={val => handleDataChange('adiamentoHora', val)} className="p-2 border rounded"/></div></div></div>);
      case AtosProcessuaisOpcao.MATERIA_DIREITO:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><p className="p-4 bg-gray-100 rounded">Esta opção irá gerar o texto padrão para encerramento da instrução quando a discussão for exclusivamente de matéria de direito e prova documental.</p></div>);
       case AtosProcessuaisOpcao.SUSPENSAO_PEJOTIZACAO:
          return (<div><h2 className="text-2xl font-bold mb-4">{option.title}</h2><p className="p-4 bg-gray-100 rounded">Esta opção irá gerar o texto padrão para suspensão do processo com base na decisão do STF sobre pejotização.</p></div>);
       default:
        return null;
    }
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formKey, setFormKey] = useState(0); // New state to force form re-mount on reset
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [ataData, setAtaData] = useState<AtaData>(() => {
    const freshInitialState = getInitialAtaData();
    try {
      const savedData = localStorage.getItem('autosavedAtaData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (typeof parsedData === 'object' && parsedData !== null && Object.keys(parsedData).length > 0) {
          console.log("Ata recuperada do salvamento automático, validando estrutura.");
          const mergedData = { ...freshInitialState, ...parsedData };

          const arrayKeys: (keyof AtaData)[] = [
            'reclamantes', 'reclamadas', 'estudantes', 'atosProcessuaisOpcoes',
            'orderedAtos', 'gravacaoTestemunhasReclamante', 'gravacaoTestemunhasReclamada'
          ];

          arrayKeys.forEach(key => {
            const value = mergedData[key];
            if (Array.isArray(value)) {
              (mergedData as any)[key] = value.filter(item => item && typeof item === 'object');
            } else {
              (mergedData as any)[key] = freshInitialState[key];
            }
          });
          
          if (mergedData.reclamantes.length === 0) {
            mergedData.reclamantes = freshInitialState.reclamantes;
          }
          if (mergedData.reclamadas.length === 0) {
            mergedData.reclamadas = freshInitialState.reclamadas;
          }

          return mergedData;
        }
      }
    } catch (error) {
      console.error("Não foi possível carregar a ata salva:", error);
    }
    return freshInitialState;
  });

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [peritos, setPeritos] = useState<Perito[]>([]);
  const [juizes, setJuizes] = useState<Juiz[]>([]);
  const [textosPadroes, setTextosPadroes] = useState<FreeTextTemplates>(FREE_TEXT_TEMPLATES);
  const [allTemplatesRaw, setAllTemplatesRaw] = useState<TextoPadraoDB[]>([]);
  const [isTextosModalOpen, setIsTextosModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserWithProfile[]>([]);

  const [isConfigured, setIsConfigured] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [setupSql, setSetupSql] = useState<string | null>(null);
  const [isDbError, setIsDbError] = useState(false);
  
  const draggedItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const isAdmin = userProfile?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    try {
      localStorage.setItem('autosavedAtaData', JSON.stringify(ataData));
    } catch (error) {
      console.error("Não foi possível salvar a ata automaticamente:", error);
    }
  }, [ataData]);

  useEffect(() => {
    // @ts-ignore
    const pEnv: any = typeof process !== 'undefined' ? process.env : {};
    // @ts-ignore
    const mEnv: any = import.meta?.env || {};

    const envUrl = pEnv.VITE_SUPABASE_URL || mEnv.VITE_SUPABASE_URL;
    const envKey = pEnv.VITE_SUPABASE_ANON_KEY || mEnv.VITE_SUPABASE_ANON_KEY;

    const storedUrl = localStorage.getItem('supabaseUrl');
    const storedKey = localStorage.getItem('supabaseAnonKey');

    const urlToUse = envUrl || storedUrl;
    const keyToUse = envKey || storedKey;

    if (urlToUse && keyToUse) {
        try {
            initializeSupabase(urlToUse, keyToUse);
            setIsConfigured(true);

            const supabase = getSupabase();
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setIsLoading(false); 
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                if (!session) {
                    setUserProfile(null);
                }
            });

            return () => subscription.unsubscribe();
        } catch (e) {
            console.error("Failed to initialize Supabase", e);
            if (!envUrl) {
                setInitializationError("Erro ao inicializar Supabase com as chaves fornecidas.");
            } else {
                setInitializationError("Erro ao conectar com Supabase usando variáveis de ambiente. Verifique a configuração no Vercel.");
            }
            setIsLoading(false);
        }
    } else {
        setInitializationError("A aplicação não está configurada corretamente.\n\nAdministrador: Por favor, configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel da Vercel (Settings > Environment Variables).");
        setIsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setInitializationError(null);
    setSetupSql(null);
    setIsDbError(false);

    try {
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
        const isAdminProfile = profile?.role?.toLowerCase() === 'admin';
        
        const promises: Promise<any>[] = [
            getJuizes(),
            getPeritos(),
            getTextosPadroes(),
        ];
        
        if (isAdminProfile) {
            promises.push(listUsers());
        }

        const [juizesData, peritosData, textosData, usersData] = await Promise.all(promises);

        setJuizes((juizesData as Juiz[]) || []);
        setPeritos((peritosData as Perito[]) || []);
        
        const rawTemplates = (textosData as TextoPadraoDB[]) || [];
        const combinedTemplates = [...defaultTemplatesAsDb.map(t => ({...t, user_id: 'system'})), ...rawTemplates];
        setAllTemplatesRaw(combinedTemplates.sort((a,b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)));

        const groupedTemplates = combinedTemplates.reduce((acc, template: TextoPadraoDB) => {
            if (!acc[template.category]) {
                acc[template.category] = [];
            }
            acc[template.category].push({ title: template.title, text: template.text });
            return acc;
        }, {} as FreeTextTemplates);

        setTextosPadroes(groupedTemplates);
        
        if (isAdminProfile && usersData) {
            setAllUsers((usersData as UserWithProfile[]) || []);
        }
        
    } catch (error: unknown) {
        console.error("Falha ao buscar dados iniciais:", error);
        setJuizes([]);
        setPeritos([]);
        setAllTemplatesRaw([]);
        setTextosPadroes(FREE_TEXT_TEMPLATES);

        const getErrorMessage = (e: unknown): string => {
            if (e instanceof Error) return e.message;
            return 'Ocorreu um erro não identificado.';
        };
        
        const errorMessage = getErrorMessage(error);
        let userMessage = errorMessage;

        setInitializationError(userMessage);
    } finally {
        setIsLoading(false);
    }
  }, [session]);
  
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  const handleSaveConfig = (url: string, key: string) => {
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseAnonKey', key);
    window.location.reload();
  };

  const handleReconfigure = () => {
      localStorage.removeItem('supabaseUrl');
      localStorage.removeItem('supabaseAnonKey');
      setIsConfigured(false);
      setIsConfigModalOpen(true);
      setInitializationError(null);
      setSetupSql(null);
      setIsDbError(false);
      setIsLoading(false);
      setSession(null);
  };
    
  const handleSignOut = async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  const handleDataChange = <K extends keyof AtaData,>(key: K, value: AtaData[K]) => {
    setAtaData(prev => ({ ...prev, [key]: value }));
  };

  const handleCopyHtml = async () => {
    const html = generateAtaHtml(ataData);
    try {
      const blobHtml = new Blob([html], { type: "text/html" });
      const blobText = new Blob([html], { type: "text/plain" });
      const data = [new ClipboardItem({ 
          ["text/html"]: blobHtml,
          ["text/plain"]: blobText 
      })];
      await navigator.clipboard.write(data);
      alert("Texto formatado copiado com sucesso!");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      navigator.clipboard.writeText(html).then(() => {
        alert("Copiado (formato HTML simples).");
      });
    }
  };

  const handleDownloadDocx = async () => {
    try {
      const doc = await generateDocx(ataData);
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Ata_${ataData.numeroProcesso || 'Audiencia'}.docx`);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar DOCX.");
    }
  };
  
  const handleConciliacaoStatusChange = (status: ConciliacaoStatus) => {
    const newStatus = ataData.conciliacaoStatus === status ? undefined : status;
    setAtaData(prev => {
        let newTermos = prev.conciliacaoTermos;
        if (newStatus === ConciliacaoStatus.ACEITA) {
            if (prev.conciliacaoTermos.trim() === '') {
                newTermos = CONCILIACAO_ACEITA_TEMPLATE;
            }
        } else {
            if (prev.conciliacaoTermos === CONCILIACAO_ACEITA_TEMPLATE) {
                newTermos = '';
            }
        }
        return {
            ...prev,
            conciliacaoStatus: newStatus,
            conciliacaoTermos: newTermos,
        };
    });
  };
  
  const handleContestacaoTipoChange = (tipo: ContestacaoTipo) => {
    const newTipo = ataData.contestacaoTipo === tipo ? undefined : tipo;
    setAtaData(prev => ({
        ...prev,
        contestacaoTipo: newTipo,
        contestacaoTexto: newTipo === ContestacaoTipo.PERSONALIZADO ? prev.contestacaoTexto : ''
    }));
  };

  const handleReplicaPrazoChange = (prazo: ReplicaPrazo) => {
    const newPrazo = ataData.replicaPrazo === prazo ? undefined : prazo;
    setAtaData(prev => ({
        ...prev,
        replicaPrazo: newPrazo,
        replicaTexto: newPrazo === ReplicaPrazo.PERSONALIZADO ? prev.replicaTexto : ''
    }));
  };

  const handleAtosProcessuaisOptionToggle = (optionId: AtosProcessuaisOpcao) => {
    setAtaData(prev => {
        const newOptions = [...prev.atosProcessuaisOpcoes];
        let newOrderedAtos = [...prev.orderedAtos];
        const index = newOptions.indexOf(optionId);

        if (index > -1) {
            newOptions.splice(index, 1); 
            newOrderedAtos = newOrderedAtos.filter(id => id !== optionId);
        } else {
            newOptions.push(optionId);
            newOrderedAtos.push(optionId);
        }
        return { ...prev, atosProcessuaisOpcoes: newOptions, orderedAtos: newOrderedAtos };
    });
  };

  const handleDragEnd = () => {
      if (draggedItem.current === null || dragOverItem.current === null) return;
      const newOrderedAtos = [...ataData.orderedAtos];
      const draggedItemContent = newOrderedAtos.splice(draggedItem.current, 1)[0];
      newOrderedAtos.splice(dragOverItem.current, 0, draggedItemContent);
      draggedItem.current = null;
      dragOverItem.current = null;
      handleDataChange('orderedAtos', newOrderedAtos);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const addTestemunha = (type: 'Reclamante' | 'Reclamada') => {
    const newTestemunha: Testemunha = { id: uniqueId(), nome: '', cpf: '', endereco: '' };
    if (type === 'Reclamante') {
      handleDataChange('gravacaoTestemunhasReclamante', [...ataData.gravacaoTestemunhasReclamante, newTestemunha]);
    } else {
      handleDataChange('gravacaoTestemunhasReclamada', [...ataData.gravacaoTestemunhasReclamada, newTestemunha]);
    }
  };

  const updateTestemunha = (type: 'Reclamante' | 'Reclamada', index: number, field: keyof Testemunha, value: string) => {
    if (type === 'Reclamante') {
      const updated = [...ataData.gravacaoTestemunhasReclamante];
      updated[index] = { ...updated[index], [field]: value };
      handleDataChange('gravacaoTestemunhasReclamante', updated);
    } else {
      const updated = [...ataData.gravacaoTestemunhasReclamada];
      updated[index] = { ...updated[index], [field]: value };
      handleDataChange('gravacaoTestemunhasReclamada', updated);
    }
  };

    const removeTestemunha = (type: 'Reclamante' | 'Reclamada', index: number) => {
        if (type === 'Reclamante') {
            handleDataChange('gravacaoTestemunhasReclamante', ataData.gravacaoTestemunhasReclamante.filter((_, i) => i !== index));
        } else {
            handleDataChange('gravacaoTestemunhasReclamada', ataData.gravacaoTestemunhasReclamada.filter((_, i) => i !== index));
        }
    };

    const addReclamante = () => {
        const newReclamante: Reclamante = { id: uniqueId(), nome: '', comparecimento: 'pessoalmente', advogado: '' };
        handleDataChange('reclamantes', [...ataData.reclamantes, newReclamante]);
    };

    const updateReclamante = (index: number, field: keyof Reclamante, value: string) => {
        const updated = [...ataData.reclamantes];
        updated[index] = { ...updated[index], [field]: value };
        handleDataChange('reclamantes', updated);
    };

    const removeReclamante = (index: number) => {
        if (ataData.reclamantes.length > 1) {
            handleDataChange('reclamantes', ataData.reclamantes.filter((_, i) => i !== index));
        }
    };

    const addReclamada = () => {
        const newReclamada: Reclamada = { id: uniqueId(), nome: '', representante: '', advogado: '' };
        handleDataChange('reclamadas', [...ataData.reclamadas, newReclamada]);
    };

    const updateReclamada = (index: number, field: keyof Reclamada, value: string) => {
        const updated = [...ataData.reclamadas];
        updated[index] = { ...updated[index], [field]: value };
        handleDataChange('reclamadas', updated);
    };

    const removeReclamada = (index: number) => {
        if (ataData.reclamadas.length > 1) {
            handleDataChange('reclamadas', ataData.reclamadas.filter((_, i) => i !== index));
        }
    };

  const addEstudante = () => {
    const newEstudante: Estudante = { id: uniqueId(), nome: '', cpf: '', faculdade: '', periodo: '' };
    handleDataChange('estudantes', [...ataData.estudantes, newEstudante]);
  };

  const updateEstudante = (index: number, field: keyof Estudante, value: string) => {
      const updated = [...ataData.estudantes];
      updated[index] = { ...updated[index], [field]: value };
      handleDataChange('estudantes', updated);
  };

  const removeEstudante = (index: number) => {
      handleDataChange('estudantes', ataData.estudantes.filter((_, i) => i !== index));
  };
    
  const performReset = () => {
    setIsResetModalOpen(false);
    setIsResetting(true);
    setTimeout(() => {
        localStorage.removeItem('autosavedAtaData');
        const newState = getInitialAtaData();
        setAtaData(newState);
        setCurrentStep(0);
        setIsFocusMode(false);
        setIsZenMode(false);
        setFormKey(prev => prev + 1);
        setIsResetting(false);
    }, 400);
  };

  const renderCurrentStep = () => {
    const modeButtonClasses = (isActive: boolean) => `px-3 py-1 text-sm rounded-md ${isActive ? 'bg-brand-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;

    switch (currentStep) {
      case 0: 
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
             <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-gray-700 flex items-center"><span className="mr-2 text-xl">📄</span> Nova Ata</h3>
                    <p className="text-sm text-gray-500">Clique no botão ao lado para limpar todos os campos e começar um documento do zero.</p>
                </div>
                <button 
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all font-medium shadow-sm whitespace-nowrap w-full md:w-auto justify-center"
                >
                    <span className="mr-2">🗑️</span> Limpar e Reiniciar
                </button>
            </div>

            <div className="border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-lg mb-4">Deseja preencher as informações de Cabeçalho, Abertura e Partes?</h3>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
                    <button onClick={() => { handleDataChange('preencherDadosIniciais', true); nextStep(); }} className={`${modeButtonClasses(ataData.preencherDadosIniciais)} py-3`}>Sim, preencher do início</button>
                    <button onClick={() => { handleDataChange('preencherDadosIniciais', false); setCurrentStep(2); }} className={`${modeButtonClasses(!ataData.preencherDadosIniciais)} py-3`}>Não, pular para o corpo da ata</button>
                </div>
                
                {ataData.preencherDadosIniciais && (
                <>
                    <h2 className="text-2xl font-bold mb-4">1. Cabeçalho da Audiência</h2>
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('headerMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.headerMode === SectionInputMode.MANUAL)}>Preencher Manualmente</button>
                        <button onClick={() => handleDataChange('headerMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.headerMode === SectionInputMode.PASTE)}>Colar do Sistema</button>
                    </div>

                    {ataData.headerMode === SectionInputMode.MANUAL ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <VoiceInput placeholder="Data da audiência (por extenso)" value={ataData.dataAudiencia} onChange={val => handleDataChange('dataAudiencia', val)} className="p-2 border rounded"/>
                                <div className="grid grid-cols-3 gap-2">
                                     <div className="col-span-2">
                                          <VoiceInput placeholder="Vara do Trabalho" value={ataData.varaTrabalho} onChange={val => handleDataChange('varaTrabalho', val)} className="p-2 border rounded w-full"/>
                                     </div>
                                     <div className="col-span-1 relative group">
                                         <label className="absolute -top-3 left-2 bg-white px-1 text-xs text-gray-500 font-bold">Região</label>
                                         <input 
                                            type="number" 
                                            placeholder="19" 
                                            value={ataData.tribunalRegiao} 
                                            onChange={e => handleDataChange('tribunalRegiao', e.target.value)} 
                                            className="p-2 border rounded w-full h-[42px]"
                                         />
                                     </div>
                                </div>
                                <JuizSelector id="juiz-nome" label="Nome do(a) Juiz(a)" juizes={juizes} value={ataData.juizNome} onChange={v => handleDataChange('juizNome', v)}/>
                                <VoiceInput placeholder="Tipo de ação" value={ataData.tipoAcao} onChange={val => handleDataChange('tipoAcao', val)} className="p-2 border rounded"/>
                                <VoiceInput placeholder="Número do processo" value={ataData.numeroProcesso} onChange={val => handleDataChange('numeroProcesso', val)} className="p-2 border rounded col-span-1 md:col-span-2"/>
                            </div>
                            <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="incluir-paragrafo"
                                    checked={ataData.incluirParagrafoIntrodutorio}
                                    onChange={e => handleDataChange('incluirParagrafoIntrodutorio', e.target.checked)}
                                    className="h-5 w-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                />
                                <label htmlFor="incluir-paragrafo" className="ml-2 block text-sm text-gray-900">
                                    Incluir parágrafo introdutório padrão
                                </label>
                            </div>
                        </div>
                    ) : (
                         <VoiceTextarea 
                            value={ataData.headerPastedText} 
                            onChange={(val) => handleDataChange('headerPastedText', val)} 
                            rows={8} 
                            className="w-full p-2 border rounded" 
                            placeholder="Cole aqui o texto do cabeçalho..."
                        />
                    )}
                </>
                )}
            </div>
          </div>
        );
      case 1: 
          return (
          <div>
            <h2 className="text-2xl font-bold mb-4">2. Abertura e Partes</h2>
            <div className="space-y-6">
                 <div className="p-6 bg-white rounded-lg shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">Abertura da Audiência</h3>
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('aberturaMode', SectionInputMode.DEFAULT)} className={modeButtonClasses(ataData.aberturaMode === SectionInputMode.DEFAULT)}>Usar Padrão</button>
                        <button onClick={() => handleDataChange('aberturaMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.aberturaMode === SectionInputMode.MANUAL)}>Manual</button>
                        <button onClick={() => handleDataChange('aberturaMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.aberturaMode === SectionInputMode.PASTE)}>Colar</button>
                    </div>
                    {(ataData.aberturaMode === SectionInputMode.DEFAULT || ataData.aberturaMode === SectionInputMode.MANUAL) && (
                        <VoiceInput placeholder="Horário de abertura (HH:MM)" value={ataData.aberturaHora} onChange={val => handleDataChange('aberturaHora', val)} className="p-2 border rounded w-full"/>
                    )}
                    {ataData.aberturaMode === SectionInputMode.PASTE && (
                         <VoiceTextarea value={ataData.aberturaPastedText} onChange={(val) => handleDataChange('aberturaPastedText', val)} rows={3} className="w-full p-2 border rounded" placeholder="Cole o texto da abertura..." />
                    )}
                </div>

                 <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="participacao-videoconferencia"
                            checked={ataData.participacaoVideoconferencia}
                            onChange={e => handleDataChange('participacaoVideoconferencia', e.target.checked)}
                            className="h-5 w-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                        />
                        <label htmlFor="participacao-videoconferencia" className="ml-3 block text-sm font-medium text-gray-900">
                            Adicionar a frase: "A participação de todos os presentes se deu por meio de videoconferência."
                        </label>
                    </div>
                </div>

                <div className="p-6 bg-white rounded-lg shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">Parte Reclamante</h3>
                     <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('reclamanteMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.reclamanteMode === SectionInputMode.MANUAL)}>Preencher Manualmente</button>
                        <button onClick={() => handleDataChange('reclamanteMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.reclamanteMode === SectionInputMode.PASTE)}>Colar do Sistema</button>
                    </div>
                    {ataData.reclamanteMode === SectionInputMode.MANUAL ? (
                       <div className="space-y-4">
                            {ataData.reclamantes.map((reclamante, index) => (
                                <div key={reclamante.id} className="p-3 border rounded-lg bg-gray-50 relative">
                                    {ataData.reclamantes.length > 1 && (
                                        <button onClick={() => removeReclamante(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl p-2">×</button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 md:pt-0">
                                        <VoiceInput placeholder="Nome completo" value={reclamante.nome} onChange={val => updateReclamante(index, 'nome', val)} className="p-2 border rounded"/>
                                        <select value={reclamante.comparecimento} onChange={e => updateReclamante(index, 'comparecimento', e.target.value)} className="p-2 border rounded bg-white">
                                            <option value="pessoalmente">Pessoalmente</option>
                                            <option value="por videoconferência">Videoconferência</option>
                                            <option value="ausente">Ausente</option>
                                        </select>
                                        <VoiceInput placeholder="Advogado(a) e OAB" value={reclamante.advogado} onChange={val => updateReclamante(index, 'advogado', val)} className="p-2 border rounded col-span-1 md:col-span-2"/>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addReclamante} className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300 w-full md:w-auto">+ Adicionar Reclamante</button>
                        </div>
                    ) : (
                        <VoiceTextarea value={ataData.reclamantePastedText} onChange={(val) => handleDataChange('reclamantePastedText', val)} rows={3} className="w-full p-2 border rounded" placeholder="Cole os dados da parte reclamante..." />
                    )}
                </div>

                 <div className="p-6 bg-white rounded-lg shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">Parte Reclamada</h3>
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('reclamadaMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.reclamadaMode === SectionInputMode.MANUAL)}>Preencher Manualmente</button>
                        <button onClick={() => handleDataChange('reclamadaMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.reclamadaMode === SectionInputMode.PASTE)}>Colar do Sistema</button>
                    </div>
                    {ataData.reclamadaMode === SectionInputMode.MANUAL ? (
                       <div className="space-y-4">
                            {ataData.reclamadas.map((reclamada, index) => (
                                <div key={reclamada.id} className="p-3 border rounded-lg bg-gray-50 relative">
                                     {ataData.reclamadas.length > 1 && (
                                        <button onClick={() => removeReclamada(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl p-2">×</button>
                                     )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 md:pt-0">
                                        <VoiceInput placeholder="Nome/Razão Social" value={reclamada.nome} onChange={val => updateReclamada(index, 'nome', val)} className="p-2 border rounded"/>
                                        <VoiceInput placeholder="Representante Legal" value={reclamada.representante} onChange={val => updateReclamada(index, 'representante', val)} className="p-2 border rounded"/>
                                        <VoiceInput placeholder="Advogado(a) e OAB (se houver)" value={reclamada.advogado} onChange={val => updateReclamada(index, 'advogado', val)} className="p-2 border rounded col-span-1 md:col-span-2"/>
                                    </div>
                                </div>
                            ))}
                             <button onClick={addReclamada} className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300 w-full md:w-auto">+ Adicionar Reclamada</button>
                        </div>
                     ) : (
                        <VoiceTextarea value={ataData.reclamadaPastedText} onChange={(val) => handleDataChange('reclamadaPastedText', val)} rows={3} className="w-full p-2 border rounded" placeholder="Cole os dados da parte reclamada..." />
                    )}
                </div>

                <div className="p-6 bg-white rounded-lg shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">Estudantes de Direito (Opcional)</h3>
                     <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('estudanteMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.estudanteMode === SectionInputMode.MANUAL)}>Preencher Manualmente</button>
                        <button onClick={() => handleDataChange('estudanteMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.estudanteMode === SectionInputMode.PASTE)}>Colar do Sistema</button>
                    </div>

                    {ataData.estudanteMode === SectionInputMode.MANUAL ? (
                        <div className="space-y-4">
                            {ataData.estudantes.map((estudante, index) => (
                                <div key={estudante.id} className="p-3 border rounded-lg bg-gray-50 relative">
                                    <button onClick={() => removeEstudante(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl p-2">×</button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 md:pt-0">
                                        <VoiceInput placeholder="Nome completo" value={estudante.nome} onChange={val => updateEstudante(index, 'nome', val)} className="p-2 border rounded"/>
                                        <VoiceInput placeholder="CPF" value={estudante.cpf} onChange={val => updateEstudante(index, 'cpf', val)} className="p-2 border rounded"/>
                                        <VoiceInput placeholder="Faculdade" value={estudante.faculdade} onChange={val => updateEstudante(index, 'faculdade', val)} className="p-2 border rounded"/>
                                        <VoiceInput placeholder="Período" value={estudante.periodo} onChange={val => updateEstudante(index, 'periodo', val)} className="p-2 border rounded"/>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addEstudante} className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300 w-full md:w-auto">+ Adicionar Estudante</button>
                        </div>
                    ) : (
                        <VoiceTextarea value={ataData.estudantePastedText} onChange={(val) => handleDataChange('estudantePastedText', val)} rows={4} className="w-full p-2 border rounded" placeholder="Cole os dados do(s) estudante(s) aqui..." />
                    )}
                </div>

            </div>
          </div>
        );
      case 2: 
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">3. Conciliação</h2>
            <div className="flex space-x-4 mb-4 overflow-x-auto pb-2 no-scrollbar">
                {(Object.keys(ConciliacaoStatus) as Array<keyof typeof ConciliacaoStatus>).map(key => (
                    <button key={key} onClick={() => handleConciliacaoStatusChange(ConciliacaoStatus[key])} className={`px-4 py-2 rounded whitespace-nowrap flex-shrink-0 ${ataData.conciliacaoStatus === ConciliacaoStatus[key] ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>{ConciliacaoStatus[key]}</button>
                ))}
            </div>
            {ataData.conciliacaoStatus === ConciliacaoStatus.ACEITA && (
                <VoiceTextarea value={ataData.conciliacaoTermos} onChange={val => handleDataChange('conciliacaoTermos', val)} rows={15} className="w-full p-2 border rounded" placeholder="Descreva os termos do acordo" />
            )}
          </div>
        );
      case 3: 
          return (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold mb-4">4. Contestação e Réplica</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Contestação</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(Object.keys(ContestacaoTipo) as Array<keyof typeof ContestacaoTipo>).map(key => (
                                <button key={key} onClick={() => handleContestacaoTipoChange(ContestacaoTipo[key])} className={`px-4 py-2 rounded text-sm ${ataData.contestacaoTipo === ContestacaoTipo[key] ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>{CONTESTACAO_TEXTS[ContestacaoTipo[key]] || "Personalizado"}</button>
                            ))}
                        </div>
                         {ataData.contestacaoTipo === ContestacaoTipo.PERSONALIZADO && (
                            <VoiceTextarea value={ataData.contestacaoTexto} onChange={val => handleDataChange('contestacaoTexto', val)} rows={3} className="w-full p-2 border rounded" placeholder="Texto da contestação" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Prazo para Réplica</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(Object.keys(ReplicaPrazo) as Array<keyof typeof ReplicaPrazo>).map(key => (
                                <button key={key} onClick={() => handleReplicaPrazoChange(ReplicaPrazo[key])} className={`px-4 py-2 rounded text-sm ${ataData.replicaPrazo === ReplicaPrazo[key] ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>{ReplicaPrazo[key].replace('_', ' ')}</button>
                            ))}
                        </div>
                        {ataData.replicaPrazo === ReplicaPrazo.PERSONALIZADO && (
                            <VoiceTextarea value={ataData.replicaTexto} onChange={val => handleDataChange('replicaTexto', val)} rows={3} className="w-full p-2 border rounded" placeholder="Texto personalizado para o prazo de réplica" />
                        )}
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2">Observações/Requerimentos/Determinações (Opcional)</h3>
                        <VoiceTextarea 
                            value={ataData.observacoesGerais} 
                            onChange={val => handleDataChange('observacoesGerais', val)} 
                            rows={4} 
                            className="w-full p-2 border rounded" 
                            placeholder="Insira aqui qualquer requerimento das partes, determinação do juiz ou outra observação pertinente que deva constar na ata antes da designação dos próximos atos."
                        />
                    </div>
                </div>
              </div>
          );
      case 4: { 
        const renderAtoForm = () => {
             const orderedOptions = ataData.orderedAtos
                .map(id => ATOS_PROCESSUAIS_OPTIONS.find(opt => opt.id === id))
                .filter((opt): opt is typeof ATOS_PROCESSUAIS_OPTIONS[number] => !!opt);

            if (orderedOptions.length === 0) {
                return (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">Selecione uma ou mais opções de atos processuais acima para continuar.</p>
                    </div>
                );
            }

            const isLivreOnly = ataData.atosProcessuaisOpcoes.length === 1 && ataData.atosProcessuaisOpcoes[0] === AtosProcessuaisOpcao.LIVRE;
            const showFreeTextSection = ataData.atosProcessuaisOpcoes.length > 0;
            const formParts = orderedOptions.filter(opt => opt.id !== AtosProcessuaisOpcao.LIVRE);
            
            return (
                <div className="space-y-8 divide-y divide-gray-200">
                    {formParts.map(option => (
                        <div key={option.id} className="pt-8 first:pt-0">
                           <AtoFormPart 
                                option={option}
                                ataData={ataData}
                                handleDataChange={handleDataChange}
                                peritos={peritos}
                                removeTestemunha={removeTestemunha}
                                updateTestemunha={updateTestemunha}
                                addTestemunha={addTestemunha}
                            />
                        </div>
                    ))}
                    {showFreeTextSection && (
                        <div className="pt-8 first:pt-0">
                            <FreeTextSection 
                                ataData={ataData} 
                                handleDataChange={handleDataChange} 
                                textosPadroes={textosPadroes} 
                                isCumulative={!isLivreOnly} 
                            />
                        </div>
                    )}
                </div>
            );
        };

        const orderedSelectedOptions = ataData.orderedAtos
            .map(id => ATOS_PROCESSUAIS_OPTIONS.find(opt => opt.id === id))
            .filter((opt): opt is typeof ATOS_PROCESSUAIS_OPTIONS[number] => !!opt);

        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">5. Atos Processuais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {ATOS_PROCESSUAIS_OPTIONS.map(option => (
                    <button 
                        key={option.id} 
                        onClick={() => handleAtosProcessuaisOptionToggle(option.id)}
                        className={`p-4 border rounded-lg text-left transition-all duration-200 flex items-start space-x-3 ${ataData.atosProcessuaisOpcoes.includes(option.id) ? 'bg-brand-600 text-white border-brand-700 shadow-lg' : 'bg-white hover:bg-gray-50 hover:shadow-md'}`}
                    >
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                            <h3 className="font-semibold">{option.title}</h3>
                            <p className={`text-xs ${ataData.atosProcessuaisOpcoes.includes(option.id) ? 'text-brand-100' : 'text-gray-500'}`}>{option.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {ataData.orderedAtos.length > 1 && (
                <div className="mt-6 mb-8 p-4 border-l-4 border-brand-500 bg-brand-50 rounded-r-lg">
                    <h3 className="font-semibold text-lg mb-2 text-brand-800">Ordem dos Atos na Ata</h3>
                    <p className="text-sm text-gray-600 mb-3">Arraste os itens para definir a ordem em que aparecerão no texto da ata.</p>
                    <div className="space-y-2">
                        {orderedSelectedOptions.map((option, index) => (
                             <div 
                                key={option.id}
                                draggable
                                onDragStart={() => draggedItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className="flex items-center p-3 bg-white border rounded-md shadow-sm cursor-grab active:cursor-grabbing touch-manipulation"
                            >
                                <span className="text-gray-400 mr-3 text-xl">☰</span>
                                <span className="font-medium">{option.title}</span>
                            </div>
                        ))}
                    </div>
                     <p className="text-xs text-gray-500 mt-3">
                        <strong>Nota:</strong> O ato "Gravação de Instrução", se selecionado, sempre conterá os textos de encerramento e será posicionado ao final da seção de atos na ata.
                    </p>
                </div>
            )}
            
            {renderAtoForm()}
          </div>
        );
      }
      case 5: 
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">6. Encerramento</h2>
            <div className="space-y-4">
              <VoiceInput placeholder="Horário de encerramento (HH:MM)" value={ataData.encerramentoHora} onChange={val => handleDataChange('encerramentoHora', val)} className="p-2 border rounded w-full"/>
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Texto Livre Final (Opcional)</label>
                </div>
                <VoiceTextarea value={ataData.textoLivreEncerramento} onChange={val => handleDataChange('textoLivreEncerramento', val)} rows={5} className="w-full p-2 border rounded" placeholder="Adicione aqui qualquer texto final antes do encerramento padrão." />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Carregando...</p>
                <p className="text-gray-600">Conectando ao backend e buscando dados.</p>
            </div>
        </div>
    );
  }

  if (initializationError) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
              <div className="w-full max-w-3xl p-8 bg-white rounded-lg shadow-xl border border-red-200">
                  <h2 className="text-2xl font-bold text-red-700 mb-4">Erro de Inicialização</h2>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{initializationError}</p>
                  
                  {setupSql && isDbError && (
                      <div className="mt-6">
                          <h3 className="font-semibold text-lg mb-2">Como Corrigir</h3>
                          <p className="text-sm text-gray-600 mb-2">Copie e execute o script SQL abaixo no "SQL Editor" do seu projeto Supabase. Isso irá apagar e recriar as tabelas com a estrutura correta.</p>
                          <pre className="bg-gray-800 text-white p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                              <code>{setupSql}</code>
                          </pre>
                          <button
                              onClick={() => navigator.clipboard.writeText(setupSql)}
                              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                              Copiar Script
                          </button>
                      </div>
                  )}

                  <div className="mt-8 pt-4 border-t text-right">
                      <button onClick={handleReconfigure} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                          Reconfigurar Conexão
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (!isConfigured) {
      if (isConfigModalOpen) {
        return <SupabaseConfigModal isOpen={isConfigModalOpen} onSave={handleSaveConfig} />;
      }
      return null;
  }
  
  if (!session) {
      return <Auth />;
  }
  
  if (isZenMode) {
    return (
      <div className="fixed inset-0 bg-white z-50 p-4 md:p-8 overflow-y-auto overscroll-none">
        <div className="fixed top-4 right-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 z-50">
            <button onClick={handleCopyHtml} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm text-sm md:text-base">
                Copiar Texto
            </button>
            <button onClick={handleDownloadDocx} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm text-sm md:text-base">
                Baixar .docx
            </button>
            <button
              onClick={() => setIsZenMode(false)}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm text-gray-700 md:text-base"
            >
              Voltar
            </button>
        </div>
        <div className="max-w-4xl mx-auto mt-24 md:mt-12 pb-20">
          <Preview data={ataData} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-100 font-sans transition-all duration-300 ${isFocusMode ? '' : 'p-2 md:p-8'}`}>
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={performReset} />
      <CadastroModal isOpen={isCadastroModalOpen} onClose={() => setIsCadastroModalOpen(false)} juizes={juizes} setJuizes={setJuizes} peritos={peritos} setPeritos={setPeritos} />
      <TextosPadroesModal isOpen={isTextosModalOpen} onClose={() => setIsTextosModalOpen(false)} templates={allTemplatesRaw} onDataChange={fetchData} />
      {isAdmin && <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} users={allUsers} onDataChange={fetchData} />}
      {userProfile && <ProfileManagementModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} onDataChange={fetchData} />}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      
      <ChatAssistant 
        ataData={ataData} 
        onUpdateData={handleDataChange} 
        setCurrentStep={setCurrentStep}
        textosPadroes={textosPadroes}
      />
      <SupabaseConfigModal isOpen={isConfigModalOpen} onSave={handleSaveConfig} />
      
      <div className={`grid gap-8 transition-all duration-300 ${isFocusMode ? 'grid-cols-1' : 'lg:grid-cols-2'} pb-24 md:pb-20`}>
        <div className={`${isFocusMode ? 'px-4 md:px-8 py-6' : ''}`}>
          <header className="flex justify-between items-center mb-6">
             <div className="flex items-center space-x-4">
                 <h1 className="text-xl md:text-3xl font-bold text-gray-800 truncate">Gerador de Atas</h1>
                 <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">v2.1 Mobile</span>
             </div>
             <div className="flex items-center space-x-2">
                <button 
                    onClick={() => setIsHelpModalOpen(true)} 
                    className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 flex items-center justify-center transition-colors font-bold text-lg flex-shrink-0"
                    title="Ajuda / Manual Rápido"
                >
                    ?
                </button>
                <div className="relative">
                    <button onClick={() => setIsConfigDropdownOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-200 flex-shrink-0">
                        <span role="img" aria-label="settings" className="text-xl">⚙️</span>
                    </button>
                    {isConfigDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-20 border animate-fade-in-up">
                            <div className="p-2 border-b">
                                <p className="text-sm font-medium truncate">{userProfile?.full_name || userProfile?.email}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded">{userProfile?.role || 'user'}</p>
                                </div>
                            </div>
                            <nav className="py-1">
                                <button onClick={() => { setIsProfileModalOpen(true); setIsConfigDropdownOpen(false); }} className="w-full text-left px-4 py-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100">Meus Dados / Senha</button>
                                <button onClick={() => { setIsCadastroModalOpen(true); setIsConfigDropdownOpen(false); }} className="w-full text-left px-4 py-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100">Gerenciar Juízes/Peritos</button>
                                <button onClick={() => { setIsTextosModalOpen(true); setIsConfigDropdownOpen(false); }} className="w-full text-left px-4 py-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100">Gerenciar Ocorrências</button>
                                <button onClick={() => { setIsHelpModalOpen(true); setIsConfigDropdownOpen(false); }} className="w-full text-left px-4 py-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100">Manual Rápido</button>
                                <button onClick={() => { handleReconfigure(); setIsConfigDropdownOpen(false); }} className="w-full text-left px-4 py-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100">Reconfigurar Conexão</button>
                            </nav>
                            <div className="border-t my-1"></div>
                            {isAdmin && (
                                <>
                                    <div className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase">
                                        Admin
                                    </div>
                                    <nav className="py-1">
                                        <button onClick={() => { setIsUserModalOpen(true); setIsConfigDropdownOpen(false); }} className="w-full text-left px-4 py-3 md:py-2 text-sm text-gray-700 hover:bg-gray-100">Gerenciar Usuários</button>
                                    </nav>
                                </>
                            )}
                            <div className="border-t p-1">
                            <button onClick={handleSignOut} className="w-full text-left px-4 py-3 md:py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">Sair</button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </header>
          
          <div className="mb-6 sticky top-0 z-30 bg-gray-100 pt-2 pb-2 md:static md:bg-transparent md:p-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex space-x-1 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                    {STEPS.map((step, index) => (
                    <button 
                        key={step} 
                        onClick={() => setCurrentStep(index)}
                        className={`px-3 py-2 md:py-1 rounded-t-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${currentStep === index ? 'bg-white font-semibold text-brand-700 shadow-sm border-t border-x border-gray-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    >
                        {step}
                    </button>
                    ))}
                </div>
                 <div className="flex items-center space-x-2 w-full md:w-auto justify-end hidden md:flex">
                    <button onClick={() => setIsFocusMode(p => !p)} className="text-sm px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 hidden md:block">{isFocusMode ? 'Sair do Foco' : 'Modo Foco'}</button>
                    <button onClick={() => setIsZenMode(true)} className="text-sm px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 w-full md:w-auto text-center font-medium">Modo Zen (Preview)</button>
                 </div>
            </div>
            <div className="bg-white rounded-b-lg shadow-sm p-1 h-1 hidden md:block"></div>
          </div>

          {/* Chave de formulário para forçar re-render ao resetar */}
          <div key={formKey}>
            {renderCurrentStep()}
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center mt-8 mb-8 gap-4">
            <button onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))} disabled={currentStep === 0} className="px-6 py-3 md:py-2 bg-gray-300 rounded-md disabled:opacity-50 text-gray-800 font-medium w-full md:w-auto">Voltar</button>
            
            <div className="text-xs text-gray-400 text-center px-4">
                Criado por Johnny Santos - Email johnny.santos@trt19.jus.br
            </div>

            {currentStep < STEPS.length - 1 ? (
              <button onClick={nextStep} className="px-6 py-3 md:py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-medium shadow-sm w-full md:w-auto">Próximo</button>
            ) : (
              <button onClick={() => setIsZenMode(true)} className="px-6 py-3 md:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium shadow-sm w-full md:w-auto">Finalizar</button>
            )}
          </div>
        </div>
        
        {!isFocusMode && (
          <div className="px-4 md:px-8 py-6 bg-gray-50 border-l border-gray-200 hidden lg:block overflow-y-auto h-screen sticky top-0">
            <div className="flex flex-col space-y-2 mb-4">
                <h2 className="text-xl font-bold text-gray-700 mb-2">Pré-visualização</h2>
                 <div className="flex space-x-2">
                    <button onClick={handleCopyHtml} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 shadow-sm transition-colors">
                        Copiar Texto
                    </button>
                    <button onClick={handleDownloadDocx} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 shadow-sm transition-colors">
                        Baixar .docx
                    </button>
                 </div>
            </div>
            <Preview data={ataData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
