
import React, { useState, useEffect } from 'react';
import { AtaData, Perito, Testemunha, Estudante, ConciliacaoStatus, ReplicaPrazo, ContestacaoTipo, AtosProcessuaisOpcao, SectionInputMode, Reclamante, Reclamada, Juiz, TextoPadrao, AtaRascunho, ParsedHeaderData, ParsedPartyData } from './types';
// FIX: Import CONTESTACAO_TEXTS.
import { STEPS, ATOS_PROCESSUAIS_OPTIONS, FREE_TEXT_TEMPLATES, CONTESTACAO_TEXTS } from './constants';
import * as api from './api';
import PeritoSelector from './components/PeritoSelector';
import JuizSelector from './components/JuizSelector';
import Preview from './components/Preview';
import { saveAs } from 'file-saver';
import { Packer } from 'docx';
import { generateDocx, generateAtaHtml } from './ata-generator';

const initialAtaData: AtaData = {
  preencherDadosIniciais: true,
  headerMode: SectionInputMode.MANUAL,
  headerPastedText: '',
  dataAudiencia: '',
  varaTrabalho: '',
  juizNome: '',
  tipoAcao: '',
  numeroProcesso: '',
  incluirParagrafoIntrodutorio: true,
  aberturaMode: SectionInputMode.DEFAULT,
  aberturaPastedText: '',
  aberturaHora: '',
  reclamanteMode: SectionInputMode.MANUAL,
  reclamantePastedText: '',
  reclamantes: [{ id: Date.now().toString(), nome: '', comparecimento: 'pessoalmente', advogado: '' }],
  reclamadaMode: SectionInputMode.MANUAL,
  reclamadaPastedText: '',
  reclamadas: [{ id: Date.now().toString(), nome: '', representante: '', advogado: '' }],
  estudanteMode: SectionInputMode.MANUAL,
  estudantePastedText: '',
  estudantes: [],
  conciliacaoTermos: '',
  contestacaoTexto: '',
  replicaTexto: '',
  observacoesGerais: '',
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
};

type ToastMessage = {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
};


