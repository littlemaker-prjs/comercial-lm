import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AppState } from '../types';
import { Plus, Search, FileText, Calendar, Trash2, Edit, Loader2, LogOut, Wifi, WifiOff, User, GraduationCap, Wrench, Coins, Copy, LayoutGrid, List, Clock, ShoppingBag, Percent, AlertTriangle, X } from 'lucide-react';
import { INFRA_CATALOG, REGIONS } from '../constants';

interface SavedProposal {
  id: string;
  updatedAt: any;
  schoolName: string;
  userEmail?: string;
  data: AppState;
}

interface DashboardProps {
  onNewProposal: () => void;
  onLoadProposal: (id: string | null, data: AppState) => void;
  onLogout: () => void;
  user: any;
  isOffline: boolean;
}

const MASTER_EMAIL = 'diego.thuler@littlemaker.com.br';

export const Dashboard: React.FC<DashboardProps> = ({ onNewProposal, onLoadProposal, onLogout, user, isOffline }) => {
  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      confirmLabel: string;
      isDestructive?: boolean;
      onConfirm: () => void;
  } | null>(null);

  // Check if current user is master (Valid in Online AND Offline for testing)
  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

  useEffect(() => {
    fetchProposals();
  }, [user, isOffline]);

  const fetchProposals = async () => {
    setLoading(true);

    try {
      if (isOffline) {
        // --- OFFLINE FETCH ---
        const localData = localStorage.getItem('offline_proposals');
        if (localData) {
            let parsed = JSON.parse(localData);
            setProposals(parsed.sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
        } else {
            setProposals([]);
        }
      } else {
        // --- FIREBASE FETCH ---
        const q = query(collection(db, 'proposals'));
        
        const querySnapshot = await getDocs(q);
        const items: SavedProposal[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                updatedAt: data.updatedAt,
                schoolName: data.data.client?.schoolName || data.schoolName || 'Sem nome',
                userEmail: data.userEmail,
                data: data.data as AppState
            });
        });

        items.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setProposals(items);
      }

    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    
    setModalConfig({
        isOpen: true,
        title: 'Excluir Proposta',
        message: 'Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.',
        confirmLabel: 'Sim, excluir',
        isDestructive: true,
        onConfirm: async () => {
            try {
                if (isOffline) {
                     const localData = localStorage.getItem('offline_proposals');
                     if (localData) {
                         const allProposals = JSON.parse(localData);
                         const remaining = allProposals.filter((p: any) => p.id !== id);
                         localStorage.setItem('offline_proposals', JSON.stringify(remaining));
                         setProposals(remaining.sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
                     }
                } else {
                    await deleteDoc(doc(db, 'proposals', id));
                    setProposals(prev => prev.filter(p => p.id !== id));
                }
            } catch (error) {
                console.error("Error deleting:", error);
            }
        }
    });
  };

  const handleDuplicate = (e: React.MouseEvent, proposal: SavedProposal) => {
      e.stopPropagation();

      setModalConfig({
          isOpen: true,
          title: 'Duplicar Proposta',
          message: `Deseja criar uma cópia da proposta "${proposal.schoolName}"?`,
          confirmLabel: 'Duplicar',
          isDestructive: false,
          onConfirm: () => {
              const newData: AppState = JSON.parse(JSON.stringify(proposal.data));
              newData.client.date = new Date().toISOString().split('T')[0];
              newData.client.schoolName = `${newData.client.schoolName} (Cópia)`;
              onLoadProposal(null, newData);
          }
      });
  };

  const abbreviateSegments = (segments: string[]) => {
      if (!segments || segments.length === 0) return 'Nenhum segmento';
      
      const map: Record<string, string> = {
          "Educação Infantil": "EI",
          "Ens. Fundamental Anos Iniciais": "EFAI",
          "Ens. Fundamental Anos Finais": "EFAF",
          "Ensino Médio": "EM"
      };

      return segments.map(s => map[s] || s).join(', ');
  };

  const getBaseMaterialPrice = (students: number) => {
    if (students >= 800) return 240;
    if (students >= 400) return 280;
    if (students >= 200) return 350;
    if (students >= 100) return 480;
    return 650; 
  };

  const calculateCardValues = (proposalData: AppState) => {
      const selectedIds = proposalData.selectedInfraIds || [];
      const selectedItems = INFRA_CATALOG.filter(i => selectedIds.includes(i.id));
      
      // Categories detected
      const hasMidia = selectedItems.some(i => i.category === 'midia');
      const hasMaker = selectedItems.some(i => i.category === 'maker');
      const hasInfantil = selectedItems.some(i => i.category === 'infantil');
      
      // Financials
      const students = proposalData.commercial.totalStudents || 0;
      const baseMaterialPerStudent = getBaseMaterialPrice(students);
      const totalMaterialYear = baseMaterialPerStudent * students; // Calculation: Total per Year
      
      const regionId = proposalData.regionId || 'ate_700';
      const region = REGIONS.find(r => r.id === regionId) || REGIONS[0];
      
      const infraSum = selectedItems.reduce((sum, i) => sum + i.price, 0);
      let freight = 0;
      if (selectedItems.length > 0) {
          const needsAssembly = selectedItems.some(i => i.requiresAssembly);
          freight = needsAssembly ? region.priceAssembly : region.priceSimple;
      }
      const totalInfra = infraSum + freight;

      return {
          hasMidia, hasMaker, hasInfantil,
          totalMaterialYear, 
          totalInfra
      };
  };

  const formatDateTime = (seconds: number) => {
      if (!seconds) return 'Data N/A';
      return new Date(seconds * 1000).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit'
      });
  };

  const formatDateOnly = (seconds: number) => {
      if (!seconds) return 'N/A';
      return new Date(seconds * 1000).toLocaleDateString('pt-BR');
  };

  const filteredProposals = proposals.filter(p => 
    (p.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Custom Modal for Confirmations */}
      {modalConfig && modalConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalConfig(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                          <div className={`p-3 rounded-full shrink-0 ${modalConfig.isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                             {modalConfig.isDestructive ? <AlertTriangle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{modalConfig.title}</h3>
                              <p className="text-slate-500 text-sm leading-relaxed">{modalConfig.message}</p>
                          </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-6">
                          <button 
                              onClick={() => setModalConfig(null)}
                              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={() => {
                                  modalConfig.onConfirm();
                                  setModalConfig(null);
                              }}
                              className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 text-sm ${
                                  modalConfig.isDestructive 
                                  ? 'bg-red-600 hover:bg-red-700' 
                                  : 'bg-[#71477A] hover:bg-[#5d3a64]'
                              }`}
                          >
                              {modalConfig.confirmLabel}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="text-white p-4 shadow-md bg-[#71477A]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="p-1">
                <BrandLogo className="h-12 w-auto" />
             </div>
             <h1 className="text-xl font-bold border-l border-white/30 pl-4 hidden md:block">
                 {isOffline ? 'Painel de Propostas (Modo Visitante)' : 'Painel de Propostas'}
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium">{user.displayName || user.email || 'Usuário'}</span>
                <span className="text-xs opacity-70 flex items-center gap-1">
                    {isOffline ? <><WifiOff className="w-3 h-3"/> Offline</> : <><Wifi className="w-3 h-3"/> Online</>}
                </span>
            </div>
            <button 
                onClick={onLogout}
                className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2" 
                title="Sair"
            >
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome da escola..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-900 focus:ring-2 focus:ring-[#71477A] focus:bg-white focus:border-transparent outline-none shadow-sm transition-colors"
                    />
                </div>
                
                {/* View Toggles */}
                <div className="flex bg-slate-200 rounded-lg p-1 gap-1 shrink-0">
                    <button 
                        onClick={() => setViewType('grid')}
                        className={`p-2 rounded-md transition-all ${viewType === 'grid' ? 'bg-white shadow text-[#71477A]' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Visualização em Grade"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewType('list')}
                        className={`p-2 rounded-md transition-all ${viewType === 'list' ? 'bg-white shadow text-[#71477A]' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Visualização em Lista"
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            <button 
                onClick={onNewProposal}
                className="w-full md:w-auto bg-[#8BBF56] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#7aa84b] transition-all shadow-md flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
                <Plus className="w-5 h-5" />
                Nova Proposta
            </button>
        </div>

        {/* Content */}
        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#71477A] animate-spin" />
            </div>
        ) : filteredProposals.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Nenhuma proposta encontrada</h3>
                <p className="text-slate-500 mt-1">Crie uma nova proposta para começar.</p>
            </div>
        ) : (
            <>
                {viewType === 'grid' ? (
                    // --- GRID VIEW ---
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProposals.map((proposal) => {
                            const stats = calculateCardValues(proposal.data);
                            // Permission: Master deletes ALL. Owner deletes OWN.
                            const canDelete = isMaster || (proposal.userEmail === user.email);

                            // Commercial Flags
                            const isThreeYears = proposal.data.commercial.contractDuration === 3;
                            const isMarketplace = proposal.data.commercial.useMarketplace;
                            const isBonus = proposal.data.commercial.applyInfraBonus;

                            return (
                                <div 
                                    key={proposal.id}
                                    onClick={() => onLoadProposal(proposal.id, proposal.data)}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 border border-slate-200 cursor-pointer transition-all group relative overflow-hidden flex flex-col isolate"
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full ${isOffline ? 'bg-slate-400' : 'bg-[#71477A]'} group-hover:w-2 transition-all`}></div>
                                    
                                    <div className="p-5 flex-1 relative">
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-mono mb-1">ID: {proposal.id.slice(0, 8)}...</div>
                                                <h3 className="font-bold text-lg text-slate-800 leading-tight line-clamp-2">
                                                    {proposal.schoolName || 'Sem nome'}
                                                </h3>
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div 
                                                className="flex gap-1 z-50 relative" 
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button 
                                                    onClick={(e) => handleDuplicate(e, proposal)}
                                                    className="text-slate-300 hover:text-blue-500 p-2 hover:bg-blue-50 rounded transition-colors"
                                                    title="Duplicar"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                {canDelete && (
                                                    <button 
                                                        onClick={(e) => handleDelete(e, proposal.id)}
                                                        className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Students Only */}
                                        <div className="pl-2 mb-3">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <GraduationCap className="w-3.5 h-3.5" />
                                                <span>{proposal.data.commercial.totalStudents || 0} alunos</span>
                                            </div>
                                        </div>

                                        {/* Segments (Abbreviated) */}
                                        <div className="pl-2 mb-4 text-xs text-slate-500 line-clamp-1 border-t border-slate-50 pt-2">
                                            {abbreviateSegments(proposal.data.client.segments)}
                                        </div>

                                        {/* Badges: Infra Types */}
                                        <div className="pl-2 flex flex-wrap gap-1 mb-4">
                                            {stats.hasMaker && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">MAKER</span>}
                                            {stats.hasMidia && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">MÍDIA</span>}
                                            {stats.hasInfantil && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">INFANTIL</span>}
                                            {!stats.hasMaker && !stats.hasMidia && !stats.hasInfantil && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400">Sem Infra</span>
                                            )}
                                        </div>

                                        {/* Badges: Commercial Flags (Grid Only) */}
                                        <div className="pl-2 flex flex-wrap gap-2 mb-4 text-[10px] text-slate-600 font-medium">
                                            {isThreeYears && (
                                                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-800 px-2 py-1 rounded border border-yellow-100" title="Contrato de 3 Anos">
                                                    <Clock className="w-3 h-3" /> 3 Anos
                                                </div>
                                            )}
                                            {isMarketplace && (
                                                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-100" title="Market Place">
                                                    <ShoppingBag className="w-3 h-3" /> Mkt Place
                                                </div>
                                            )}
                                            {isBonus && (
                                                <div className="flex items-center gap-1 bg-indigo-50 text-indigo-800 px-2 py-1 rounded border border-indigo-100" title="Bônus Infra">
                                                    <Percent className="w-3 h-3" /> % Bônus Infra
                                                </div>
                                            )}
                                        </div>
                                    
                                        {/* Financials */}
                                        <div className="pl-2 bg-slate-50 rounded-lg p-3 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">Material (ano):</span>
                                                <span className="font-bold text-slate-700">{stats.totalMaterialYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">Total Infra:</span>
                                                <span className="font-bold text-slate-700">{stats.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer: Date & Creator */}
                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 pl-7">
                                        <div className="flex items-center gap-1" title={formatDateTime(proposal.updatedAt?.seconds)}>
                                            <Calendar className="w-3 h-3" />
                                            {formatDateTime(proposal.updatedAt?.seconds)}
                                        </div>
                                        <div className="italic truncate max-w-[100px]" title={proposal.userEmail || 'Desconhecido'}>
                                            Por: {proposal.userEmail ? proposal.userEmail.split('@')[0] : '...'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // --- LIST VIEW ---
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Escola / Segmentos</th>
                                        <th className="px-6 py-4 text-center">Alunos</th>
                                        <th className="px-6 py-4 text-right">Material (Ano)</th>
                                        <th className="px-6 py-4 text-right">Infra Total</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProposals.map((proposal) => {
                                        const stats = calculateCardValues(proposal.data);
                                        const canDelete = isMaster || (proposal.userEmail === user.email);

                                        return (
                                            <tr 
                                                key={proposal.id} 
                                                onClick={() => onLoadProposal(proposal.id, proposal.data)}
                                                className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                    {formatDateOnly(proposal.updatedAt?.seconds)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 font-mono text-xs select-all">
                                                    {proposal.id.slice(0, 8)}...
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{proposal.schoolName || 'Sem nome'}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {abbreviateSegments(proposal.data.client.segments)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-700">
                                                    {proposal.data.commercial.totalStudents}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 font-medium">
                                                    {stats.totalMaterialYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 font-medium">
                                                    {stats.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div 
                                                        className="flex items-center justify-center gap-2"
                                                        onClick={(e) => e.stopPropagation()} 
                                                    >
                                                        <button 
                                                            onClick={(e) => handleDuplicate(e, proposal)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Duplicar"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        {canDelete && (
                                                            <button 
                                                                onClick={(e) => handleDelete(e, proposal.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}
      </main>
    </div>
  );
};