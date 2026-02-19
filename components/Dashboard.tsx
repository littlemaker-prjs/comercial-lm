import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppState } from '../types';
import { Plus, Search, FileText, Calendar, Trash2, Loader2, LogOut, GraduationCap, Copy, LayoutGrid, List, AlertTriangle, AlertCircle } from 'lucide-react';
import { INFRA_CATALOG, REGIONS } from '../constants';

interface SavedProposal {
  id: string;
  userId: string;
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      confirmLabel: string;
      isDestructive?: boolean;
      onConfirm: () => void;
  } | null>(null);

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

  useEffect(() => {
    fetchProposals();
  }, [user, isOffline]);

  const fetchProposals = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      if (isOffline) {
        const localData = localStorage.getItem('offline_proposals');
        if (localData) {
            let parsed = JSON.parse(localData);
            setProposals(parsed.sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
        } else {
            setProposals([]);
        }
      } else {
        // Busca simples da coleção - REQUISITO: Ver tudo
        const querySnapshot = await getDocs(collection(db, 'proposals'));
        
        const items: SavedProposal[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                userId: data.userId || '',
                updatedAt: data.updatedAt,
                schoolName: data.data?.client?.schoolName || data.schoolName || 'Sem nome',
                userEmail: data.userEmail,
                data: data.data as AppState
            });
        });

        items.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setProposals(items);
      }
    } catch (error: any) {
      console.error("Erro ao buscar propostas no Firestore:", error);
      setFetchError(error.message);
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
                if (!isOffline) {
                    await deleteDoc(doc(db, 'proposals', id));
                }
                setProposals(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                console.error("Delete error:", error);
                alert("Erro ao excluir. Apenas administradores podem realizar esta ação.");
            }
        }
    });
  };

  const calculateCardValues = (proposalData: AppState) => {
      if (!proposalData) return { hasMidia: false, hasMaker: false, hasInfantil: false, totalMaterialYear: 0, totalInfra: 0 };
      const selectedIds = proposalData.selectedInfraIds || [];
      const selectedItems = INFRA_CATALOG.filter(i => selectedIds.includes(i.id));
      const hasMidia = selectedItems.some(i => i.category === 'midia');
      const hasMaker = selectedItems.some(i => i.category === 'maker');
      const hasInfantil = selectedItems.some(i => i.category === 'infantil');
      const students = proposalData.commercial?.totalStudents || 0;
      
      const getBaseMaterialPrice = (s: number) => {
          if (s >= 800) return 240;
          if (s >= 400) return 280;
          if (s >= 200) return 350;
          if (s >= 100) return 480;
          return 650;
      };

      const totalMaterialYear = getBaseMaterialPrice(students) * students; 
      const regionId = proposalData.regionId || 'ate_700';
      const region = REGIONS.find(r => r.id === regionId) || REGIONS[0];
      const infraSum = selectedItems.reduce((sum, i) => sum + i.price, 0);
      let freight = 0;
      if (selectedItems.length > 0) {
          const needsAssembly = selectedItems.some(i => i.requiresAssembly);
          freight = needsAssembly ? region.priceAssembly : region.priceSimple;
      }
      return { hasMidia, hasMaker, hasInfantil, totalMaterialYear, totalInfra: infraSum + freight };
  };

  const filteredProposals = proposals.filter(p => 
    (p.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
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
                              <p className="text-slate-500 text-sm">{modalConfig.message}</p>
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                          <button onClick={() => setModalConfig(null)} className="px-4 py-2 text-slate-600 text-sm">Cancelar</button>
                          <button onClick={() => { modalConfig.onConfirm(); setModalConfig(null); }} className={`px-4 py-2 text-white font-bold rounded-lg text-sm ${modalConfig.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#71477A] hover:bg-[#5d3a64]'}`}>
                              {modalConfig.confirmLabel}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <header className="text-white p-4 shadow-md bg-[#71477A]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <img src="https://littlemaker.com.br/logo_lm-2/" alt="Little Maker" className="h-10 w-auto" />
             <h1 className="text-xl font-bold border-l border-white/30 pl-4 hidden md:block">Painel Little Maker</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2 text-right">
                <span className="text-sm font-medium">{user.email}</span>
                <span className="text-[10px] opacity-70 flex items-center gap-1">
                    {isMaster ? 'ADMIN MASTER' : 'CONSULTOR'} • {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
            </div>
            <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {fetchError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                    <p className="font-bold">Erro de Sincronização</p>
                    <p className="opacity-80">O Firestore retornou: "{fetchError}". Verifique se as regras no console do Firebase foram publicadas corretamente.</p>
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input type="text" placeholder="Buscar escola..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none" />
                </div>
                <div className="flex bg-slate-200 rounded-lg p-1 gap-1 shrink-0">
                    <button onClick={() => setViewType('grid')} className={`p-2 rounded-md ${viewType === 'grid' ? 'bg-white shadow text-[#71477A]' : 'text-slate-500'}`}><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setViewType('list')} className={`p-2 rounded-md ${viewType === 'list' ? 'bg-white shadow text-[#71477A]' : 'text-slate-500'}`}><List className="w-5 h-5" /></button>
                </div>
            </div>
            <button onClick={onNewProposal} className="w-full md:w-auto bg-[#8BBF56] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#7aa84b] transition-all shadow-md flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />Nova Proposta
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-[#71477A] animate-spin" /></div>
        ) : filteredProposals.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Nenhuma proposta encontrada</h3>
            </div>
        ) : (
            <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "bg-white rounded-xl shadow-sm border overflow-hidden"}>
                {viewType === 'grid' ? (
                    filteredProposals.map((proposal) => {
                        const stats = calculateCardValues(proposal.data);
                        return (
                            <div key={proposal.id} onClick={() => onLoadProposal(proposal.id, proposal.data)} className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200 cursor-pointer transition-all group overflow-hidden flex flex-col">
                                <div className="p-5 flex-1 relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="max-w-[75%]">
                                            <div className="text-[10px] text-slate-400 font-mono mb-1">ID: {proposal.id.slice(-6)}</div>
                                            <h3 className="font-bold text-lg text-slate-800 leading-tight line-clamp-2">{proposal.schoolName || 'Sem nome'}</h3>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => { e.stopPropagation(); const newData = JSON.parse(JSON.stringify(proposal.data)); newData.client.schoolName += ' (Cópia)'; onLoadProposal(null, newData); }} className="text-slate-300 hover:text-blue-500 p-2"><Copy className="w-4 h-4" /></button>
                                            {isMaster && <button onClick={(e) => handleDelete(e, proposal.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-3"><GraduationCap className="w-3.5 h-3.5" /><span>{proposal.data?.commercial?.totalStudents || 0} alunos</span></div>
                                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                                        <div className="flex justify-between"><span className="text-slate-500">Material/ano:</span><span className="font-bold text-slate-700">{stats.totalMaterialYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Total Infra:</span><span className="font-bold text-slate-700">{stats.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                    </div>
                                </div>
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{proposal.updatedAt?.seconds ? new Date(proposal.updatedAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Recente'}</div>
                                    <div className="italic">{proposal.userEmail ? proposal.userEmail.split('@')[0] : 'Consultor'}</div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                            <tr><th className="px-6 py-4">Escola</th><th className="px-6 py-4 text-center">Alunos</th><th className="px-6 py-4 text-right">Infra</th><th className="px-6 py-4 text-center">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProposals.map((proposal) => {
                                const stats = calculateCardValues(proposal.data);
                                return (
                                    <tr key={proposal.id} onClick={() => onLoadProposal(proposal.id, proposal.data)} className="hover:bg-slate-50 cursor-pointer">
                                        <td className="px-6 py-4 font-bold text-slate-800">{proposal.schoolName || 'Sem nome'}</td>
                                        <td className="px-6 py-4 text-center">{proposal.data?.commercial?.totalStudents}</td>
                                        <td className="px-6 py-4 text-right font-medium">{stats.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); const newData = JSON.parse(JSON.stringify(proposal.data)); newData.client.schoolName += ' (Cópia)'; onLoadProposal(null, newData); }} className="p-2 text-slate-400 hover:text-blue-600"><Copy className="w-4 h-4" /></button>
                                                {isMaster && <button onClick={(e) => handleDelete(e, proposal.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        )}
      </main>
    </div>
  );
};