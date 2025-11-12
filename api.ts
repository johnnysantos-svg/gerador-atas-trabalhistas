
import { supabase } from './supabaseClient';
import { Perito, Juiz, TextoPadrao, AtaRascunho, AtaData, ParsedHeaderData, ParsedPartyData, User } from './types';
import { GoogleGenAI, Type } from '@google/genai';

// --- FUNÇÕES DE AUTENTICAÇÃO ---

export const login = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    try {
        const emailLower = email.toLowerCase().trim();
        
        // Primeiro, verificar se o usuário existe na tabela usuarios
        const { data: usuarioData, error: usuarioError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', emailLower)
            .single();

        if (usuarioError || !usuarioData) {
            console.error('User not found in usuarios table:', usuarioError);
            return { user: null, error: 'Usuário não encontrado' };
        }

        // Tentar fazer login com email e senha no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password: password,
        });

        if (authError) {
            console.error('Auth login error:', authError);
            // Mensagens de erro mais amigáveis
            if (authError.message.includes('Invalid login credentials')) {
                return { user: null, error: 'Email ou senha incorretos' };
            }
            if (authError.message.includes('Email not confirmed')) {
                return { user: null, error: 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.' };
            }
            return { user: null, error: authError.message || 'Erro ao fazer login' };
        }

        if (!authData.user) {
            console.error('No user returned from auth');
            return { user: null, error: 'Erro ao autenticar usuário' };
        }

        // Verificar se o email foi confirmado
        if (!authData.user.email_confirmed_at) {
            console.warn('User email not confirmed');
            return { user: null, error: 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.' };
        }

        console.log('Login successful:', usuarioData);
        return { user: usuarioData, error: null };
    } catch (error: any) {
        console.error('Login error:', error);
        return { user: null, error: error.message || 'Erro ao fazer login' };
    }
};

export const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
            return null;
        }

        const { data: usuarioData, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', authUser.email)
            .single();

        if (error || !usuarioData) {
            return null;
        }

        return usuarioData;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
};

export const createUser = async (email: string, password: string, nome: string, isAdmin: boolean = false): Promise<{ user: User | null; error: string | null }> => {
    try {
        const emailLower = email.toLowerCase().trim();
        
        // Verificar se o usuário já existe
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', emailLower)
            .single();

        if (existingUser) {
            return { user: null, error: 'Este email já está cadastrado' };
        }

        // Criar usuário via signUp
        // IMPORTANTE: No Supabase, você precisa desabilitar "Enable email confirmations" 
        // em Authentication > Settings > Email Auth para que o login funcione imediatamente
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: emailLower,
            password: password,
            options: {
                emailRedirectTo: undefined,
                data: {
                    nome: nome,
                    is_admin: isAdmin,
                }
            }
        });

        if (signUpError) {
            console.error('SignUp error:', signUpError);
            return { user: null, error: signUpError.message || 'Erro ao criar usuário no sistema de autenticação' };
        }

        if (!signUpData.user) {
            console.error('No user returned from signUp');
            return { user: null, error: 'Erro ao criar usuário' };
        }

        // Aguardar um pouco para garantir que o usuário foi criado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Criar registro na tabela usuarios
        const { data: usuarioData, error: usuarioError } = await supabase
            .from('usuarios')
            .insert([{
                id: signUpData.user.id,
                email: emailLower,
                nome: nome,
                is_admin: isAdmin,
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (usuarioError) {
            console.error('Error creating user in usuarios table:', usuarioError);
            // Tentar deletar o usuário do Auth se possível
            return { user: null, error: usuarioError.message || 'Erro ao criar registro do usuário. O usuário pode ter sido criado no sistema de autenticação mas não na tabela.' };
        }

        console.log('User created successfully:', usuarioData);
        return { user: usuarioData, error: null };
    } catch (error: any) {
        console.error('Create user error:', error);
        return { user: null, error: error.message || 'Erro ao criar usuário' };
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
    return data || [];
};

export const deleteUser = async (userId: string): Promise<void> => {
    // Deletar da tabela usuarios (o cascade vai deletar do auth se configurado)
    const { error: dbError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', userId);

    if (dbError) {
        console.error('Error deleting user:', dbError);
        throw dbError;
    }

    // Nota: Para deletar do Supabase Auth, você precisará usar uma Edge Function
    // ou ter permissões de admin. Por enquanto, apenas deletamos da tabela usuarios.
    // O usuário ainda existirá no Auth, mas não poderá fazer login.
};

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