const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [ataData, setAtaData] = useState<AtaData>(initialAtaData);
  const [currentAtaId, setCurrentAtaId] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<AtaRascunho[]>([]);
  const [peritos, setPeritos] = useState<Perito[]>([]);
  const [juizes, setJuizes] = useState<Juiz[]>([]);
  const [textosPadroes, setTextosPadroes] = useState<TextoPadrao[]>([]);
  
  const [showPeritoManager, setShowPeritoManager] = useState(false);
  const [showJuizManager, setShowJuizManager] = useState(false);
  const [showTextoManager, setShowTextoManager] = useState(false);
  
  const [copyStatus, setCopyStatus] = useState('Copiar Texto Formatado');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});


  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const loadData = async () => {
        try {
            setLoading(true);
            const [peritosData, juizesData, textosData, rascunhosData] = await Promise.all([
                api.getPeritos(),
                api.getJuizes(),
                api.getTextos(),
                api.getAtas(),
            ]);
            setPeritos(peritosData);
            setJuizes(juizesData);
            setTextosPadroes(textosData);
            setRascunhos(rascunhosData);
        } catch (error) {
            addToast("Erro ao carregar dados iniciais. Verifique a conexão.", "error")
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  const handleDataChange = <K extends keyof AtaData,>(key: K, value: AtaData[K]) => {
    setAtaData(prev => ({ ...prev, [key]: value }));
  };
  
  const handleConciliacaoStatusChange = (status: ConciliacaoStatus) => {
    handleDataChange('conciliacaoStatus', ataData.conciliacaoStatus === status ? undefined : status);
  };
  
  const handleContestacaoTipoChange = (tipo: ContestacaoTipo) => {
    handleDataChange('contestacaoTipo', ataData.contestacaoTipo === tipo ? undefined : tipo);
  };

  const handleReplicaPrazoChange = (prazo: ReplicaPrazo) => {
    handleDataChange('replicaPrazo', ataData.replicaPrazo === prazo ? undefined : prazo);
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const goToStep = (step: number) => setCurrentStep(step);

  const prevStep = () => {
    if (currentStep === 4) {
        if (!ataData.preencherDadosIniciais) {
            goToStep(1); // Go back to start of form
        } else {
            goToStep(2); // Go back to "Partes"
        }
    } else {
        setCurrentStep(prev => prev - 1);
    }
  };


  const addTestemunha = (type: 'Reclamante' | 'Reclamada') => {
    const newTestemunha: Testemunha = { id: Date.now().toString(), nome: '', cpf: '', endereco: '' };
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
        const newReclamante: Reclamante = { id: Date.now().toString(), nome: '', comparecimento: 'pessoalmente', advogado: '' };
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
        const newReclamada: Reclamada = { id: Date.now().toString(), nome: '', representante: '', advogado: '' };
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
    const newEstudante: Estudante = { id: Date.now().toString(), nome: '', cpf: '', faculdade: '', periodo: '' };
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
    
  const PeritoManagerModal: React.FC = () => {
      const [newPeritoName, setNewPeritoName] = useState('');
      const [editingPerito, setEditingPerito] = useState<Perito | null>(null);
      const [isSubmitting, setIsSubmitting] = useState(false);
      
      const handleAddPerito = async () => {
          if(!newPeritoName.trim()) return;
          setIsSubmitting(true);
          try {
              const newPerito = await api.addPerito(newPeritoName.trim());
              setPeritos(prev => [...prev, newPerito].sort((a, b) => a.nome.localeCompare(b.nome)));
              setNewPeritoName('');
              addToast("Perito adicionado com sucesso!", "success");
          } catch(e) {
              addToast("Erro ao adicionar perito.", "error");
          } finally {
              setIsSubmitting(false);
          }
      };

      const handleRemovePerito = async (id: string) => {
          setIsSubmitting(true);
          try {
            await api.deletePerito(id);
            setPeritos(prev => prev.filter(p => p.id !== id));
            addToast("Perito removido com sucesso!", "success");
          } catch(e) {
            addToast("Erro ao remover perito.", "error");
          } finally {
            setIsSubmitting(false);
          }
      }

      const handleUpdatePerito = async () => {
        if (!editingPerito || !editingPerito.nome.trim()) return;
        setIsSubmitting(true);
        try {
            const updatedPerito = await api.updatePerito(editingPerito.id, editingPerito.nome);
            setPeritos(prev => prev.map(p => p.id === updatedPerito.id ? updatedPerito : p).sort((a,b) => a.nome.localeCompare(b.nome)));
            setEditingPerito(null);
            addToast("Perito atualizado com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao atualizar perito.", "error");
        } finally {
            setIsSubmitting(false);
        }
      };

      const renderItem = (p: Perito) => {
        if (editingPerito?.id === p.id) {
            return (
                <div key={p.id} className="flex items-center justify-between bg-blue-100 p-2 rounded">
                    <input 
                        type="text" 
                        value={editingPerito.nome} 
                        onChange={(e) => setEditingPerito({...editingPerito, nome: e.target.value.toUpperCase()})}
                        className="flex-grow p-1 border rounded-md mr-2"
                        autoFocus
                    />
                    <button onClick={handleUpdatePerito} disabled={isSubmitting} className="text-green-600 hover:text-green-800 font-bold mr-2">Salvar</button>
                    <button onClick={() => setEditingPerito(null)} className="text-gray-500 hover:text-gray-700">Cancelar</button>
                </div>
            )
        }
        return (
            <div key={p.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span>{p.nome}</span>
                <div>
                    <button onClick={() => setEditingPerito(p)} className="text-blue-500 hover:text-blue-700 mr-3">✏️</button>
                    <button onClick={() => handleRemovePerito(p.id)} disabled={isSubmitting} className="text-red-500 hover:text-red-700 font-bold">X</button>
                </div>
            </div>
        )
      }

      return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                  <h2 className="text-2xl font-bold mb-4">Gerenciar Peritos</h2>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {peritos.map(renderItem)}
                  </div>
                  <div className="flex space-x-2">
                      <input
                          type="text"
                          value={newPeritoName}
                          onChange={e => setNewPeritoName(e.target.value.toUpperCase())}
                          placeholder="Nome do novo perito"
                          className="flex-grow p-2 border rounded-md"
                          disabled={isSubmitting}
                      />
                      <button onClick={handleAddPerito} disabled={isSubmitting} className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400">
                        {isSubmitting ? '...' : 'Adicionar'}
                      </button>
                  </div>
                  <button onClick={() => setShowPeritoManager(false)} className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Fechar</button>
              </div>
          </div>
      )
  };

  const JuizManagerModal: React.FC = () => {
    const [newJuizName, setNewJuizName] = useState('');
    const [editingJuiz, setEditingJuiz] = useState<Juiz | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleAddJuiz = async () => {
        if(!newJuizName.trim()) return;
        setIsSubmitting(true);
        try {
            const newJuiz = await api.addJuiz(newJuizName.trim());
            setJuizes(prev => [...prev, newJuiz].sort((a,b) => a.nome.localeCompare(b.nome)));
            setNewJuizName('');
            addToast("Juiz adicionado com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao adicionar juiz.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveJuiz = async (id: string) => {
        setIsSubmitting(true);
        try {
            await api.deleteJuiz(id);
            setJuizes(prev => prev.filter(j => j.id !== id));
            addToast("Juiz removido com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao remover juiz.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleUpdateJuiz = async () => {
        if (!editingJuiz || !editingJuiz.nome.trim()) return;
        setIsSubmitting(true);
        try {
            const updatedJuiz = await api.updateJuiz(editingJuiz.id, editingJuiz.nome);
            setJuizes(prev => prev.map(j => j.id === updatedJuiz.id ? updatedJuiz : j).sort((a,b) => a.nome.localeCompare(b.nome)));
            setEditingJuiz(null);
            addToast("Juiz atualizado com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao atualizar juiz.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderItem = (j: Juiz) => {
        if (editingJuiz?.id === j.id) {
            return (
                 <div key={j.id} className="flex items-center justify-between bg-blue-100 p-2 rounded">
                    <input 
                        type="text" 
                        value={editingJuiz.nome} 
                        onChange={(e) => setEditingJuiz({...editingJuiz, nome: e.target.value.toUpperCase()})}
                        className="flex-grow p-1 border rounded-md mr-2"
                        autoFocus
                    />
                    <button onClick={handleUpdateJuiz} disabled={isSubmitting} className="text-green-600 hover:text-green-800 font-bold mr-2">Salvar</button>
                    <button onClick={() => setEditingJuiz(null)} className="text-gray-500 hover:text-gray-700">Cancelar</button>
                </div>
            )
        }
        return (
            <div key={j.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span>{j.nome}</span>
                <div>
                    <button onClick={() => setEditingJuiz(j)} className="text-blue-500 hover:text-blue-700 mr-3">✏️</button>
                    <button onClick={() => handleRemoveJuiz(j.id)} disabled={isSubmitting} className="text-red-500 hover:text-red-700 font-bold">X</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Gerenciar Juízes</h2>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {juizes.map(renderItem)}
                </div>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newJuizName}
                        onChange={e => setNewJuizName(e.target.value.toUpperCase())}
                        placeholder="Nome do novo juiz"
                        className="flex-grow p-2 border rounded-md"
                        disabled={isSubmitting}
                    />
                    <button onClick={handleAddJuiz} disabled={isSubmitting} className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400">
                        {isSubmitting ? '...' : 'Adicionar'}
                    </button>
                </div>
                <button onClick={() => setShowJuizManager(false)} className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Fechar</button>
            </div>
        </div>
    )
  };

  const TextoManagerModal: React.FC = () => {
    const [newTexto, setNewTexto] = useState({ titulo: '', texto: '' });
    const [editingTexto, setEditingTexto] = useState<TextoPadrao | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleAddTexto = async () => {
        if(!newTexto.titulo.trim() || !newTexto.texto.trim()) return;
        setIsSubmitting(true);
        try {
            const addedTexto = await api.addTexto(newTexto.titulo, newTexto.texto);
            setTextosPadroes(prev => [...prev, addedTexto].sort((a, b) => a.titulo.localeCompare(b.titulo)));
            setNewTexto({ titulo: '', texto: '' });
            addToast("Texto adicionado com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao adicionar texto.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveTexto = async (id: string) => {
        setIsSubmitting(true);
        try {
            await api.deleteTexto(id);
            setTextosPadroes(prev => prev.filter(t => t.id !== id));
            addToast("Texto removido com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao remover texto.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleUpdateTexto = async () => {
        if (!editingTexto || !editingTexto.titulo.trim() || !editingTexto.texto.trim()) return;
        setIsSubmitting(true);
        try {
            const updatedTexto = await api.updateTexto(editingTexto.id, editingTexto.titulo, editingTexto.texto);
            setTextosPadroes(prev => prev.map(t => t.id === updatedTexto.id ? updatedTexto : t).sort((a,b) => a.titulo.localeCompare(b.titulo)));
            setEditingTexto(null);
            addToast("Texto atualizado com sucesso!", "success");
        } catch(e) {
            addToast("Erro ao atualizar texto.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    const renderItem = (t: TextoPadrao) => {
        if (editingTexto?.id === t.id) {
            return (
                 <div key={t.id} className="flex flex-col space-y-2 bg-blue-100 p-2 rounded">
                    <input 
                        type="text" 
                        value={editingTexto.titulo} 
                        onChange={(e) => setEditingTexto({...editingTexto, titulo: e.target.value})}
                        className="w-full p-1 border rounded-md"
                        autoFocus
                    />
                    <textarea 
                        value={editingTexto.texto} 
                        onChange={(e) => setEditingTexto({...editingTexto, texto: e.target.value})}
                        className="w-full p-1 border rounded-md"
                        rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                        <button onClick={handleUpdateTexto} disabled={isSubmitting} className="text-green-600 hover:text-green-800 font-bold">Salvar</button>
                        <button onClick={() => setEditingTexto(null)} className="text-gray-500 hover:text-gray-700">Cancelar</button>
                    </div>
                </div>
            )
        }
        return (
             <div key={t.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span className="font-semibold">{t.titulo}</span>
                <div>
                    <button onClick={() => setEditingTexto(t)} className="text-blue-500 hover:text-blue-700 mr-3">✏️</button>
                    <button onClick={() => handleRemoveTexto(t.id)} disabled={isSubmitting} className="text-red-500 hover:text-red-700 font-bold">X</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Gerenciar Textos Padrão</h2>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {textosPadroes.map(renderItem)}
                </div>
                <div className="space-y-2">
                    <input
                        type="text"
                        value={newTexto.titulo}
                        onChange={e => setNewTexto(prev => ({...prev, titulo: e.target.value}))}
                        placeholder="Título do texto"
                        className="w-full p-2 border rounded-md"
                        disabled={isSubmitting}
                    />
                    <textarea
                        value={newTexto.texto}
                        onChange={e => setNewTexto(prev => ({...prev, texto: e.target.value}))}
                        rows={4}
                        placeholder="Conteúdo do texto padrão"
                        className="w-full p-2 border rounded-md"
                        disabled={isSubmitting}
                    />
                    <button onClick={handleAddTexto} disabled={isSubmitting} className="w-full px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400">
                        {isSubmitting ? '...' : 'Adicionar Texto'}
                    </button>
                </div>
                <button onClick={() => setShowTextoManager(false)} className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Fechar</button>
            </div>
        </div>
    )
  };
    
  const FreeTextSection: React.FC = () => (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Adicionar Ocorrências (Cumulativo)</h3>
      <p className="text-sm text-gray-500 mb-4">
        O texto inserido aqui será adicionado à ata, juntamente com a opção principal selecionada.
      </p>
       <div className="mb-4">
        <h4 className="font-semibold mb-2">Templates Rápidos</h4>
        <div className="flex flex-wrap gap-2">
            {textosPadroes.length > 0 && (
                <div className="w-full">
                    <p className="text-sm font-bold text-gray-600">Meus Modelos</p>
                    {textosPadroes.map(template => (
                         <button key={template.id} onClick={() => handleDataChange('livreTexto', ataData.livreTexto + template.texto + '\n\n')} className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1 mr-1 mb-1 hover:bg-green-200">{template.titulo}</button>
                    ))}
                </div>
            )}
            {Object.entries(FREE_TEXT_TEMPLATES).map(([category, templates]) => (
                <div key={category} className="w-full">
                    <p className="text-sm font-bold text-gray-600">{category}</p>
                    {templates.map(template => (
                        <button key={template.title} onClick={() => handleDataChange('livreTexto', ataData.livreTexto + template.text + '\n\n')} className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1 mr-1 mb-1 hover:bg-blue-200">{template.title}</button>
                    ))}
                </div>
            ))}
        </div>
       </div>
      <textarea 
        value={ataData.livreTexto} 
        onChange={e => handleDataChange('livreTexto', e.target.value)} 
        rows={10} 
        className="w-full p-2 border rounded" 
        placeholder="Digite ou cole outras ocorrências aqui..."
      />
    </div>
  );

  const handleExportDocx = async () => {
    const doc = generateDocx(ataData);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Ata_${ataData.numeroProcesso || 'processo'}.docx`);
  };

  const handleCopyToClipboard = () => {
    const html = generateAtaHtml(ataData);
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const data = [new ClipboardItem({ [blob.type]: blob })];
      navigator.clipboard.write(data).then(
        () => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar Texto Formatado'), 2000);
        },
        () => {
            const plainText = new DOMParser().parseFromString(html, 'text/html').body.textContent || "";
            navigator.clipboard.writeText(plainText).then(() => {
                setCopyStatus('Copiado como Texto!');
                setTimeout(() => setCopyStatus('Copiar Texto Formatado'), 2000);
            });
        }
      );
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      setCopyStatus('Falha ao copiar');
    }
  };

  const handleSaveDraft = async () => {
    let nomeRascunho = prompt("Digite um nome para o rascunho:", ataData.numeroProcesso || `Rascunho ${new Date().toLocaleDateString()}`);
    if (!nomeRascunho) return;

    try {
        if (currentAtaId) {
            const updatedAta = await api.updateAta(currentAtaId, nomeRascunho, ataData);
            setRascunhos(rascunhos.map(r => r.id === currentAtaId ? updatedAta : r));
            addToast("Rascunho atualizado com sucesso!", "success");
        } else {
            const newAta = await api.addAta(nomeRascunho, ataData);
            setRascunhos([...rascunhos, newAta]);
            setCurrentAtaId(newAta.id);
            addToast("Rascunho salvo com sucesso!", "success");
        }
    } catch(error) {
        addToast("Erro ao salvar rascunho.", "error");
    }
  };

  const handleLoadDraft = (rascunho: AtaRascunho) => {
    setAtaData(rascunho.dados_ata);
    setCurrentAtaId(rascunho.id);
    if(rascunho.dados_ata.preencherDadosIniciais) {
        setCurrentStep(1);
    } else {
        setCurrentStep(4);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este rascunho?")) {
        try {
            await api.deleteAta(id);
            setRascunhos(rascunhos.filter(r => r.id !== id));
            addToast("Rascunho excluído com sucesso!", "success");
        } catch(error) {
            addToast("Erro ao excluir rascunho.", "error");
        }
    }
  };
  
  const handleNewAta = () => {
    setAtaData(initialAtaData);
    setCurrentAtaId(null);
    setCurrentStep(1);
  };

  const handleAnalyzeText = async (section: 'header' | 'reclamante' | 'reclamada') => {
    let textToAnalyze = '';
    if (section === 'header') textToAnalyze = ataData.headerPastedText;
    else if (section === 'reclamante') textToAnalyze = ataData.reclamantePastedText;
    else if (section === 'reclamada') textToAnalyze = ataData.reclamadaPastedText;

    if (!textToAnalyze.trim()) {
        addToast("A área de texto está vazia.", "error");
        return;
    }

    setIsAnalyzing(prev => ({ ...prev, [section]: true }));
    addToast("Analisando texto com IA...", "info");
    
    try {
        if (section === 'header') {
            const parsedData = await api.analyzeTextWithAI(textToAnalyze, 'header') as ParsedHeaderData;
            setAtaData(prev => ({
                ...prev,
                numeroProcesso: parsedData.numeroProcesso || prev.numeroProcesso,
                varaTrabalho: parsedData.varaTrabalho || prev.varaTrabalho,
                juizNome: parsedData.juizNome || prev.juizNome,
                tipoAcao: parsedData.tipoAcao || prev.tipoAcao,
                reclamantes: [{ ...prev.reclamantes[0], nome: parsedData.reclamanteNome || prev.reclamantes[0].nome }],
                reclamadas: [{ ...prev.reclamadas[0], nome: parsedData.reclamadaNome || prev.reclamadas[0].nome }],
            }));
        } else { // party
             const parsedData = await api.analyzeTextWithAI(textToAnalyze, 'party') as ParsedPartyData;
             if (section === 'reclamante') {
                 setAtaData(prev => ({
                    ...prev,
                    reclamantes: [{...prev.reclamantes[0], nome: parsedData.nome, advogado: parsedData.advogado }]
                 }));
             } else { // reclamada
                setAtaData(prev => ({
                    ...prev,
                    reclamadas: [{...prev.reclamadas[0], nome: parsedData.nome, advogado: parsedData.advogado, representante: parsedData.representante }]
                 }));
             }
        }

        addToast("Dados extraídos com sucesso!", "success");
    } catch (error) {
        console.error("AI analysis failed:", error);
        addToast("Falha na análise do texto. Tente novamente.", "error");
    } finally {
        setIsAnalyzing(prev => ({ ...prev, [section]: false }));
    }
};


  const renderCurrentStep = () => {
    if (loading) {
        return <div className="text-center p-10">Carregando dados...</div>
    }
    const modeButtonClasses = (isActive: boolean) => `px-3 py-1 text-sm rounded-md ${isActive ? 'bg-brand-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;

    switch (currentStep) {
      case 0: // Dashboard / Start Screen
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Painel de Controle</h2>
            <div className="space-y-6">
                <button 
                    onClick={handleNewAta}
                    className="w-full px-6 py-4 bg-brand-600 text-white font-semibold rounded-md hover:bg-brand-700 transition-colors text-center text-lg"
                >
                    + Criar Nova Ata
                </button>
                
                <div>
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Rascunhos Salvos</h3>
                    {rascunhos.length > 0 ? (
                        <ul className="space-y-3 max-h-96 overflow-y-auto">
                            {rascunhos.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map(r => (
                                <li key={r.id} className="p-4 bg-gray-50 border rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{r.nome_rascunho}</p>
                                        <p className="text-sm text-gray-500">
                                            Última atualização: {new Date(r.updated_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleLoadDraft(r)} className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">Continuar</button>
                                        <button onClick={() => handleDeleteDraft(r.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Excluir</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center p-4 border-dashed border-2 rounded-md">Nenhum rascunho salvo.</p>
                    )}
                </div>
            </div>
          </div>
        );
      case 1: // Cabeçalho ou Pergunta inicial
        return (
          <div>
            <h3 className="font-semibold text-lg mb-4">Deseja preencher as informações de Cabeçalho, Abertura e Partes?</h3>
            <div className="flex space-x-4 mb-6">
              <button onClick={() => { handleDataChange('preencherDadosIniciais', true); nextStep(); }} className={modeButtonClasses(ataData.preencherDadosIniciais)}>Sim, preencher do início</button>
              <button onClick={() => { handleDataChange('preencherDadosIniciais', false); goToStep(4); }} className={modeButtonClasses(!ataData.preencherDadosIniciais)}>Não, pular para o corpo da ata</button>
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
                            <input type="text" placeholder="Data da audiência (por extenso)" value={ataData.dataAudiencia} onChange={e => handleDataChange('dataAudiencia', e.target.value)} className="p-2 border rounded"/>
                            <input type="text" placeholder="Identificação da Vara do Trabalho" value={ataData.varaTrabalho} onChange={e => handleDataChange('varaTrabalho', e.target.value)} className="p-2 border rounded"/>
                            <JuizSelector id="juiz-nome" label="Nome do(a) Juiz(a)" juizes={juizes} value={ataData.juizNome} onChange={v => handleDataChange('juizNome', v)}/>
                            <input type="text" placeholder="Tipo de ação" value={ataData.tipoAcao} onChange={e => handleDataChange('tipoAcao', e.target.value)} className="p-2 border rounded"/>
                            <input type="text" placeholder="Número do processo" value={ataData.numeroProcesso} onChange={e => handleDataChange('numeroProcesso', e.target.value)} className="p-2 border rounded col-span-1 md:col-span-2"/>
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="incluir-paragrafo"
                                checked={ataData.incluirParagrafoIntrodutorio}
                                onChange={e => handleDataChange('incluirParagrafoIntrodutorio', e.target.checked)}
                                className="h-4 w-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                            />
                            <label htmlFor="incluir-paragrafo" className="ml-2 block text-sm text-gray-900">
                                Incluir parágrafo introdutório padrão
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <textarea value={ataData.headerPastedText} onChange={(e) => handleDataChange('headerPastedText', e.target.value)} rows={8} className="w-full p-2 border rounded" placeholder="Cole aqui o texto do cabeçalho..."></textarea>
                         <button onClick={() => handleAnalyzeText('header')} disabled={isAnalyzing['header']} className="absolute bottom-2 right-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-md hover:bg-indigo-200 disabled:bg-gray-300">
                             {isAnalyzing['header'] ? 'Analisando...' : '✨ Analisar com IA'}
                         </button>
                    </div>
                )}
            </>
            )}
          </div>
        );
      case 2: // Abertura e Partes
          return (
          <div>
            <h2 className="text-2xl font-bold mb-4">2. Abertura e Partes</h2>
            <div className="space-y-6">
                {/* Abertura */}
                <div className="p-4 border rounded-md">
                    <h3 className="font-semibold text-lg mb-2">Abertura da Audiência</h3>
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('aberturaMode', SectionInputMode.DEFAULT)} className={modeButtonClasses(ataData.aberturaMode === SectionInputMode.DEFAULT)}>Usar Padrão</button>
                        <button onClick={() => handleDataChange('aberturaMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.aberturaMode === SectionInputMode.MANUAL)}>Manual</button>
                        <button onClick={() => handleDataChange('aberturaMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.aberturaMode === SectionInputMode.PASTE)}>Colar</button>
                    </div>
                    {(ataData.aberturaMode === SectionInputMode.DEFAULT || ataData.aberturaMode === SectionInputMode.MANUAL) && (
                        <input type="text" placeholder="Horário de abertura (HH:MM)" value={ataData.aberturaHora} onChange={e => handleDataChange('aberturaHora', e.target.value)} className="p-2 border rounded w-full"/>
                    )}
                    {ataData.aberturaMode === SectionInputMode.PASTE && (
                         <textarea value={ataData.aberturaPastedText} onChange={(e) => handleDataChange('aberturaPastedText', e.target.value)} rows={3} className="w-full p-2 border rounded" placeholder="Cole o texto da abertura..."></textarea>
                    )}
                </div>

                {/* Parte Reclamante */}
                <div className="p-4 border rounded-md">
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
                                        <button onClick={() => removeReclamante(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold">X</button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Nome completo" value={reclamante.nome} onChange={e => updateReclamante(index, 'nome', e.target.value)} className="p-2 border rounded"/>
                                        <select value={reclamante.comparecimento} onChange={e => updateReclamante(index, 'comparecimento', e.target.value)} className="p-2 border rounded">
                                            <option value="pessoalmente">Pessoalmente</option>
                                            <option value="por videoconferência">Videoconferência</option>
                                            <option value="ausente">Ausente</option>
                                        </select>
                                        <input type="text" placeholder="Advogado(a) e OAB" value={reclamante.advogado} onChange={e => updateReclamante(index, 'advogado', e.target.value)} className="p-2 border rounded col-span-1 md:col-span-2"/>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addReclamante} className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300">+ Adicionar Reclamante</button>
                        </div>
                    ) : (
                        <div className="relative">
                            <textarea value={ataData.reclamantePastedText} onChange={(e) => handleDataChange('reclamantePastedText', e.target.value)} rows={3} className="w-full p-2 border rounded" placeholder="Cole os dados da parte reclamante..."></textarea>
                            <button onClick={() => handleAnalyzeText('reclamante')} disabled={isAnalyzing['reclamante']} className="absolute bottom-2 right-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-md hover:bg-indigo-200 disabled:bg-gray-300">
                                {isAnalyzing['reclamante'] ? 'Analisando...' : '✨ Analisar com IA'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Parte Reclamada */}
                 <div className="p-4 border rounded-md">
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
                                        <button onClick={() => removeReclamada(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold">X</button>
                                     )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Nome/Razão Social" value={reclamada.nome} onChange={e => updateReclamada(index, 'nome', e.target.value)} className="p-2 border rounded"/>
                                        <input type="text" placeholder="Representante Legal" value={reclamada.representante} onChange={e => updateReclamada(index, 'representante', e.target.value)} className="p-2 border rounded"/>
                                        <input type="text" placeholder="Advogado(a) e OAB (se houver)" value={reclamada.advogado} onChange={e => updateReclamada(index, 'advogado', e.target.value)} className="p-2 border rounded col-span-1 md:col-span-2"/>
                                    </div>
                                </div>
                            ))}
                             <button onClick={addReclamada} className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300">+ Adicionar Reclamada</button>
                        </div>
                     ) : (
                        <div className="relative">
                            <textarea value={ataData.reclamadaPastedText} onChange={(e) => handleDataChange('reclamadaPastedText', e.target.value)} rows={3} className="w-full p-2 border rounded" placeholder="Cole os dados da parte reclamada..."></textarea>
                            <button onClick={() => handleAnalyzeText('reclamada')} disabled={isAnalyzing['reclamada']} className="absolute bottom-2 right-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-md hover:bg-indigo-200 disabled:bg-gray-300">
                                {isAnalyzing['reclamada'] ? 'Analisando...' : '✨ Analisar com IA'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Estudantes de Direito */}
                <div className="p-4 border rounded-md">
                    <h3 className="font-semibold text-lg mb-2">Estudantes de Direito (Opcional)</h3>
                     <div className="flex space-x-2 mb-4">
                        <button onClick={() => handleDataChange('estudanteMode', SectionInputMode.MANUAL)} className={modeButtonClasses(ataData.estudanteMode === SectionInputMode.MANUAL)}>Preencher Manualmente</button>
                        <button onClick={() => handleDataChange('estudanteMode', SectionInputMode.PASTE)} className={modeButtonClasses(ataData.estudanteMode === SectionInputMode.PASTE)}>Colar do Sistema</button>
                    </div>

                    {ataData.estudanteMode === SectionInputMode.MANUAL ? (
                        <div className="space-y-4">
                            {ataData.estudantes.map((estudante, index) => (
                                <div key={estudante.id} className="p-3 border rounded-lg bg-gray-50 relative">
                                    <button onClick={() => removeEstudante(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold">X</button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Nome completo" value={estudante.nome} onChange={e => updateEstudante(index, 'nome', e.target.value)} className="p-2 border rounded"/>
                                        <input type="text" placeholder="CPF" value={estudante.cpf} onChange={e => updateEstudante(index, 'cpf', e.target.value)} className="p-2 border rounded"/>
                                        <input type="text" placeholder="Faculdade" value={estudante.faculdade} onChange={e => updateEstudante(index, 'faculdade', e.target.value)} className="p-2 border rounded"/>
                                        <input type="text" placeholder="Período" value={estudante.periodo} onChange={e => updateEstudante(index, 'periodo', e.target.value)} className="p-2 border rounded"/>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addEstudante} className="px-4 py-2 bg-gray-200 text-sm rounded-md hover:bg-gray-300">+ Adicionar Estudante</button>
                        </div>
                    ) : (
                        <textarea
                            value={ataData.estudantePastedText}
                            onChange={(e) => handleDataChange('estudantePastedText', e.target.value)}
                            rows={4}
                            className="w-full p-2 border rounded"
                            placeholder="Cole os dados do(s) estudante(s) aqui..."
                        />
                    )}
                </div>

            </div>
          </div>
        );
      case 3: // Instalação (etapa lógica, pula direto para conciliação)
          goToStep(4);
          return null;
      case 4: // Conciliação
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">3. Conciliação</h2>
            <div className="flex space-x-4 mb-4">
                {(Object.keys(ConciliacaoStatus) as Array<keyof typeof ConciliacaoStatus>).map(key => (
                    <button key={key} onClick={() => handleConciliacaoStatusChange(ConciliacaoStatus[key])} className={`px-4 py-2 rounded ${ataData.conciliacaoStatus === ConciliacaoStatus[key] ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>{ConciliacaoStatus[key]}</button>
                ))}
            </div>
            {ataData.conciliacaoStatus === ConciliacaoStatus.ACEITA && (
                <textarea value={ataData.conciliacaoTermos} onChange={e => handleDataChange('conciliacaoTermos', e.target.value)} rows={5} className="w-full p-2 border rounded" placeholder="Descreva os termos do acordo"></textarea>
            )}
          </div>
        );
      case 5: // Contestação e Réplica
          return (
              <div>
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
                            <textarea value={ataData.contestacaoTexto} onChange={e => handleDataChange('contestacaoTexto', e.target.value)} rows={3} className="w-full p-2 border rounded" placeholder="Texto da contestação"></textarea>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Prazo para Réplica</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(Object.keys(ReplicaPrazo) as Array<keyof typeof ReplicaPrazo>).map(key => (
                                <button key={key} onClick={() => handleReplicaPrazoChange(ReplicaPrazo[key])} className={`px-4 py-2 rounded text-sm ${ataData.replicaPrazo === ReplicaPrazo[key] ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>{ReplicaPrazo[key]}</button>
                            ))}
                        </div>
                        {ataData.replicaPrazo === ReplicaPrazo.PERSONALIZADO && (
                            <textarea value={ataData.replicaTexto} onChange={e => handleDataChange('replicaTexto', e.target.value)} rows={3} className="w-full p-2 border rounded" placeholder="Texto personalizado para o prazo de réplica"></textarea>
                        )}
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2">Observações/Requerimentos/Determinações (Opcional)</h3>
                        <textarea 
                            value={ataData.observacoesGerais} 
                            onChange={e => handleDataChange('observacoesGerais', e.target.value)} 
                            rows={4} 
                            className="w-full p-2 border rounded" 
                            placeholder="Insira aqui qualquer requerimento das partes, determinação do juiz ou outra observação pertinente que deva constar na ata antes da designação dos próximos atos.">
                        </textarea>
                    </div>
                </div>
              </div>
          );
      case 6: // Atos Processuais (Seleção)
          return (
              <div>
                  <h2 className="text-2xl font-bold mb-4">5. Designação de Atos Processuais</h2>
                  <p className="text-gray-600 mb-6">Escolha o próximo passo do processo.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ATOS_PROCESSUAIS_OPTIONS.map(opt => (
                           <button key={opt.id} onClick={() => { handleDataChange('atosProcessuaisOpcao', opt.id); nextStep(); }} className="p-4 bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow text-left">
                               <div className="text-3xl mb-2">{opt.icon}</div>
                               <h3 className="text-lg font-semibold text-brand-700">{opt.title}</h3>
                               <p className="text-sm text-gray-500">{opt.description}</p>
                           </button>
                      ))}
                  </div>
              </div>
          );
      case 7: // Atos Processuais (Formulário)
          switch(ataData.atosProcessuaisOpcao) {
              case AtosProcessuaisOpcao.INICIAL:
                  return (<div><h2 className="text-2xl font-bold mb-4">Opção A: Audiência Inicial</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="text" placeholder="Data da próxima audiência (DD/MM/AAAA)" value={ataData.instrucaoData} onChange={e => handleDataChange('instrucaoData', e.target.value)} className="p-2 border rounded"/><input type="text" placeholder="Horário (HH:MM)" value={ataData.instrucaoHora} onChange={e => handleDataChange('instrucaoHora', e.target.value)} className="p-2 border rounded"/></div><FreeTextSection /></div>);
              case AtosProcessuaisOpcao.PERICIA_MEDICA:
                  return (<div><h2 className="text-2xl font-bold mb-4">Opção B: Perícia Médica</h2><div className="space-y-4"><PeritoSelector id="perito-medico" label="Nome do(a) Perito(a)" peritos={peritos} value={ataData.periciaMedicaPerito} onChange={v => handleDataChange('periciaMedicaPerito', v)}/><input type="text" placeholder="Tipo de doença alegada" value={ataData.periciaMedicaDoenca} onChange={e => handleDataChange('periciaMedicaDoenca', e.target.value)} className="p-2 border rounded w-full"/><input type="text" placeholder="Contato do reclamante (telefone)" value={ataData.periciaMedicaContatoReclamante} onChange={e => handleDataChange('periciaMedicaContatoReclamante', e.target.value)} className="p-2 border rounded w-full"/><input type="text" placeholder="Contato do advogado do reclamante (telefone)" value={ataData.periciaMedicaContatoAdvogado} onChange={e => handleDataChange('periciaMedicaContatoAdvogado', e.target.value)} className="p-2 border rounded w-full"/><input type="text" placeholder="Contato da reclamada (telefone)" value={ataData.periciaMedicaContatoReclamada} onChange={e => handleDataChange('periciaMedicaContatoReclamada', e.target.value)} className="p-2 border rounded w-full"/><input type="email" placeholder="E-mail da reclamada" value={ataData.periciaMedicaEmailReclamada} onChange={e => handleDataChange('periciaMedicaEmailReclamada', e.target.value)} className="p-2 border rounded w-full"/></div><FreeTextSection /></div>);
              case AtosProcessuaisOpcao.PERICIA_INSALUBRIDADE:
                  return (<div><h2 className="text-2xl font-bold mb-4">Opção C: Perícia Insalubridade/Periculosidade</h2><div className="space-y-4"><PeritoSelector id="perito-insalubridade" label="Nome do(a) Perito(a)" peritos={peritos} value={ataData.periciaInsalubridadePerito} onChange={v => handleDataChange('periciaInsalubridadePerito', v)}/><select value={ataData.periciaInsalubridadeTipo} onChange={e => handleDataChange('periciaInsalubridadeTipo', e.target.value)} className="p-2 border rounded w-full"><option>ADICIONAL DE INSALUBRIDADE</option><option>ADICIONAL DE PERICULOSIDADE</option><option>ADICIONAL DE INSALUBRIDADE/PERICULOSIDADE</option></select><input type="text" placeholder="Contato do reclamante (telefone)" value={ataData.periciaInsalubridadeContatoReclamante} onChange={e => handleDataChange('periciaInsalubridadeContatoReclamante', e.target.value)} className="p-2 border rounded w-full"/><input type="text" placeholder="Contato do advogado do reclamante (telefone)" value={ataData.periciaInsalubridadeContatoAdvogado} onChange={e => handleDataChange('periciaInsalubridadeContatoAdvogado', e.target.value)} className="p-2 border rounded w-full"/><input type="text" placeholder="Contato da reclamada (telefone)" value={ataData.periciaInsalubridadeContatoReclamada} onChange={e => handleDataChange('periciaInsalubridadeContatoReclamada', e.target.value)} className="p-2 border rounded w-full"/></div><FreeTextSection /></div>);
              case AtosProcessuaisOpcao.PERICIA_CONTABIL:
                  return (<div><h2 className="text-2xl font-bold mb-4">Opção D: Perícia Contábil</h2><div className="space-y-4"><PeritoSelector id="perito-contabil" label="Nome do(a) Perito(a) Contábil" peritos={peritos} value={ataData.periciaContabilPerito} onChange={v => handleDataChange('periciaContabilPerito', v)}/></div><FreeTextSection /></div>);
              case AtosProcessuaisOpcao.GRAVACAO:
                    const contraditaTemplate = `Testemunha contraditada por xxxxxx
Interrogada, a testemunha respondeu, conforme gravação.
Pelo Juízo, foi rejeitada (1) / acolhida (2) a contradita, conforme gravação. Consignados os protestos da parte plúrima reclamada
(1)A testemunha foi advertida e compromissada sob as penas da lei /(2) passou a ser ouvida como informante. Aos costumes nada disse. Às perguntas respondeu: GRAVADO`;
                    return (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Opção E: Gravação de Instrução</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="font-semibold">Tópicos de prova</label>
                                    <textarea value={ataData.gravacaoTopicos} onChange={e => handleDataChange('gravacaoTopicos', e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder="Um tópico por linha..."></textarea>
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
                                                    <input type="text" placeholder="Nome" value={t.nome} onChange={e => updateTestemunha('Reclamante', i, 'nome', e.target.value)} className="p-2 border rounded w-full"/>
                                                    <input type="text" placeholder="CPF" value={t.cpf} onChange={e => updateTestemunha('Reclamante', i, 'cpf', e.target.value)} className="p-2 border rounded w-full"/>
                                                    <input type="text" placeholder="Endereço" value={t.endereco} onChange={e => updateTestemunha('Reclamante', i, 'endereco', e.target.value)} className="p-2 border rounded w-full"/>
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
                                                    <input type="text" placeholder="Nome" value={t.nome} onChange={e => updateTestemunha('Reclamada', i, 'nome', e.target.value)} className="p-2 border rounded w-full"/>
                                                    <input type="text" placeholder="CPF" value={t.cpf} onChange={e => updateTestemunha('Reclamada', i, 'cpf', e.target.value)} className="p-2 border rounded w-full"/>
                                                    <input type="text" placeholder="Endereço" value={t.endereco} onChange={e => updateTestemunha('Reclamada', i, 'endereco', e.target.value)} className="p-2 border rounded w-full"/>
                                                </div>
                                            ))}
                                            <button onClick={() => addTestemunha('Reclamada')} className="px-4 py-2 bg-gray-200 rounded">+ Adicionar Testemunha</button>
                                        </div>
                                    )}
                                </div>
                                 <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <label className="font-semibold">Contradita de Testemunha (Opcional)</label>
                                      <button onClick={() => handleDataChange('contraditaTexto', contraditaTemplate)} className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1 hover:bg-blue-200">Usar Modelo</button>
                                    </div>
                                    <textarea 
                                      value={ataData.contraditaTexto} 
                                      onChange={e => handleDataChange('contraditaTexto', e.target.value)} 
                                      rows={4} 
                                      className="w-full p-2 border rounded"
                                      placeholder="Descreva aqui a contradita, se houver..."
                                    ></textarea>
                                </div>
                                <FreeTextSection />
                                <div>
                                    <label className="font-semibold">Tipo de razões finais</label>
                                    <select value={ataData.gravacaoRazoesFinais} onChange={e => handleDataChange('gravacaoRazoesFinais', e.target.value)} className="p-2 border rounded w-full">
                                        <option value="remissivas">Razões finais remissivas</option>
                                        <option value="memoriais">Razões finais em memoriais (prazo de 02 dias)</option>
                                        <option value="memoriais_data">Razões finais em memoriais (prazo com data)</option>
                                        <option value="personalizado">Texto personalizado</option>
                                    </select>
                                    {ataData.gravacaoRazoesFinais === 'personalizado' && (
                                        <textarea value={ataData.gravacaoRazoesFinaisTexto} onChange={e => handleDataChange('gravacaoRazoesFinaisTexto', e.target.value)} rows={2} className="w-full p-2 border rounded mt-2"></textarea>
                                    )}
                                </div>
                                 <div>
                                    <label className="font-semibold">Horário de Encerramento</label>
                                    <input type="text" placeholder="HH:MM" value={ataData.encerramentoHora} onChange={e => handleDataChange('encerramentoHora', e.target.value)} className="p-2 border rounded w-full"/>
                                </div>
                            </div>
                        </div>
                    );
              case AtosProcessuaisOpcao.ADIAMENTO_FRACIONAMENTO:
                  return (
                      <div>
                          <h2 className="text-2xl font-bold mb-4">Opção H: Adiamento/Fracionamento</h2>
                          <div className="space-y-4">
                              <input type="text" placeholder="Motivo do adiamento/fracionamento" value={ataData.adiamentoMotivo} onChange={e => handleDataChange('adiamentoMotivo', e.target.value)} className="p-2 border rounded w-full"/>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input type="text" placeholder="Data da próxima audiência (DD/MM/AAAA)" value={ataData.adiamentoData} onChange={e => handleDataChange('adiamentoData', e.target.value)} className="p-2 border rounded"/>
                                  <input type="text" placeholder="Horário (HH:MM)" value={ataData.adiamentoHora} onChange={e => handleDataChange('adiamentoHora', e.target.value)} className="p-2 border rounded"/>
                              </div>
                          </div>
                          <FreeTextSection />
                      </div>
                  );
              case AtosProcessuaisOpcao.SUSPENSAO_PEJOTIZACAO:
                  return (
                      <div>
                          <h2 className="text-2xl font-bold mb-4">Opção I: Suspensão (Pejotização)</h2>
                          <p className="text-gray-700">Nenhum dado adicional é necessário para esta opção, o texto padrão será gerado.</p>
                          <p className="text-gray-700">Clique em 'Avançar' para prosseguir para a tela de encerramento e informar o horário.</p>
                          <FreeTextSection />
                      </div>
                  );
              case AtosProcessuaisOpcao.LIVRE:
                  return (
                      <div>
                          <h2 className="text-2xl font-bold mb-4">Opção F: Texto Livre/Outras Ocorrências</h2>
                           <div className="mb-4">
                            <h3 className="font-semibold mb-2">Templates Rápidos</h3>
                            <div className="flex flex-wrap gap-2">
                                {textosPadroes.length > 0 && (
                                    <div className="w-full">
                                        <p className="text-sm font-bold text-gray-600">Meus Modelos</p>
                                        {textosPadroes.map(template => (
                                            <button key={template.id} onClick={() => handleDataChange('livreTexto', ataData.livreTexto + template.texto + '\n\n')} className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1 mr-1 mb-1 hover:bg-green-200">{template.titulo}</button>
                                        ))}
                                    </div>
                                )}
                                {Object.entries(FREE_TEXT_TEMPLATES).map(([category, templates]) => (
                                    <div key={category} className="w-full">
                                        <p className="text-sm font-bold text-gray-600">{category}</p>
                                        {templates.map(template => (
                                            <button key={template.title} onClick={() => handleDataChange('livreTexto', ataData.livreTexto + template.text + '\n\n')} className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1 mr-1 mb-1 hover:bg-blue-200">{template.title}</button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                           </div>
                          <textarea value={ataData.livreTexto} onChange={e => handleDataChange('livreTexto', e.target.value)} rows={15} className="w-full p-2 border rounded" placeholder="Digite aqui..."></textarea>
                      </div>
                  );
              case AtosProcessuaisOpcao.MATERIA_DIREITO:
                  return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Opção G: Encerramento (Matéria de Direito)</h2>
                        <p className="text-gray-700">Nenhum dado adicional é necessário para esta opção.</p>
                        <p className="text-gray-700">Clique em 'Avançar' para prosseguir para a tela de encerramento e informar o horário.</p>
                        <FreeTextSection />
                    </div>
                  );
              default:
                return <p>Selecione uma opção de atos processuais na etapa anterior.</p>
          }
      case 8: // Encerramento
        return (
            <div>
              <h2 className="text-2xl font-bold mb-4">6. Encerramento</h2>
              <input type="text" placeholder="Horário de encerramento (HH:MM)" value={ataData.encerramentoHora} onChange={e => handleDataChange('encerramentoHora', e.target.value)} className="p-2 border rounded w-full"/>
            </div>
        );
      case 9: // Finalizar
          return (
              <div>
                  <h2 className="text-2xl font-bold mb-4">Ata Finalizada</h2>
                  <p className="mb-4 text-gray-700">Sua ata foi gerada. Revise o conteúdo ao lado e utilize as opções abaixo.</p>
                  <div className="flex flex-col space-y-2">
                      <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{copyStatus}</button>
                      <button onClick={handleExportDocx} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Exportar para DOCX</button>
                      <button onClick={() => { setCurrentStep(0);}} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Voltar ao Painel</button>
                  </div>
              </div>
          );
      default:
        return null;
    }
  };

  const isFinalStep = ataData.atosProcessuaisOpcao === AtosProcessuaisOpcao.GRAVACAO ? currentStep === 7 : currentStep === 8;
  
  const ToastContainer = () => {
    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };
    return (
      <div className="fixed top-5 right-5 z-[100] space-y-2">
          {toasts.map(toast => (
              <div key={toast.id} className={`p-4 rounded-md shadow-lg text-white ${bgColor[toast.type]}`}>
                  {toast.message}
              </div>
          ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
       <ToastContainer />
       {showPeritoManager && <PeritoManagerModal />}
       {showJuizManager && <JuizManagerModal />}
       {showTextoManager && <TextoManagerModal />}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-800">Gerador de Atas</h1>
        <div className="flex items-center flex-wrap gap-2">
            {currentStep > 0 && (
                <button onClick={handleSaveDraft} className="px-3 py-2 text-xs sm:px-4 sm:text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500">Salvar Rascunho</button>
            )}
            <button onClick={() => setShowJuizManager(true)} className="px-3 py-2 text-xs sm:px-4 sm:text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Gerenciar Juízes</button>
            <button onClick={() => setShowPeritoManager(true)} className="px-3 py-2 text-xs sm:px-4 sm:text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Gerenciar Peritos</button>
            <button onClick={() => setShowTextoManager(true)} className="px-3 py-2 text-xs sm:px-4 sm:text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Gerenciar Textos</button>
            <button onClick={() => { setCurrentStep(0);}} className="px-3 py-2 text-xs sm:px-4 sm:text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">Painel Principal</button>
        </div>
      </header>
      
      <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
            {/* Stepper */}
             {currentStep > 0 && currentStep < 9 && (
                <div className="mb-6">
                    <ol className="flex items-center w-full">
                       {STEPS.slice(1,9).map((step, index) => (
                           <li key={step} className={`flex w-full items-center ${index + 1 < currentStep ? 'text-blue-600' : ''} ${index + 1 < 8 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:inline-block" : ""}`}>
                                <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${index+1 <= currentStep ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                   {index+1}
                                </span>
                           </li>
                       ))}
                    </ol>
                </div>
            )}
            
            {renderCurrentStep()}
            
            <div className="mt-8 flex justify-between">
                {currentStep > 1 && currentStep < 9 && (
                    <button onClick={prevStep} className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400">Voltar</button>
                )}
                {((currentStep > 0 && currentStep < 7) || (currentStep === 7 && ataData.atosProcessuaisOpcao !== AtosProcessuaisOpcao.GRAVACAO)) && (
                    <button onClick={nextStep} className="px-6 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">Avançar</button>
                )}
                {isFinalStep && (
                     <button onClick={() => goToStep(9)} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Finalizar e Gerar Ata</button>
                )}
            </div>
        </div>

        <div className="h-[calc(100vh-120px)] sticky top-24">
             <Preview data={ataData} />
        </div>
      </main>
      <footer className="text-center p-4 text-xs text-gray-500">
        Elaborado por Johnny Santos - TRT/19
      </footer>
    </div>
  );
};

export default App;
