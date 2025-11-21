
import React, { useState } from 'react';
import { UserWithProfile } from '../types';
import { updateUserRole, adminCreateUser, deleteUser } from '../api';
import { getSupabase } from '../supabaseClient';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: UserWithProfile[];
    onDataChange: () => void; // To refresh the user list
}

const REQUIRED_SQL_SCRIPT = `-- SCRIPT DE CONFIGURAÇÃO AUTOMÁTICA (ROBÔ DE EXCLUSÃO/CRIAÇÃO) v6.0
-- Execute este script no 'SQL Editor' do Supabase para corrigir permissões e estrutura.

-- 1. Garante que pgcrypto esteja instalada no schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. Limpa funções antigas para garantir atualização limpa
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
DROP FUNCTION IF EXISTS public.admin_delete_user(text);

-- 3. CRIA A FUNÇÃO DE EXCLUSÃO ROBUSTA
-- Adicionado 'extensions' ao search_path
CREATE OR REPLACE FUNCTION public.admin_delete_user(delete_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_requesting_user_role TEXT;
BEGIN
  -- Verifica se quem chamou a função é admin
  SELECT role INTO v_requesting_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_requesting_user_role IS NULL OR v_requesting_user_role <> 'admin' THEN
      RAISE EXCEPTION 'Acesso negado: Apenas administradores podem excluir usuários.';
  END IF;

  BEGIN
    v_user_id := delete_user_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ID de usuário inválido fornecido (não é um UUID válido).';
  END;

  -- Remove dados vinculados das tabelas do sistema (usando cast para texto)
  DELETE FROM public.textos_padroes WHERE user_id::text = delete_user_id;
  DELETE FROM public.juizes WHERE user_id::text = delete_user_id;
  DELETE FROM public.peritos WHERE user_id::text = delete_user_id;
  
  -- Remove o profile
  DELETE FROM public.profiles WHERE id = v_user_id;
  
  -- Remove identidades e o usuário da autenticação
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- 4. CRIA A FUNÇÃO DE CRIAÇÃO DE USUÁRIO
-- Atualização v6.0: Inclui provider_id em auth.identities (obrigatório em versões recentes)
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_full_name TEXT,
    new_phone TEXT,
    new_organization TEXT,
    new_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Verifica duplicidade de forma limpa
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
      RAISE EXCEPTION 'Este email já está cadastrado no sistema.';
  END IF;

  -- Gera hash da senha usando pgcrypto
  v_encrypted_pw := crypt(new_password, gen_salt('bf'));
  v_user_id := gen_random_uuid();

  -- Insere na tabela de autenticação
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, 
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 
    'authenticated', 
    'authenticated', 
    new_email, 
    v_encrypted_pw, 
    now(), 
    '{"provider":"email","providers":["email"]}'::jsonb, 
    jsonb_build_object('full_name', new_full_name, 'phone', new_phone, 'organization', new_organization),
    now(), 
    now(), 
    '', '', '', ''
  );

  -- Insere na tabela de identidades (CORREÇÃO v6: provider_id adicionado)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 
    v_user_id, 
    format('{"sub":"%s","email":"%s"}', v_user_id::text, new_email)::jsonb, 
    'email', 
    new_email, -- provider_id é obrigatório e geralmente é o email para provider email
    now(), now(), now()
  );

  -- Insere ou Atualiza o Profile
  INSERT INTO public.profiles (id, email, role, full_name, phone, organization)
  VALUES (v_user_id, new_email, new_role, new_full_name, new_phone, new_organization)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    organization = EXCLUDED.organization;

  RETURN v_user_id;
END;
$$;

-- 5. CONCEDE PERMISSÕES
-- Garante uso do schema extensions (onde está pgcrypto)
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text) TO service_role;

GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
`;

const generateManualDeleteSql = (userId: string, email: string) => `-- SCRIPT DE EXCLUSÃO MANUAL PARA: ${email}
-- Execute apenas se a exclusão automática falhar.

BEGIN;
  DELETE FROM public.textos_padroes WHERE user_id::text = '${userId}';
  DELETE FROM public.juizes WHERE user_id::text = '${userId}';
  DELETE FROM public.peritos WHERE user_id::text = '${userId}';
  DELETE FROM public.profiles WHERE id = '${userId}';
  DELETE FROM auth.identities WHERE user_id = '${userId}';
  DELETE FROM auth.users WHERE id = '${userId}';
COMMIT;`;

