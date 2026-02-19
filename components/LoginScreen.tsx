import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { AlertCircle, Loader2, WifiOff, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onOfflineLogin: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOfflineLogin }) => {
  const [error, setError] = useState('');
  const [detailedError, setDetailedError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setDetailedError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email?.endsWith('@littlemaker.com.br')) {
        await signOut(auth);
        setError('Acesso restrito. Utilize um e-mail @littlemaker.com.br');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn("Authentication result:", err);
      
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio de teste não autorizado.');
        setDetailedError(
            `O ambiente de preview atual (${window.location.host}) não permite popups de autenticação.\n\n` +
            `Utilize o "Modo Visitante" abaixo para testar o sistema.`
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado.');
      } else if (err.code === 'auth/popup-blocked') {
         setError('Popup bloqueado. Permita popups ou use o Modo Visitante.');
      } else {
        setError('Falha no login.');
        setDetailedError(err.message || JSON.stringify(err));
      }
      
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      let emailToUse = guestEmail.trim();
      
      // Auto-append domain if missing (Convenience for testing)
      if (!emailToUse.includes('@')) {
          emailToUse = `${emailToUse}@littlemaker.com.br`;
      }

      if (!emailToUse.endsWith('@littlemaker.com.br')) {
          setError('E-mail inválido.');
          setDetailedError('Para usar o modo visitante, utilize um e-mail corporativo @littlemaker.com.br');
          return;
      }
      
      onOfflineLogin(emailToUse);
  };

  const BrandLogo = ({ className = "" }: { className?: string }) => (
    <div className={`relative overflow-hidden ${className}`}>
        <img 
            src="https://littlemaker.com.br/logo_lm-2/"
            alt="Little Maker"
            className="w-full h-full object-contain object-center"
        />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-[#71477A] p-8 pb-12 text-center relative">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="flex justify-center mb-6">
            {/* Logo reduced to h-12 */}
            <BrandLogo className="h-12 w-36" />
          </div>
          <h2 className="text-xl font-bold text-white">Sistema de Propostas</h2>
          <p className="text-purple-200 text-sm mt-2">Acesso Restrito</p>
        </div>

        <div className="px-8 pb-8 pt-4 space-y-6 -mt-6 bg-white rounded-t-3xl relative z-10">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 mt-4">
              <div className="flex items-center gap-2 font-bold mb-2">
                 <AlertCircle className="w-4 h-4" />
                 {error}
              </div>
              {detailedError && (
                  <div className="text-slate-700 text-xs mt-1 bg-white p-3 rounded border border-red-100 select-all whitespace-pre-line break-words">
                      {detailedError}
                  </div>
              )}
            </div>
          )}

          {!showGuestForm ? (
              <>
                 <div className="text-center text-slate-600 text-sm py-4">
                    Faça login com sua conta corporativa.
                 </div>

                 <div className="space-y-3">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white text-slate-700 border border-slate-300 py-3 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                        {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        )}
                        Entrar com Google
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase">Ou</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <button
                        onClick={() => setShowGuestForm(true)}
                        className="w-full bg-[#f8f9fa] text-slate-600 border border-dashed border-slate-400 py-3 rounded-lg font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <WifiOff className="w-4 h-4" />
                        Modo Visitante (Offline)
                    </button>
                 </div>
              </>
          ) : (
              <form onSubmit={handleGuestSubmit} className="space-y-4 pt-2">
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs">
                      Simulação: Digite apenas seu usuário (ex: diego.thuler). O domínio será adicionado automaticamente.
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail ou Usuário</label>
                    <input 
                        type="text" 
                        required
                        placeholder="usuario ou usuario@littlemaker.com.br"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#71477A] outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowGuestForm(false)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium"
                      >
                          Voltar
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 px-4 py-2 bg-[#71477A] text-white rounded-lg hover:bg-[#5d3a64] font-medium text-sm flex items-center justify-center gap-2"
                      >
                          Entrar
                          <ArrowRight className="w-4 h-4" />
                      </button>
                  </div>
              </form>
          )}

        </div>
      </div>
    </div>
  );
};