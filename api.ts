
import { supabase } from './supabaseClient';
import { Perito, Juiz, TextoPadrao, AtaRascunho, AtaData, ParsedHeaderData, ParsedPartyData } from './types';
import { GoogleGenAI, Type } from '@google/genai';

// --- FUNÇÕES DA API REAL (SUPABASE) ---

// Peritos
export const getPeritos = async (): Promise<Perito[]> => {
  const { data, error } = await supabase.from('peritos').select('*').order('nome');
  if (error) {
    console.error('Error fetching peritos:', error);
    throw error;
  }
  return data || [];
};

export const addPerito = async (nome: string): Promise<Perito> => {
  const { data, error } = await supabase
    .from('peritos')
    .insert([{ nome: nome.toUpperCase() }])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding perito:', error);
    throw error;
  }
  return data;
};

export const updatePerito = async (id: string, nome: string): Promise<Perito> => {
    const { data, error } = await supabase
      .from('peritos')
      .update({ nome: nome.toUpperCase() })
      .eq('id', id)
      .select()
      .single();
  
    if (error) {
      console.error('Error updating perito:', error);
      throw error;
    }
    return data;
};

export const deletePerito = async (id: string): Promise<void> => {
  const { error } = await supabase.from('peritos').delete().eq('id', id);
  if (error) {
    console.error('Error deleting perito:', error);
    throw error;
  }
};

// Juizes
export const getJuizes = async (): Promise<Juiz[]> => {
    const { data, error } = await supabase.from('juizes').select('*').order('nome');
    if (error) {
        console.error('Error fetching juizes:', error);
        throw error;
    }
    return data || [];
};

export const addJuiz = async (nome: string): Promise<Juiz> => {
    const { data, error } = await supabase
        .from('juizes')
        .insert([{ nome: nome.toUpperCase() }])
        .select()
        .single();

    if (error) {
        console.error('Error adding juiz:', error);
        throw error;
    }
    return data;
};

export const updateJuiz = async (id: string, nome: string): Promise<Juiz> => {
    const { data, error } = await supabase
      .from('juizes')
      .update({ nome: nome.toUpperCase() })
      .eq('id', id)
      .select()
      .single();
  
    if (error) {
      console.error('Error updating juiz:', error);
      throw error;
    }
    return data;
};


export const deleteJuiz = async (id: string): Promise<void> => {
    const { error } = await supabase.from('juizes').delete().eq('id', id);
    if (error) {
        console.error('Error deleting juiz:', error);
        throw error;
    }
};

// Textos Padrão
export const getTextos = async (): Promise<TextoPadrao[]> => {
    const { data, error } = await supabase.from('textos_padroes').select('*').order('titulo');
    if (error) {
        console.error('Error fetching textos:', error);
        throw error;
    }
    return data || [];
};

export const addTexto = async (titulo: string, texto: string): Promise<TextoPadrao> => {
    const { data, error } = await supabase
        .from('textos_padroes')
        .insert([{ titulo, texto }])
        .select()
        .single();
    
    if (error) {
        console.error('Error adding texto:', error);
        throw error;
    }
    return data;
};

export const updateTexto = async (id: string, titulo: string, texto: string): Promise<TextoPadrao> => {
    const { data, error } = await supabase
      .from('textos_padroes')
      .update({ titulo, texto })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
        console.error('Error updating texto:', error);
        throw error;
    }
    return data;
};

export const deleteTexto = async (id: string): Promise<void> => {
    const { error } = await supabase.from('textos_padroes').delete().eq('id', id);
    if (error) {
        console.error('Error deleting texto:', error);
        throw error;
    }
};

// Atas (Rascunhos)
export const getAtas = async (): Promise<AtaRascunho[]> => {
    const { data, error } = await supabase.from('atas').select('*').order('updated_at', { ascending: false });
    if (error) {
        console.error('Error fetching atas:', error);
        throw error;
    }
    return data || [];
};

export const addAta = async (nome_rascunho: string, dados_ata: AtaData): Promise<AtaRascunho> => {
    const { data, error } = await supabase
        .from('atas')
        .insert([{ nome_rascunho, dados_ata, updated_at: new Date().toISOString() }])
        .select()
        .single();
    
    if (error) {
        console.error('Error adding ata:', error);
        throw error;
    }
    return data;
};

export const updateAta = async (id: string, nome_rascunho: string, dados_ata: AtaData): Promise<AtaRascunho> => {
    const { data, error } = await supabase
      .from('atas')
      .update({ nome_rascunho, dados_ata, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
        console.error('Error updating ata:', error);
        throw error;
    }
    return data;
};

export const deleteAta = async (id: string): Promise<void> => {
    const { error } = await supabase.from('atas').delete().eq('id', id);
    if (error) {
        console.error('Error deleting ata:', error);
        throw error;
    }
};


// --- Gemini API ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const headerSchema = {
    type: Type.OBJECT,
    properties: {
        numeroProcesso: { type: Type.STRING, description: "Número completo do processo." },
        varaTrabalho: { type: Type.STRING, description: "Nome completo da Vara do Trabalho." },
        juizNome: { type: Type.STRING, description: "Nome completo do juiz." },
        tipoAcao: { type: Type.STRING, description: "Tipo de ação, ex: Ação Trabalhista - Rito Sumaríssimo." },
        reclamanteNome: { type: Type.STRING, description: "Nome do primeiro reclamante." },
        reclamadaNome: { type: Type.STRING, description: "Nome do primeiro reclamado." },
    },
};

const partySchema = {
    type: Type.OBJECT,
    properties: {
        nome: { type: Type.STRING, description: "Nome completo da parte." },
        advogado: { type: Type.STRING, description: "Nome do advogado e número da OAB, ex: FULANO DE TAL - OAB/AL 12345." },
        representante: { type: Type.STRING, description: "Nome do preposto ou representante legal (apenas para a reclamada)." },
    }
}

export const analyzeTextWithAI = async (
    text: string, 
    type: 'header' | 'party'
): Promise<ParsedHeaderData | ParsedPartyData> => {
    const systemInstruction = `Você é um assistente jurídico especializado em extrair informações de textos de sistemas de processo judicial eletrônico do Brasil. Analise o texto e extraia os dados solicitados no formato JSON. Se um dado não estiver presente, retorne uma string vazia para o campo.`;
    
    const schema = type === 'header' ? headerSchema : partySchema;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: text,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        if (type === 'header') {
            return parsedJson as ParsedHeaderData;
        }
        return parsedJson as ParsedPartyData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Não foi possível analisar o texto com a IA.");
    }
};
