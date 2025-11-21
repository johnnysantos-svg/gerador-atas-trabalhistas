
import { Juiz, Perito, TextoPadraoDB, Profile, UserWithProfile } from './types';
import { getSupabase } from './supabaseClient';

// Funções para Juízes
export const getJuizes = async (): Promise<Juiz[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('juizes')
            .select('*')
            .order('nome', { ascending: true });
        
        if (error) {
            console.error("Erro ao buscar juízes:", error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Erro inesperado em getJuizes:", error);
        return [];
    }
};

export const addJuiz = async (nome: string): Promise<Juiz> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('juizes')
        .insert({ nome })
        .select()
        .single();
        
    if (error) throw error;
    if (!data) throw new Error('Falha ao adicionar juiz: nenhum dado retornado.');
    return data;
};

export const deleteJuiz = async (id: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('juizes')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Funções para Peritos
export const getPeritos = async (): Promise<Perito[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('peritos')
            .select('*')
            .order('nome', { ascending: true });
            
        if (error) {
            console.error("Erro ao buscar peritos:", error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Erro inesperado em getPeritos:", error);
        return [];
    }
};

export const addPerito = async (nome: string): Promise<Perito> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('peritos')
        .insert({ nome })
        .select()
        .single();
        
    if (error) throw error;
    if (!data) throw new Error('Falha ao adicionar perito: nenhum dado retornado.');
    return data;
};

export const deletePerito = async (id: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('peritos')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Funções para Textos Padrão
export const getTextosPadroes = async (): Promise<TextoPadraoDB[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('textos_padroes')
            .select('*')
            .order('category', { ascending: true })
            .order('title', { ascending: true });

        if (error) {
            console.error("Erro ao buscar textos padrões:", error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Erro inesperado em getTextosPadroes:", error);
        return [];
    }
};

export const addTextoPadrao = async (template: Omit<TextoPadraoDB, 'id' | 'created_at' | 'user_id'>): Promise<TextoPadraoDB> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('textos_padroes')
        .insert(template)
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error('Falha ao adicionar texto padrão: nenhum dado retornado.');
    return data;
};

export const updateTextoPadrao = async (id: string, template: Partial<Omit<TextoPadraoDB, 'id' | 'created_at' | 'user_id'>>): Promise<TextoPadraoDB> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('textos_padroes')
        .update(template)
        .eq('id', id)
        .select()
        .single();
        
    if (error) throw error;
    if (!data) throw new Error('Falha ao atualizar texto padrão: nenhum dado retornado.');
    return data;
};

export const deleteTextoPadrao = async (id: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('textos_padroes')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- Funções de Usuário e Perfil ---

export const getCurrentUserProfile = async (): Promise<Profile | null> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        // If no profile is found, it's not a critical error, just means it might need to be created.
        // The trigger should handle this, but we can be defensive.
        if (error.code === 'PGRST116') {
             console.warn('No profile found for the user.');
             return null;
        }
        throw error;
    }
    return data;
};

/**
 * Permite que o usuário logado atualize sua senha.
 * @param newPassword A nova senha.
 */
export const updateUserPassword = async (newPassword: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};

/**
 * Permite que o usuário logado atualize seus dados de perfil.
 */
export const updateMyProfile = async (profileData: {
    full_name: string;
    phone: string;
    organization: string;
}) => {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('update_my_profile', {
        p_full_name: profileData.full_name,
        p_phone: profileData.phone,
        p_organization: profileData.organization,
    });
    if (error) throw error;
};


// --- Funções de Admin ---

/**
 * Lista todos os perfis de usuários com seus dados completos.
 * A política de RLS garante que apenas administradores possam executar esta ação.
 */
export const listUsers = async (): Promise<UserWithProfile[]> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, role, full_name, phone, organization')
            .order('email', { ascending: true });

        if (error) {
            console.error("Erro ao listar usuários:", error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Erro inesperado em listUsers:", error);
        return [];
    }
};

/**
 * Atualiza a função (role) de um usuário específico.
 * A política de RLS permite que esta operação seja executada de forma segura por um administrador.
 * @param userId O ID do usuário a ser atualizado.
 * @param role A nova função ('user' or 'admin').
 */
export const updateUserRole = async (userId: string, role: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', userId);

    if (error) throw error;
};

/**
 * Invoca a função RPC para que um admin crie um novo usuário.
 * @param userData Dados completos do novo usuário.
 */
export const adminCreateUser = async (userData: {
    email: string;
    password;
    full_name;
    phone;
    organization;
    role;
}) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_create_user', {
        new_email: userData.email,
        new_password: userData.password,
        new_full_name: userData.full_name,
        new_phone: userData.phone,
        new_organization: userData.organization,
        new_role: userData.role,
    });
    if (error) throw error;
    return data;
};

/**
 * Invoca a função RPC para excluir um usuário.
 * Requer que o chamador seja um administrador.
 * @param userId O ID do usuário a ser excluído.
 */
export const deleteUser = async (userId: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('admin_delete_user', {
        delete_user_id: userId,
    });
    if (error) throw error;
};
