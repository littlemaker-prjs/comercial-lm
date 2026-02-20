
import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { X, Save, RotateCcw, DollarSign, Truck, Percent, Loader2, Check } from 'lucide-react';
import { InfraItem, Region, GlobalVariables } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'infra' | 'freight' | 'config';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, defaultTab = 'infra' }) => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'infra' | 'freight' | 'config'>(defaultTab);
  const [localInfra, setLocalInfra] = useState<InfraItem[]>([]);
  const [localRegions, setLocalRegions] = useState<Region[]>([]);
  const [localVars, setLocalVars] = useState<GlobalVariables>({ marketplaceMargin: 0, materialBonus: 0, infraBonus: 0 });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalInfra(JSON.parse(JSON.stringify(settings.infraCatalog)));
      setLocalRegions(JSON.parse(JSON.stringify(settings.regions)));
      setLocalVars({ ...settings.variables });
      setActiveTab(defaultTab);
    }
  }, [isOpen, settings, defaultTab]);

  const handleInfraChange = (id: string, field: 'price', value: number) => {
    setLocalInfra(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRegionChange = (id: string, field: 'priceSimple' | 'priceAssembly', value: number) => {
    setLocalRegions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleVarChange = (field: keyof GlobalVariables, value: number) => {
      setLocalVars(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        infraCatalog: localInfra,
        regions: localRegions,
        variables: localVars
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header - Purple Theme */}
        <div className="bg-[#71477A] text-white p-6 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-[#8BBF56]" />
                Configurações do Sistema
            </h2>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
            <button 
                onClick={() => setActiveTab('infra')}
                className={`flex-1 py-4 font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'infra' ? 'border-[#71477A] text-[#71477A] bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
            >
                <DollarSign className="w-4 h-4" /> Tabela de Preços (Infra)
            </button>
            <button 
                onClick={() => setActiveTab('freight')}
                className={`flex-1 py-4 font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'freight' ? 'border-[#71477A] text-[#71477A] bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
            >
                <Truck className="w-4 h-4" /> Custos de Frete
            </button>
            <button 
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-4 font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'config' ? 'border-[#71477A] text-[#71477A] bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
            >
                <Percent className="w-4 h-4" /> Precificação & Taxas
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            
            {/* Tab: Infra Prices */}
            {activeTab === 'infra' && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Categoria</th>
                                <th className="px-4 py-3 text-right">Preço Atual (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {localInfra.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{item.category}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <input 
                                            type="number" 
                                            value={item.price}
                                            onChange={(e) => handleInfraChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                            className="w-32 text-right border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#71477A] outline-none font-mono"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Freight Prices */}
            {activeTab === 'freight' && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Região</th>
                                <th className="px-4 py-3 text-right">Frete Simples (R$)</th>
                                <th className="px-4 py-3 text-right">Frete + Montagem (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {localRegions.map(region => (
                                <tr key={region.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-900">{region.label}</td>
                                    <td className="px-4 py-2 text-right">
                                        <input 
                                            type="number" 
                                            value={region.priceSimple}
                                            onChange={(e) => handleRegionChange(region.id, 'priceSimple', parseFloat(e.target.value) || 0)}
                                            className="w-32 text-right border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#71477A] outline-none font-mono"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <input 
                                            type="number" 
                                            value={region.priceAssembly}
                                            onChange={(e) => handleRegionChange(region.id, 'priceAssembly', parseFloat(e.target.value) || 0)}
                                            className="w-32 text-right border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#71477A] outline-none font-mono"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Configs */}
            {activeTab === 'config' && (
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Parâmetros de Cálculo</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fator Market Place</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={localVars.marketplaceMargin}
                                        onChange={(e) => handleVarChange('marketplaceMargin', parseFloat(e.target.value))}
                                        className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#71477A] outline-none"
                                    />
                                    <span className="text-sm text-slate-500 whitespace-nowrap">
                                        (Padrão: 0.83 = ~17% taxa)
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">O valor do material é dividido por este fator quando MP está ativo.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">% Bônus Material (Contrato 3 anos)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={localVars.materialBonus}
                                        onChange={(e) => handleVarChange('materialBonus', parseFloat(e.target.value))}
                                        className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#71477A] outline-none"
                                    />
                                    <span className="text-sm text-slate-500 whitespace-nowrap">
                                        (Padrão: 0.25 = 25%)
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">% Bônus Infraestrutura (MP + 3 anos)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={localVars.infraBonus}
                                        onChange={(e) => handleVarChange('infraBonus', parseFloat(e.target.value))}
                                        className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#71477A] outline-none"
                                    />
                                    <span className="text-sm text-slate-500 whitespace-nowrap">
                                        (Padrão: 0.15 = 15%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded-lg text-white font-bold transition-all flex items-center gap-2 ${success ? 'bg-green-600' : 'bg-[#8BBF56] hover:bg-[#7aa84b]'}`}
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {success ? 'Salvo!' : 'Salvar Alterações'}
            </button>
        </div>
      </div>
    </div>
  );
};