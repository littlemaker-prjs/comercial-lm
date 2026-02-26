
import React, { useState, useEffect } from 'react';
import { StartScreen } from './components/StartScreen';
import { WorkshopPanel } from './components/WorkshopPanel';
import { ProposalView } from './components/ProposalView';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { AppState } from './types';
import { INITIAL_APP_STATE, SUPER_ADMINS } from './constants';
import { LayoutDashboard, FileText, User, ArrowLeft, Loader2, Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import { auth, db } from './firebase';
import firebase from 'firebase/compat/app';
import { useSettings } from './contexts/SettingsContext';

enum Step {
  START = 'start',
  WORKSHOPS = 'workshops',
  PROPOSAL = 'proposal',
}

function App() {
  const { settings } = useSettings(); // Use Global Settings
  const [firebaseUser, setFirebaseUser] = useState<firebase.User | null>(null);
  const [offlineUser, setOfflineUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
      return sessionStorage.getItem('googleAccessToken');
  });
  
  // Master Role State
  const [isMaster, setIsMaster] = useState(false);

  const activeUser = firebaseUser || offlineUser;
  const isOffline = !!offlineUser && !firebaseUser;

  const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
  const [currentStep, setCurrentStep] = useState<Step>(Step.START);
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setFirebaseUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync User Role and Existence in Firestore
  useEffect(() => {
    const checkAndSyncUser = async () => {
        if (activeUser?.email) {
            const emailLower = activeUser.email.toLowerCase();
            const isSuper = SUPER_ADMINS.includes(emailLower);
            
            if (isOffline) {
                setIsMaster(isSuper);
                return;
            }

            try {
                const userRef = db.collection('users').doc(emailLower);
                const doc = await userRef.get();
                
                let role = 'consultant';

                if (!doc.exists) {
                    await userRef.set({
                        email: emailLower,
                        role: 'consultant',
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    role = doc.data()?.role || 'consultant';
                }
                setIsMaster(isSuper || role === 'master');
            } catch (err) {
                console.error("Error syncing user profile:", err);
                setIsMaster(isSuper);
            }
        } else {
            setIsMaster(false);
        }
    };

    checkAndSyncUser();
  }, [activeUser, isOffline]);

  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 3500);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const handleLogout = () => {
    if (firebaseUser) auth.signOut();
    setFirebaseUser(null);
    setOfflineUser(null);
    setViewMode('dashboard');
    setIsMaster(false);
  };

  const handleOfflineLogin = (email: string) => {
      setOfflineUser({
          uid: 'guest-' + email.replace(/[^a-zA-Z0-9]/g, ''),
          displayName: email.split('@')[0],
          email: email
      });
  };

  const startNewProposal = () => {
    setAppState(INITIAL_APP_STATE);
    setCurrentProposalId(null);
    setCurrentStep(Step.START);
    setViewMode('editor');
  };

  const loadProposal = (id: string | null, data: AppState) => {
    setAppState(data);
    setCurrentProposalId(id);
    setCurrentStep(id ? Step.PROPOSAL : Step.START);
    setViewMode('editor');
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
      setNotification({ message, type });
  };

  const handleSaveProposal = async (redirect: boolean = true) => {
    if (!activeUser) {
        showNotification('Usuário não autenticado.', 'error');
        return;
    }
    
    setIsSaving(true);
    
    try {
        const cleanData = JSON.parse(JSON.stringify(appState));

        const payload = {
            userId: activeUser.uid,
            userEmail: activeUser.email,
            updatedAt: isOffline ? { seconds: Math.floor(Date.now() / 1000) } : firebase.firestore.FieldValue.serverTimestamp(),
            data: cleanData,
            schoolName: appState.client.schoolName || 'Sem nome'
        };

        if (isOffline) {
            const existing = localStorage.getItem('offline_proposals');
            let proposals = existing ? JSON.parse(existing) : [];
            let localId = currentProposalId || `local_${Date.now()}`;
            
            proposals = proposals.filter((p: any) => p.id !== localId);
            proposals.push({ id: localId, ...payload });
            localStorage.setItem('offline_proposals', JSON.stringify(proposals));
            
            setCurrentProposalId(localId);
            showNotification('Salvo localmente!', 'success');
        } else {
            if (currentProposalId && !currentProposalId.startsWith('local_')) {
                await db.collection('proposals').doc(currentProposalId).set(payload, { merge: true });
                showNotification('Proposta atualizada no Firebase!', 'success');
            } else {
                const docRef = await db.collection('proposals').add(payload);
                setCurrentProposalId(docRef.id);
                showNotification('Proposta criada no Firebase!', 'success');
            }
        }
        
        if (redirect) {
            setTimeout(() => {
               setViewMode('dashboard');
            }, 1500);
        }

    } catch (error: any) {
        console.error("Critical error while saving to Firebase:", error);
        let msg = 'Erro ao salvar. Tente novamente.';
        if (error.message?.includes('permissions') || error.code === 'permission-denied') {
            msg = 'Erro de permissão. Você não pode sobrescrever propostas de outros usuários.';
        } else if (error.message) {
            msg = `Erro: ${error.message}`;
        }
        showNotification(msg, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const backToDashboard = () => {
    setViewMode('dashboard');
  };

  const calculateRecommendedInfra = (students: number, segments: string[]): string[] => {
    const hasEI = segments.includes("Educação Infantil");
    const hasEFAI = segments.includes("Ens. Fundamental Anos Iniciais");
    const hasEFAF = segments.includes("Ens. Fundamental Anos Finais");
    const hasEM = segments.includes("Ensino Médio");
    const hasMaker = hasEFAI || hasEFAF || hasEM;
    let selection: string[] = [];

    if (hasEI) {
        if (!hasMaker) {
            if (students < 200) selection.push('infantil_carrinho', 'infantil_ferr_18');
            else {
                 selection.push('infantil_padrao_18', 'infantil_ferr_18');
                 if (students >= 400) selection.push('infantil_up_12'); 
            }
        } else {
            selection.push('infantil_carrinho', 'infantil_ferr_18');
        }
    }

    if (hasMaker) {
        if (students <= 120) selection.push('maker_minima', 'maker_ferr_red_18');
        else if (students <= 250) {
             selection.push('maker_minima');
             if (hasEFAF || hasEM) selection.push('maker_ferr_padrao');
             else selection.push('maker_ferr_red_18');
        }
        else if (students <= 600) selection.push('maker_padrao_24', 'maker_ferr_padrao');
        else {
             selection.push('maker_padrao_24', 'maker_up_6', 'maker_ferr_padrao', 'maker_ferr_digitais', 'maker_ferr_pc');
             if (students >= 800) selection.push('midia_padrao_24', 'midia_up_6', 'midia_ferr_padrao');
        }
    }
    return selection;
  };

  const handleStartNext = () => {
    if (!currentProposalId || appState.selectedInfraIds.length === 0) {
         const recommendedInfra = calculateRecommendedInfra(appState.commercial.totalStudents, appState.client.segments);
         setAppState(prev => ({ ...prev, selectedInfraIds: recommendedInfra }));
    }
    setCurrentStep(Step.WORKSHOPS);
  };

  const calculateSummary = () => {
      const totalStudents = appState.commercial.totalStudents;
      // USE SETTINGS CATALOG
      const selectedItems = settings.infraCatalog.filter(i => appState.selectedInfraIds.includes(i.id));
      
      const activeTypes: string[] = [];
      if (selectedItems.some(i => i.category === 'maker')) activeTypes.push("Maker");
      if (selectedItems.some(i => i.category === 'midia')) activeTypes.push("Mídia");
      if (selectedItems.some(i => i.category === 'infantil')) activeTypes.push("Infantil");

      return { totalStudents, activeTypes };
  };

  const summary = calculateSummary();

  const BrandLogo = ({ className = "" }: { className?: string }) => (
    <div className={`relative overflow-hidden ${className}`}>
        <img src="https://littlemaker.com.br/logo_lm-2/" alt="Little Maker" className="w-full h-full object-contain" />
    </div>
  );

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-[#71477A] animate-spin" /></div>;
  if (!activeUser) return <LoginScreen onOfflineLogin={handleOfflineLogin} onGoogleLoginSuccess={setGoogleAccessToken} />;
  
  if (viewMode === 'dashboard') {
      return (
        <Dashboard 
            onNewProposal={startNewProposal} 
            onLoadProposal={loadProposal} 
            onLogout={handleLogout} 
            user={activeUser} 
            isOffline={isOffline}
            isMaster={isMaster}
        />
      );
  }

  const isClientConfigured = appState.client.schoolName && appState.client.contactName && appState.client.state && appState.client.state !== '';
  const navItemClass = (step: Step, disabled: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium w-full ${
      currentStep === step ? 'bg-white text-[#71477A] shadow-sm' : disabled ? 'text-purple-300/50 cursor-not-allowed' : 'text-purple-100 hover:bg-white/10 hover:text-white'
    }`;
  
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
              <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-xl border ${notification.type === 'success' ? 'bg-[#8BBF56] border-[#7aa84b] text-white' : 'bg-red-600 border-red-500 text-white'}`}>
                  {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="font-medium text-sm">{notification.message}</span>
                  <button onClick={() => setNotification(null)} className="ml-2 opacity-70"><X className="w-4 h-4"/></button>
              </div>
          </div>
      )}

      <aside className="w-64 bg-[#71477A] flex flex-col shadow-lg z-20 shrink-0">
        <div className="p-6 border-b border-white/10"><BrandLogo className="h-12" /></div>
        <div className="px-4 pt-4"><button onClick={backToDashboard} className="flex items-center gap-2 text-purple-200 hover:text-white text-xs transition-colors mb-2 w-full"><ArrowLeft className="w-3 h-3" />Painel de Propostas</button></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => setCurrentStep(Step.START)} className={navItemClass(Step.START, false)}><User className="w-5 h-5" /><span className="truncate">{appState.client.schoolName || 'Escola'}</span></button>
          <button onClick={() => isClientConfigured && setCurrentStep(Step.WORKSHOPS)} disabled={!isClientConfigured} className={navItemClass(Step.WORKSHOPS, !isClientConfigured)}><LayoutDashboard className="w-5 h-5" /><span>Infraestrutura</span></button>
          <button onClick={() => isClientConfigured && setCurrentStep(Step.PROPOSAL)} disabled={!isClientConfigured} className={navItemClass(Step.PROPOSAL, !isClientConfigured)}><FileText className="w-5 h-5" /><span>Proposta</span></button>
        </nav>
        
        {/* Resumo da Proposta */}
        <div className="px-6 pb-2">
            <div className="bg-black/20 rounded-lg p-4 text-xs text-purple-100 space-y-3">
                <div className="font-bold text-white uppercase tracking-wider border-b border-white/10 pb-1 mb-2">Resumo</div>
                <div className="flex justify-between items-center">
                    <span>Alunos:</span>
                    <span className="font-bold text-white text-sm">{summary.totalStudents}</span>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                    <span className="text-purple-200">Infra:</span>
                    <span className="font-bold text-white text-sm leading-tight">
                        {summary.activeTypes.length > 0 ? summary.activeTypes.join(', ') : '-'}
                    </span>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <button onClick={() => handleSaveProposal(true)} disabled={isSaving} className="w-full bg-[#8BBF56] text-white py-2 rounded-lg font-bold hover:bg-[#7aa84b] transition-colors flex items-center justify-center gap-2 text-sm shadow-inner">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        {currentStep === Step.START && <StartScreen appState={appState} setAppState={setAppState} onNext={handleStartNext} />}
        {currentStep === Step.WORKSHOPS && <WorkshopPanel appState={appState} setAppState={setAppState} onNext={() => setCurrentStep(Step.PROPOSAL)} />}
        {currentStep === Step.PROPOSAL && <ProposalView appState={appState} setAppState={setAppState} onSave={handleSaveProposal} isSaving={isSaving} user={activeUser} isMaster={isMaster} googleAccessToken={googleAccessToken} />}
      </main>
    </div>
  );
}

export default App;
