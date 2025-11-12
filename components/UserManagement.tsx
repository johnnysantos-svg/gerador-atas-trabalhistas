import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as api from '../api';

interface UserManagementProps {
    onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', nome: '', isAdmin: false });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const usersData = await api.getAllUsers();
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const result = await api.createUser(
                newUser.email,
                newUser.password,
                newUser.nome,
                newUser.isAdmin
            );

            if (result.error) {
                setError(result.error);
            } else {
                setSuccess('Usuário criado com sucesso!');
                setNewUser({ email: '', password: '', nome: '', isAdmin: false });
                await loadUsers();
            }
        } catch (error: any) {
            setError(error.message || 'Erro ao criar usuário');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }

        try {
            await api.deleteUser(userId);
            setSuccess('Usuário excluído com sucesso!');
            await loadUsers();
        } catch (error: any) {
            setError(error.message || 'Erro ao excluir usuário');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                {/* Formulário de criação */}
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold mb-4">Criar Novo Usuário</h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={newUser.nome}
                                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                                    required
                                    className="w-full p-2 border rounded-md"
                                    placeholder="Nome completo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                    className="w-full p-2 border rounded-md"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                    minLength={6}
                                    className="w-full p-2 border rounded-md"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isAdmin"
                                    checked={newUser.isAdmin}
                                    onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                                    className="h-4 w-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                />
                                <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-900">
                                    Administrador
                                </label>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                        </button>
                    </form>
                </div>

                {/* Lista de usuários */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Usuários Cadastrados</h3>
                    {loading ? (
                        <p className="text-center text-gray-500">Carregando...</p>
                    ) : users.length === 0 ? (
                        <p className="text-center text-gray-500">Nenhum usuário cadastrado.</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between bg-gray-100 p-3 rounded"
                                >
                                    <div>
                                        <p className="font-semibold">{user.nome}</p>
                                        <p className="text-sm text-gray-600">{user.email}</p>
                                        {user.is_admin && (
                                            <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                Administrador
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;




