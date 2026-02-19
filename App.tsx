import React, { useState, useEffect } from 'react';
import { StartScreen } from './components/StartScreen';
import { WorkshopPanel } from './components/WorkshopPanel';
import { InfrastructureView } from './components/InfrastructureView';
import { ProposalView } from './components/ProposalView';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { AppState } from './types';
import { INITIAL_APP_STATE, REGIONS } from './constants';
import { LayoutDashboard, FileText, User, ArrowLeft, Loader2, Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

enum Step {
  START = 'start',
  WORKSHOPS = 'workshops',
  INFRA = 'infra',
  PROPOSAL = 'proposal',
}

function App() {
  // Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [offlineUser, setOfflineUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Computed Active User
  const activeUser = firebaseUser || offlineUser;
  const isOffline = !!offlineUser && !firebaseUser;

  // App Mode
  const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
  
  // Editor State
  const [currentStep, setCurrentStep] = useState<Step>(Step.START);
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Clear notification after 3s
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  // --- ACTIONS ---

  const handleLogout = () => {
    if (firebaseUser) {
        signOut(auth);
    }
    setFirebaseUser(null);
    setOfflineUser(null);
    setViewMode('dashboard');
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
    
    // Logic: If ID exists, we are viewing an existing proposal (Go to End).
    // If ID is null, we are "Duplicating/Creating New" based on existing data, so go to Start to edit Name/Date.
    setCurrentStep(id ? Step.PROPOSAL : Step.START);
    
    setViewMode('editor');
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
      setNotification({ message, type });
  };

  const handleSaveProposal = async () => {
    if (!activeUser) return;
    setIsSaving(true);
    
    try {
        const payload = {
            userId: activeUser.uid,
            userEmail: activeUser.email, // Saving email for dashboard display
            updatedAt: isOffline ? { seconds: Math.floor(Date.now() / 1000) } : serverTimestamp(),
            data: appState,
            schoolName: appState.client.schoolName
        };

        if (isOffline) {
            // --- LOCAL STORAGE SAVING ---
            const existing = localStorage.getItem('offline_proposals');
            let proposals = existing ? JSON.parse(existing) : [];
            
            let localId = currentProposalId;

            if (currentProposalId) {
                // UPDATE EXISTING
                // Remove existing if updating to avoid duplicates (we push the updated one below)
                proposals = proposals.filter((p: any) => p.id !== currentProposalId);
            } else {
                // CREATE NEW
                localId = `local_${Date.now()}`;
            }
            
            // Push the new/updated record
            proposals.push({ id: localId, ...payload });
            
            localStorage.setItem('offline_proposals', JSON.stringify(proposals));
            
            setCurrentProposalId(localId); // Ensure state tracks the (new) ID
            showNotification('Proposta salva localmente (Offline)!', 'success');
        } else {
            // --- FIREBASE SAVING ---
            if (currentProposalId) {
                await setDoc(doc(db, 'proposals', currentProposalId), payload, { merge: true });
                showNotification('Proposta atualizada com sucesso!', 'success');
            } else {
                const docRef = await addDoc(collection(db, 'proposals'), payload);
                setCurrentProposalId(docRef.id);
                showNotification('Nova proposta salva com sucesso!', 'success');
            }
        }
    } catch (error) {
        console.error("Error saving:", error);
        showNotification('Erro ao salvar proposta.', 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const backToDashboard = () => {
    setViewMode('dashboard');
  };

  // --- LOGIC: Automatic Infrastructure Recommendation ---
  const calculateRecommendedInfra = (students: number, segments: string[]): string[] => {
    const hasEI = segments.includes("Educação Infantil");
    const hasEFAI = segments.includes("Ens. Fundamental Anos Iniciais");
    const hasEFAF = segments.includes("Ens. Fundamental Anos Finais");
    const hasEM = segments.includes("Ensino Médio");
    
    // "Has Maker" means any segment that uses the Maker/Midia catalog
    const hasMaker = hasEFAI || hasEFAF || hasEM;

    let selection: string[] = [];

    // 1. EDUCAÇÃO INFANTIL LOGIC
    if (hasEI) {
        if (!hasMaker) {
            // Case: School is ONLY Education Infantil
            if (students < 200) {
                 // Low count: Carrinho
                 selection.push('infantil_carrinho', 'infantil_ferr_18');
            } else {
                 // High count: Oficina Padrão
                 selection.push('infantil_padrao_18', 'infantil_ferr_18');
                 
                 // Aggressive upsell for empty cells/high count
                 if (students >= 400) {
                     selection.push('infantil_up_12'); 
                 }
            }
        } else {
            // Case: Mixed School (EI + Fundamental/Médio)
            // Table indicates "Carrinho" is standard for mixed schools regardless of size
            selection.push('infantil_carrinho', 'infantil_ferr_18');
        }
    }

    // 2. MAKER / MÍDIA LOGIC (Fundamental & Médio)
    if (hasMaker) {
        // TIER 1: Very Small (approx 50-100)
        if (students <= 120) {
             selection.push('maker_minima', 'maker_ferr_red_18');
        }
        // TIER 2: Small/Medium (approx 200)
        else if (students <= 250) {
             selection.push('maker_minima');
             
             // Logic refinement from table: 
             // If strictly EFAI (no older kids), keep Reduced tools.
             // If EFAF or EM present, upgrade to Standard tools.
             const hasOlderKids = hasEFAF || hasEM;
             
             if (hasOlderKids) {
                 selection.push('maker_ferr_padrao');
             } else {
                 selection.push('maker_ferr_red_18');
             }
        }
        // TIER 3: Medium/Large (approx 400)
        else if (students <= 600) {
             selection.push('maker_padrao_24', 'maker_ferr_padrao');
        }
        // TIER 4: Large/Huge (800 - 1000+)
        else {
             // "Oficina Padrão 30" = Padrão 24 + Upgrade 6
             selection.push('maker_padrao_24', 'maker_up_6');
             
             // "F. Padrão + F. Digitais + Comp"
             selection.push('maker_ferr_padrao', 'maker_ferr_digitais', 'maker_ferr_pc');

             // "Mídia" Logic for very large schools (> 800/1000)
             if (students >= 800) {
                 // "Oficina Padrão 30 + F Mídia" for Mídia
                 selection.push('midia_padrao_24', 'midia_up_6');
                 selection.push('midia_ferr_padrao');
             }
        }
    }

    return selection;
  };

  const handleStartNext = () => {
    if (!currentProposalId || appState.selectedInfraIds.length === 0) {
         const recommendedInfra = calculateRecommendedInfra(
            appState.commercial.totalStudents, 
            appState.client.segments
        );
        
        setAppState(prev => ({
            ...prev,
            selectedInfraIds: recommendedInfra
        }));
    }

    setCurrentStep(Step.WORKSHOPS);
  };

  const handleProposalNext = () => {
     setCurrentStep(Step.PROPOSAL);
  }

  // PNG Logo Component
  const BrandLogo = ({ className = "" }: { className?: string }) => (
    <div className={`relative overflow-hidden ${className}`}>
        <img 
            src="https://littlemaker.com.br/logo_lm-2/"
            alt="Little Maker"
            className="w-full h-full object-contain object-center"
        />
    </div>
  );

  // --- RENDER CONTENT HANDLER ---

  const renderEditorContent = () => {
    switch (currentStep) {
      case Step.START:
        return (
          <StartScreen
            appState={appState}
            setAppState={setAppState}
            onNext={handleStartNext}
          />
        );
      case Step.WORKSHOPS:
        return <WorkshopPanel appState={appState} setAppState={setAppState} onNext={handleProposalNext} />;
      case Step.INFRA:
        return <InfrastructureView appState={appState} />;
      case Step.PROPOSAL:
        return <ProposalView 
            appState={appState} 
            setAppState={setAppState} 
            onSave={handleSaveProposal}
            isSaving={isSaving}
        />;
      default:
        return null;
    }
  };

  // --- MAIN RENDER ---

  if (authLoading) {
    return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 text-[#71477A] animate-spin" />
        </div>
    )
  }

  if (!activeUser) {
    return <LoginScreen onOfflineLogin={handleOfflineLogin} />;
  }

  if (viewMode === 'dashboard') {
    return (
        <Dashboard 
            onNewProposal={startNewProposal} 
            onLoadProposal={loadProposal} 
            onLogout={handleLogout}
            user={activeUser}
            isOffline={isOffline}
        />
    );
  }

  // EDITOR MODE
  const isClientConfigured = appState.client.schoolName && appState.client.contactName;
  const navItemClass = (step: Step, disabled: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium border border-transparent w-full box-border ${
      currentStep === step
        ? 'bg-white text-[#71477A] shadow-sm' 
        : disabled 
            ? 'text-purple-300/50 cursor-not-allowed' 
            : 'text-purple-100 hover:bg-white/10 hover:text-white'
    }`;
  
  const currentRegion = REGIONS.find(r => r.id === appState.regionId)?.label || 'N/A';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* Toast Notification */}
      {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
              <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-xl border ${
                  notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
              }`}>
                  {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="font-medium">{notification.message}</span>
                  <button onClick={() => setNotification(null)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4"/></button>
              </div>
          </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#71477A] border-r border-[#5d3a64] flex flex-col shadow-lg print:hidden z-20 shrink-0">
        <div className="p-6 border-b border-white/10 flex justify-start">
            {/* Logo reduced to h-14 */}
            <BrandLogo className="h-14" />
        </div>

        <div className="px-4 pt-4">
             <button 
                onClick={backToDashboard}
                className="flex items-center gap-2 text-purple-200 hover:text-white text-sm font-medium transition-colors mb-2 w-full text-left"
             >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Dashboard
             </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentStep(Step.START)}
            className={navItemClass(Step.START, false)}
          >
            <User className="w-5 h-5 shrink-0" />
            <div className="text-left overflow-hidden w-full">
                <span className="block truncate">Cliente</span>
                <span className="block text-xs opacity-70 font-normal truncate w-full">
                  {appState.client.schoolName || 'Configuração'}
                </span>
            </div>
          </button>

          <div className="pt-6 pb-2 px-4 text-xs font-bold text-purple-200 uppercase tracking-wider opacity-80">
            Detalhamento
          </div>

          <button
            onClick={() => isClientConfigured && setCurrentStep(Step.WORKSHOPS)}
            disabled={!isClientConfigured}
            className={navItemClass(Step.WORKSHOPS, !isClientConfigured)}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Infraestrutura</span>
          </button>

          <button
            onClick={() => isClientConfigured && setCurrentStep(Step.PROPOSAL)}
            disabled={!isClientConfigured}
            className={navItemClass(Step.PROPOSAL, !isClientConfigured)}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>Proposta</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-lg p-4 text-xs space-y-2 border border-white/5">
            <p className="font-bold text-white uppercase tracking-wide mb-1">Resumo do Projeto</p>
            <div className="flex justify-between text-purple-100">
                <span>Ítens da Infraestrutura:</span>
                <span className="font-bold text-white">{appState.selectedInfraIds.length}</span>
            </div>
            <div className="flex justify-between text-purple-100">
                <span>Alunos:</span>
                <span className="font-bold text-white">{appState.commercial.totalStudents}</span>
            </div>
            <div className="flex justify-between text-purple-100 pt-1 mt-1 border-t border-white/10">
                <span>Região:</span>
                <span className="font-bold text-white">{currentRegion}</span>
            </div>
          </div>
          <button 
             onClick={handleSaveProposal}
             disabled={isSaving}
             className="w-full mt-4 bg-[#8BBF56] text-white py-2 rounded-lg font-bold hover:bg-[#7aa84b] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? (isOffline ? 'Salvar Local' : 'Salvar Proposta') : (isOffline ? 'Salvar Local' : 'Salvar Proposta')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {renderEditorContent()}
      </main>
    </div>
  );
}

export default App;