import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { updateMyProfile, updateUserPassword } from '../api';

interface ProfileManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: Profile;
    onDataChange: () => void; // To refresh profile data in App.tsx
}

const ProfileManagementModal: React.FC<ProfileManagementModalProps> = ({ isOpen, onClose, userProfile, onDataChange }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'password'>('details');
    
    // State for profile details
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [organization, setOrganization] = useState('');
    
    // State for password change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // General state
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Populate form with current profile data
            setFullName(userProfile.full_name || '');
            setPhone(userProfile.phone || '');
            setOrganization(userProfile.organization || '');
            
            // Reset states
            setActiveTab('details');
            setNewPassword('');
            setConfirmPassword('');
            setMessage('');
            setError('');
            setLoading(false);
        }
    }, [isOpen, userProfile]);

    if (!isOpen) return null;

    const handleDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        try {
            await updateMyProfile({
                full_name: fullName,
                phone: phone,
                organization: organization,
            });
            setMessage('Seus dados foram atualizados com sucesso!');
            onDataChange(); // Refresh profile in parent component
        } catch (err: any) {
            setError(err.message || 'Falha ao atualizar os dados.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        setLoading(true);
        setMessage('');
        setError('');
        try {
            await updateUserPassword(newPassword);
            setMessage('Sua senha foi alterada com sucesso!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message || 'Falha ao alterar a senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Gerenciar Meu Perfil</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-2xl">&times;</button>
                </div>
                <div className="border-b">
                    <nav className="flex space-x-4 px-4">
                        <button onClick={() => setActiveTab('details')} className={`py-3 px-1 border-b-2 font-medium ${activeTab === 'details' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Meus Dados</button>
                        <button onClick={() => setActiveTab('password')} className={`py-3 px-1 border-b-2 font-medium ${activeTab === 'password' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Alterar Senha</button>
                    </nav>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {message && <div className="p-3 mb-4 text-center text-green-800 bg-green-100 rounded-md">{message}</div>}
                    {error && <div className="p-3 mb-4 text-center text-red-800 bg-red-100 rounded-md">{error}</div>}

                    {activeTab === 'details' && (
                        <form onSubmit={handleDetailsSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">E-mail (não pode ser alterado)</label>
                                <input type="email" value={userProfile.email} disabled className="mt-1 w-full p-2 border rounded-md bg-gray-100 cursor-not-allowed" />
                            </div>
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                                <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                                <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                             <div>
                                <label htmlFor="organization" className="block text-sm font-medium text-gray-700">Órgão/Empresa</label>
                                <input id="organization" type="text" value={organization} onChange={e => setOrganization(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                            <div className="pt-2 text-right">
                                 <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400">
                                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    )}
                    {activeTab === 'password' && (
                         <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                                <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" placeholder="Mínimo 6 caracteres"/>
                            </div>
                             <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                                <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                            </div>
                             <div className="pt-2 text-right">
                                 <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400">
                                    {loading ? 'Alterando...' : 'Alterar Senha'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default ProfileManagementModal;