// Helper robusto para extrair mensagem de erro e evitar [object Object]
const extractSafeErrorMessage = (err: any): string => {
    if (!err) return "Erro desconhecido.";
    
    // Se já for string, retorna
    if (typeof err === 'string') return err;
    
    // Se for instância de Error
    if (err instanceof Error) return err.message;
    
    // Se for objeto, tenta extrair campos conhecidos ou converter para JSON
    if (typeof err === 'object') {
        const possibleMessage = err.message || err.error_description || err.msg || err.description;
        if (possibleMessage && typeof possibleMessage === 'string') {
            let msg = possibleMessage;
            if (err.details) msg += ` (${String(err.details)})`;
            if (err.hint) msg += ` - Dica: ${String(err.hint)}`;
            return msg;
        }
        
        // Último recurso: JSON Stringify
        try {
            const json = JSON.stringify(err);
            if (json !== '{}' && json !== '[]') return `Erro Técnico: ${json}`;
        } catch { }
    }

    return "Erro não identificado (Verifique o console do navegador).";
};

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, users, onDataChange }) => {
    const [actionStates, setActionStates] = useState<Record<string, { loading: boolean, error: string | null }>>({});
    const [confirmingDelete, setConfirmingDelete] = useState<Record<string, boolean>>({}); 
    const [message, setMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
    
    const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', phone: '', organization: '', role: 'user' });
    const [addUserState, setAddUserState] = useState<{ loading: boolean, error: string | null }>({ loading: false, error: null });
    const [showSqlHelp, setShowSqlHelp] = useState(false);
    const [manualDeleteData, setManualDeleteData] = useState<{ sql: string, email: string } | null>(null);

    React.useEffect(() => {
        if (isOpen) {
             getSupabase().auth.getSession().then(({ data: { session } }) => {
                setCurrentUserId(session?.user.id);
            });
            setMessage('');
            setActionStates({});
            setConfirmingDelete({});
            setNewUser({ email: '', password: '', fullName: '', phone: '', organization: '', role: 'user' });
            setAddUserState({ loading: false, error: null });
            setShowSqlHelp(false);
            setManualDeleteData(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const handleRoleChange = async (userId: string, newRole: string) => {
        setActionStates(prev => ({ ...prev, [userId]: { loading: true, error: null } }));
        setMessage('');
        try {
            await updateUserRole(userId, newRole);
            setMessage('Função do usuário atualizada com sucesso.');
            setActionStates(prev => ({ ...prev, [userId]: { loading: false, error: null } }));
            onDataChange();
        } catch (err: any) {
            const errorMessage = extractSafeErrorMessage(err);
            setActionStates(prev => ({ ...prev, [userId]: { loading: false, error: errorMessage } }));
        }
    };
    
    const handleNewUserChange = (field: string, value: string) => {
        setNewUser(prev => ({ ...prev, [field]: value }));
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddUserState({ loading: true, error: null });
        setMessage('');
        try {
            await adminCreateUser({
                email: newUser.email,
                password: newUser.password,
                full_name: newUser.fullName,
                phone: newUser.phone,
                organization: newUser.organization,
                role: newUser.role,
            });
            setMessage('Novo usuário criado com sucesso!');
            setNewUser({ email: '', password: '', fullName: '', phone: '', organization: '', role: 'user' });
            setAddUserState({ loading: false, error: null });
            onDataChange();
        } catch (err: any) {
            console.error("Erro cru ao criar usuário:", err); // Log for debugging
            const errorMessage = extractSafeErrorMessage(err);
            
            // Sugere o script se o erro parecer ser de DB/Função
            if (
                errorMessage.toLowerCase().includes("function not found") || 
                errorMessage.toLowerCase().includes("permission denied") ||
                errorMessage.toLowerCase().includes("crypt") ||
                errorMessage.toLowerCase().includes("gen_salt") ||
                errorMessage.toLowerCase().includes("provider_id")
            ) {
                setShowSqlHelp(true);
            }

            setAddUserState({ loading: false, error: errorMessage });
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (confirmingDelete[userId]) {
             executeDelete(userId);
        } else {
            setConfirmingDelete(prev => ({ ...prev, [userId]: true }));
            setTimeout(() => {
                 setConfirmingDelete(prev => {
                     if (prev[userId]) {
                         return { ...prev, [userId]: false };
                     }
                     return prev;
                 });
            }, 5000);
        }
    };

    const executeDelete = async (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        const userEmail = userToDelete?.email || 'desconhecido';

        console.log(`Iniciando exclusão para: ${userEmail} (${userId})`);

        setActionStates(prev => ({ ...prev, [userId]: { loading: true, error: null } }));
        setMessage('');
        
        try {
            await deleteUser(userId);
            console.log(`Sucesso ao excluir: ${userId}`);
            
            setMessage(`Usuário ${userEmail} excluído com sucesso.`);
            setActionStates(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
            setConfirmingDelete(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
            onDataChange();
        } catch (err: any) {
            console.error("ERRO cru ao excluir:", err);
            const errorMessage = extractSafeErrorMessage(err);
            
            const sql = generateManualDeleteSql(userId, userEmail);
            setManualDeleteData({ sql, email: userEmail });
            setActionStates(prev => ({ ...prev, [userId]: { loading: false, error: errorMessage } }));
        }
    };

    // Modal de Fallback Manual
    if (manualDeleteData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4" onClick={e => e.stopPropagation()}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-6 border-2 border-red-500">
                    <div className="flex items-center mb-4 text-red-600">
                        <span className="text-3xl mr-3">⚠️</span>
                        <h2 className="text-xl font-bold">Exclusão Falhou</h2>
                    </div>
                    <p className="text-gray-700 mb-4">
                        Ocorreu um erro ao tentar excluir o usuário automaticamente.
                        <br/><br/>
                        <strong>Erro:</strong> <span className="font-mono text-xs bg-gray-100 p-1 rounded break-all block mt-1 border border-gray-300">{actionStates[users.find(u => u.email === manualDeleteData.email)?.id || '']?.error || 'Erro desconhecido'}</span>
                        <br/>
                        <strong>SOLUÇÃO:</strong> Feche esta janela, clique em <strong>"🛠️ Configuração / Reparar Banco"</strong> e execute o <strong>Script v6.0</strong> no Supabase (SQL Editor). Ele corrige permissões e tabelas de identidade.
                    </p>
                    <div className="mt-4 p-4 bg-gray-100 rounded border">
                         <p className="text-sm font-bold text-gray-600 mb-2">Script de Remoção Manual (Emergência):</p>
                         <div className="relative">
                             <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap max-h-40">
                                {manualDeleteData.sql}
                            </pre>
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(manualDeleteData.sql);
                                    alert('SQL copiado!');
                                }}
                                className="absolute top-2 right-2 bg-white text-gray-800 text-xs px-3 py-1.5 rounded hover:bg-gray-200 font-bold shadow-sm"
                            >
                                COPIAR
                            </button>
                         </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            onClick={() => {
                                setManualDeleteData(null);
                                setActionStates({});
                            }} 
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center space-x-4">
                         <h2 className="text-xl font-bold text-gray-800">Gerenciar Usuários</h2>
                    </div>
                     <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setShowSqlHelp(!showSqlHelp)}
                            className="flex items-center space-x-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded hover:bg-orange-200 border border-orange-200 transition-colors text-sm font-semibold animate-pulse shadow-sm"
                        >
                            <span>🛠️ Configuração / Reparar Banco</span>
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold text-2xl px-2">&times;</button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    
                    {/* Área de Script de Reparo (Toggle) */}
                    {showSqlHelp && (
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm mb-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-orange-800">🔧 Habilitar/Corrigir Funções (v6.0)</h3>
                                    <p className="text-sm text-orange-900 mt-1">
                                        Para corrigir erros de criação (falta de provider_id) e exclusão de usuários, copie o código abaixo e execute no <strong>SQL Editor</strong> do Supabase.
                                    </p>
                                </div>
                                <button onClick={() => setShowSqlHelp(false)} className="text-orange-800 hover:text-orange-900 font-bold">✕</button>
                            </div>
                            <div className="relative mt-2">
                                <pre className="bg-gray-800 text-gray-100 p-4 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap max-h-60 border border-gray-600 selection:bg-blue-500 selection:text-white">
                                    {REQUIRED_SQL_SCRIPT}
                                </pre>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(REQUIRED_SQL_SCRIPT);
                                        alert('Script copiado! Agora vá ao Supabase > SQL Editor e execute.');
                                    }}
                                    className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-4 py-2 rounded hover:bg-blue-700 font-bold shadow-md transform transition hover:scale-105"
                                >
                                    COPIAR SCRIPT v6.0
                                </button>
                            </div>
                        </div>
                    )}

                     <div className="border rounded-lg p-4 bg-white shadow-sm">
                        <h3 className="font-semibold mb-4 text-lg text-gray-700 border-b pb-2">Adicionar Novo Usuário</h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Nome Completo" value={newUser.fullName} onChange={e => handleNewUserChange('fullName', e.target.value)} required className="p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none" />
                                <input type="email" placeholder="E-mail" value={newUser.email} onChange={e => handleNewUserChange('email', e.target.value)} required className="p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none" />
                                <input type="text" placeholder="Telefone" value={newUser.phone} onChange={e => handleNewUserChange('phone', e.target.value)} className="p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none" />
                                <input type="text" placeholder="Órgão/Empresa" value={newUser.organization} onChange={e => handleNewUserChange('organization', e.target.value)} className="p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none" />
                                <input type="password" placeholder="Senha (mínimo 6 caracteres)" value={newUser.password} onChange={e => handleNewUserChange('password', e.target.value)} required className="p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none" />
                                <select value={newUser.role} onChange={e => handleNewUserChange('role', e.target.value)} className="p-2 border rounded-md bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                                    <option value="user">User (Usuário Comum)</option>
                                    <option value="admin">Admin (Administrador)</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={addUserState.loading}
                                className="w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium shadow-sm"
                            >
                                {addUserState.loading ? 'Criando...' : '+ Criar Usuário'}
                            </button>
                        </form>
                        {addUserState.error && (
                            <div className="mt-3 p-3 bg-red-50 rounded border border-red-200 flex justify-between items-center animate-pulse">
                                <p className="text-sm text-red-700 font-medium break-all">{addUserState.error}</p>
                                <button onClick={() => setShowSqlHelp(true)} className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded hover:bg-red-300 font-bold whitespace-nowrap ml-2">Corrigir Banco</button>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        {message && <p className="text-sm text-green-700 bg-green-100 p-3 rounded-md mb-4 border border-green-200 font-medium shadow-sm">{message}</p>}
                        <h3 className="font-semibold mb-3 text-lg text-gray-700">Usuários Cadastrados ({users.length})</h3>
                        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                            <ul className="divide-y divide-gray-200">
                                {users.map(user => (
                                    <li key={user.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex-grow mb-3 md:mb-0">
                                            <div className="flex items-center">
                                                <p className="font-bold text-gray-800 text-lg">{user.full_name || 'Nome não informado'}</p>
                                                {user.id === currentUserId && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Você</span>}
                                                {user.role === 'admin' && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">Admin</span>}
                                            </div>
                                            <p className="text-sm text-gray-600 font-medium">{user.email}</p>
                                            <div className="flex text-xs text-gray-500 mt-1 space-x-2">
                                                <span>🏢 {user.organization || 'Sem órgão'}</span>
                                                {user.phone && <span>📞 {user.phone}</span>}
                                            </div>
                                            {actionStates[user.id]?.error && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex justify-between items-center">
                                                    <span className="break-all"><strong>Erro:</strong> {actionStates[user.id].error}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-3 self-end md:self-center w-full md:w-auto mt-2 md:mt-0">
                                            <select 
                                                value={user.role}
                                                onChange={e => handleRoleChange(user.id, e.target.value)}
                                                disabled={user.id === currentUserId || actionStates[user.id]?.loading}
                                                className="p-2 border rounded-md text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-brand-500 outline-none"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                             <button
                                                onClick={(e) => handleDeleteClick(e, user.id)}
                                                disabled={user.id === currentUserId || (actionStates[user.id] && actionStates[user.id].loading)}
                                                className={`px-4 py-2 text-sm border rounded-md transition-all font-medium shadow-sm 
                                                    ${confirmingDelete[user.id] 
                                                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 animate-pulse' 
                                                        : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                                                    } 
                                                    disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
                                            >
                                                {actionStates[user.id]?.loading 
                                                    ? 'Removendo...' 
                                                    : confirmingDelete[user.id] ? 'Confirmar?' : 'Excluir'}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t text-right rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
