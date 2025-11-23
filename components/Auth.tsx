
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

    const inputClasses = "w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none text-gray-700";
    const labelClasses = "text-sm font-semibold text-gray-700 mb-1 block";
    const buttonClasses = "w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed";

    const renderSignIn = () => (
        <form className="space-y-5" onSubmit={handleLogin}>
            <div>
                <label htmlFor="email" className={labelClasses}>E-mail Institucional ou Pessoal</label>
                <input id="email" className={inputClasses} type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="text-sm font-semibold text-gray-700">Senha</label>
                    <button type="button" onClick={() => {setAuthView('forgotPassword'); setMessage(''); setError('');}} className="text-xs text-brand-600 hover:text-brand-800 font-medium">Esqueceu a senha?</button>
                </div>
                <input id="password" className={inputClasses} type="password" value={password} required onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="pt-2">
                <button type="submit" className={buttonClasses} disabled={loading}>
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Entrando...
                        </span>
                    ) : 'Acessar Sistema'}
                </button>
            </div>
        </form>
    );

    const renderSignUp = () => (
         <form className="space-y-4" onSubmit={handleSignUp}>
            <div>
                <label htmlFor="fullName" className={labelClasses}>Nome Completo</label>
                <input id="fullName" className={inputClasses} type="text" value={fullName} required onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João da Silva" />
            </div>
            <div>
                <label htmlFor="email" className={labelClasses}>E-mail</label>
                <input id="email" className={inputClasses} type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="phone" className={labelClasses}>Telefone</label>
                    <input id="phone" className={inputClasses} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" />
                </div>
                <div>
                    <label htmlFor="organization" className={labelClasses}>Vara/Órgão</label>
                    <input id="organization" className={inputClasses} type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Ex: 1ª VT de Maceió" />
                </div>
            </div>
            <div>
                <label htmlFor="password" className={labelClasses}>Senha</label>
                <input id="password" className={inputClasses} type="password" value={password} required onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <p className="text-xs text-gray-400 mt-1">Sua senha deve conter letras e números para maior segurança.</p>
            </div>
            <div className="pt-2">
                <button type="submit" className={buttonClasses} disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar Conta'}
                </button>
            </div>
        </form>
    );

    const renderForgotPassword = () => (
        <form className="space-y-5" onSubmit={handleForgotPassword}>
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                Digite seu e-mail abaixo e enviaremos um link seguro para você redefinir sua senha.
            </div>
            <div>
                <label htmlFor="email" className={labelClasses}>E-mail Cadastrado</label>
                <input id="email" className={inputClasses} type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="pt-2">
                <button type="submit" className={buttonClasses} disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
            </div>
            <div className="text-center mt-4">
                 <button type="button" onClick={() => {setAuthView('signIn'); setMessage(''); setError('');}} className="text-brand-600 hover:text-brand-800 font-medium text-sm">
                    Voltar para o Login
                 </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Lado Esquerdo - Imagem e Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ 
                        // Imagem focada em digitação em notebook, ambiente profissional
                        backgroundImage: "url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1920&auto=format&fit=crop')",
                        opacity: 0.6 
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 to-brand-800/80 mix-blend-multiply" />
                
                <div className="relative z-10 w-full h-full flex flex-col justify-center px-16 text-white">
                    <div className="mb-8">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/20">
                            <span className="text-3xl">⚖️</span>
                        </div>
                        <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                            Gerador de Atas <br/>Trabalhistas
                        </h1>
                        <p className="text-lg text-brand-100 max-w-md leading-relaxed">
                            Agilidade e padronização para suas audiências. 
                            Utilize inteligência artificial e templates inteligentes para focar no que realmente importa.
                        </p>
                    </div>
                    
                    <div className="mt-12 space-y-4">
                        <div className="flex items-center space-x-3 text-sm font-medium text-brand-100">
                            <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</span>
                            <span>Exportação direta para Word (.docx)</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm font-medium text-brand-100">
                             <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</span>
                            <span>Digitação por Voz integrada</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm font-medium text-brand-100">
                             <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</span>
                            <span>Formatado para o PJe</span>
                        </div>
                    </div>

                    <div className="absolute bottom-8 left-16 text-xs text-brand-200/60">
                         © Johnny Santos. Todos os direitos reservados.
                    </div>
                </div>
            </div>

            {/* Lado Direito - Formulário */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
                <div className="w-full max-w-md space-y-8 animate-fade-in-up">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden inline-block p-3 rounded-full bg-brand-50 mb-4">
                            <span className="text-4xl">⚖️</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            {authView === 'signIn' && 'Bem-vindo de volta'}
                            {authView === 'signUp' && 'Crie sua conta'}
                            {authView === 'forgotPassword' && 'Recuperar Acesso'}
                        </h2>
                        <p className="mt-2 text-gray-600">
                            {authView === 'signIn' && 'Por favor, insira suas credenciais para acessar.'}
                            {authView === 'signUp' && 'Preencha os dados abaixo para começar.'}
                            {authView === 'forgotPassword' && 'Não se preocupe, vamos ajudar você.'}
                        </p>
                    </div>
                    
                    {message && <div className="p-4 rounded-lg text-sm bg-green-50 text-green-800 border border-green-200 flex items-center"><span className="mr-2">✅</span> {message}</div>}
                    {error && <div className="p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-center"><span className="mr-2">⚠️</span> {error}</div>}

                    <div className="bg-white">
                        {authView === 'signIn' && renderSignIn()}
                        {authView === 'signUp' && renderSignUp()}
                        {authView === 'forgotPassword' && renderForgotPassword()}
                    </div>

                    {authView !== 'forgotPassword' && (
                        <div className="text-center pt-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">
                                        {authView === 'signIn' ? 'Novo por aqui?' : 'Já possui conta?'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button 
                                    onClick={() => {
                                        setAuthView(authView === 'signIn' ? 'signUp' : 'signIn'); 
                                        setMessage(''); 
                                        setError('');
                                    }} 
                                    className="font-bold text-brand-600 hover:text-brand-800 transition-colors"
                                >
                                    {authView === 'signIn' ? 'Criar uma conta gratuita' : 'Fazer Login'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-12 text-center">
                         <p className="text-xs text-gray-400">
                            Criado por Johnny Santos - Email johnny.santos@trt19.jus.br
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
