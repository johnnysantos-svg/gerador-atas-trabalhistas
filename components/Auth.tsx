import React, { useState } from 'react';
import { getSupabase } from '../supabaseClient';

const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [organization, setOrganization] = useState('');
    const [authView, setAuthView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const supabase = getSupabase();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };
    
    const handleSignUp = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const supabase = getSupabase();
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone,
                    organization: organization,
                }
            }
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Cadastro realizado! Por favor, verifique seu e-mail para confirmar sua conta.');
            setAuthView('signIn'); // Switch back to sign-in view
        }
        setLoading(false);
    };

    const handleForgotPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const supabase = getSupabase();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Se existir uma conta com este e-mail, um link para redefinir a senha foi enviado.');
        }
        setLoading(false);
    };

    const renderSignIn = () => (
        <form className="space-y-6" onSubmit={handleLogin}>
            <div>
                <label htmlFor="email" className="text-sm font-bold text-gray-600 block">E-mail</label>
                <input id="email" className="w-full p-2 mt-1 border rounded-md" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
                <label htmlFor="password"className="text-sm font-bold text-gray-600 block">Senha</label>
                <input id="password" className="w-full p-2 mt-1 border rounded-md" type="password" value={password} required onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
                <button type="submit" className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-md font-semibold" disabled={loading}>
                    {loading ? 'Carregando...' : 'Entrar'}
                </button>
            </div>
        </form>
    );

    const renderSignUp = () => (
         <form className="space-y-4" onSubmit={handleSignUp}>
            <div>
                <label htmlFor="fullName" className="text-sm font-bold text-gray-600 block">Nome Completo</label>
                <input id="fullName" className="w-full p-2 mt-1 border rounded-md" type="text" value={fullName} required onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div>
                <label htmlFor="email" className="text-sm font-bold text-gray-600 block">E-mail</label>
                <input id="email" className="w-full p-2 mt-1 border rounded-md" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="phone" className="text-sm font-bold text-gray-600 block">Telefone</label>
                    <input id="phone" className="w-full p-2 mt-1 border rounded-md" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" />
                </div>
                <div>
                    <label htmlFor="organization" className="text-sm font-bold text-gray-600 block">Órgão/Empresa</label>
                    <input id="organization" className="w-full p-2 mt-1 border rounded-md" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Onde você trabalha" />
                </div>
            </div>
            <div>
                <label htmlFor="password"className="text-sm font-bold text-gray-600 block">Senha</label>
                <input id="password" className="w-full p-2 mt-1 border rounded-md" type="password" value={password} required onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
                <button type="submit" className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-md font-semibold" disabled={loading}>
                    {loading ? 'Criando conta...' : 'Cadastrar'}
                </button>
            </div>
        </form>
    );

    const renderForgotPassword = () => (
        <form className="space-y-6" onSubmit={handleForgotPassword}>
            <div>
                <label htmlFor="email" className="text-sm font-bold text-gray-600 block">E-mail</label>
                <input id="email" className="w-full p-2 mt-1 border rounded-md" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
                <button type="submit" className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-md font-semibold" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
            </div>
        </form>
    );


    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div>
                    <h1 className="text-3xl font-bold text-center text-brand-800">Gerador de Atas</h1>
                    <p className="text-center text-gray-600">
                        {authView === 'signIn' && 'Acesse sua conta para continuar'}
                        {authView === 'signUp' && 'Crie uma nova conta'}
                        {authView === 'forgotPassword' && 'Recupere sua senha'}
                    </p>
                </div>
                
                {message && <div className="p-3 text-center text-green-800 bg-green-100 rounded-md">{message}</div>}
                {error && <div className="p-3 text-center text-red-800 bg-red-100 rounded-md">{error}</div>}

                {authView === 'signIn' && renderSignIn()}
                {authView === 'signUp' && renderSignUp()}
                {authView === 'forgotPassword' && renderForgotPassword()}

                <div className="text-sm text-center">
                    {authView === 'signIn' && (
                         <p className="text-gray-600">
                           Não tem uma conta?{' '}
                           <button onClick={() => {setAuthView('signUp'); setMessage(''); setError('');}} className="font-bold text-brand-600 hover:underline">Cadastre-se</button>
                         </p>
                    )}
                     {authView === 'signUp' && (
                         <p className="text-gray-600">
                           Já tem uma conta?{' '}
                           <button onClick={() => {setAuthView('signIn'); setMessage(''); setError('');}} className="font-bold text-brand-600 hover:underline">Entre</button>
                         </p>
                    )}
                     <p className="mt-2">
                        <button onClick={() => {setAuthView(authView === 'forgotPassword' ? 'signIn' : 'forgotPassword'); setMessage(''); setError('');}} className="text-gray-600 hover:underline">
                             {authView === 'forgotPassword' ? 'Voltar para o Login' : 'Esqueceu a senha?'}
                        </button>
                     </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;