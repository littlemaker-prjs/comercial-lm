
import React from 'react';
import { AppState, CategoryType, InfraItem } from '../types';
import { Truck, ArrowRight, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface WorkshopPanelProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onNext?: () => void;
}

export const WorkshopPanel: React.FC<WorkshopPanelProps> = ({ appState, setAppState, onNext }) => {
  const { settings } = useSettings(); // Use Global Settings
  const { regionId, selectedInfraIds } = appState;
  const segments = appState.client.segments || [];

  const toggleItem = (itemId: string, category: CategoryType) => {
    setAppState(prev => {
      const isSelected = prev.selectedInfraIds.includes(itemId);
      const item = settings.infraCatalog.find(i => i.id === itemId);
      
      if (!item) return prev;

      let newSelection = [...prev.selectedInfraIds];

      // LOGIC: Remove item if already selected
      if (isSelected) {
        newSelection = newSelection.filter(id => id !== itemId);
        
        // If removing a BASE/STANDARD item, we must remove its upgrades too
        if (item.isBase) {
            const relatedUpgrades = settings.infraCatalog.filter(i => 
                i.category === category && 
                i.type === item.type && 
                i.isUpgrade
            ).map(i => i.id);
            newSelection = newSelection.filter(id => !relatedUpgrades.includes(id));
        }
      } 
      // LOGIC: Add item
      else {
        newSelection.push(itemId);

        // --- SPECIFIC BUSINESS LOGIC ---
        // (Same logic as before, but using ids which are stable)

        // 1. Mídia / Ambientação
        if (category === 'midia' && item.type === 'ambientacao') {
             if (item.isUpgrade) {
                 if (!newSelection.includes('midia_padrao_24')) newSelection.push('midia_padrao_24');
                 const otherUp = item.id === 'midia_up_12' ? 'midia_up_6' : 'midia_up_12';
                 newSelection = newSelection.filter(id => id !== otherUp);
             }
        }
        
        // 2. Maker / Ambientação
        if (category === 'maker' && item.type === 'ambientacao') {
            if (item.id === 'maker_minima') {
                newSelection = newSelection.filter(id => !['maker_padrao_24', 'maker_up_12', 'maker_up_6'].includes(id));
            } else {
                newSelection = newSelection.filter(id => id !== 'maker_minima');
                if (item.isUpgrade) {
                    if (!newSelection.includes('maker_padrao_24')) newSelection.push('maker_padrao_24');
                    const otherUp = item.id === 'maker_up_12' ? 'maker_up_6' : 'maker_up_12';
                    newSelection = newSelection.filter(id => id !== otherUp);
                }
            }
        }

        // 3. Maker / Ferramentas
        if (category === 'maker' && item.type === 'ferramentas') {
            if (item.id === 'maker_ferr_red_18') {
                newSelection = newSelection.filter(id => !['maker_ferr_padrao', 'maker_ferr_digitais', 'maker_ferr_pc'].includes(id));
            } else {
                newSelection = newSelection.filter(id => id !== 'maker_ferr_red_18');
                if (item.isUpgrade) {
                     if (!newSelection.includes('maker_ferr_padrao')) newSelection.push('maker_ferr_padrao');
                }
            }
        }

        // 4. Mídia / Ferramentas
        if (category === 'midia' && item.type === 'ferramentas') {
            if (item.isUpgrade) {
                if (!newSelection.includes('midia_ferr_padrao')) newSelection.push('midia_ferr_padrao');
            }
        }

        // 5. Infantil / Ambientação
        if (category === 'infantil' && item.type === 'ambientacao') {
            if (item.id === 'infantil_carrinho') {
                newSelection = newSelection.filter(id => !['infantil_padrao_18', 'infantil_up_12', 'infantil_up_6'].includes(id));
            } else {
                newSelection = newSelection.filter(id => id !== 'infantil_carrinho');
                if (!newSelection.includes('infantil_ferr_18')) {
                    newSelection.push('infantil_ferr_18');
                }
                if (item.isUpgrade) {
                    if (!newSelection.includes('infantil_padrao_18')) newSelection.push('infantil_padrao_18');
                    const otherUp = item.id === 'infantil_up_12' ? 'infantil_up_6' : 'infantil_up_12';
                    newSelection = newSelection.filter(id => id !== otherUp);
                }
            }
        }

        // 6. Infantil / Ferramentas
        if (category === 'infantil' && item.type === 'ferramentas') {
             if (item.isUpgrade) {
                if (!newSelection.includes('infantil_ferr_18')) newSelection.push('infantil_ferr_18');
                const otherUp = item.id === 'infantil_ferr_up_12' ? 'infantil_ferr_up_6' : 'infantil_ferr_up_12';
                newSelection = newSelection.filter(id => id !== otherUp);
             }
        }
      }

      return { ...prev, selectedInfraIds: newSelection };
    });
  };

  const renderCategoryColumn = (title: string, category: CategoryType) => {
    // USE SETTINGS CATALOG
    const items = settings.infraCatalog.filter(i => i.category === category);
    const ambientacao = items.filter(i => i.type === 'ambientacao');
    const ferramentas = items.filter(i => i.type === 'ferramentas');

    return (
      <div className="flex-1 min-w-[340px] max-w-[420px] flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden shrink-0">
        <div className="p-3 bg-[#8BBF56] border-b border-green-600">
          <h3 className="font-bold text-sm text-white text-center uppercase tracking-wide">{title}</h3>
        </div>

        <div className="p-5 flex-1 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm border-b border-slate-100 pb-1">Ambientação</h4>
            <div className="space-y-3">
              {ambientacao.map(item => {
                const isSelected = selectedInfraIds.includes(item.id);
                return (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group hover:bg-slate-50 p-2 rounded-lg -ml-2 transition-colors">
                    <div className={`relative flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border transition-colors mt-0.5 ${
                        isSelected ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300 group-hover:border-slate-400'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="opacity-0 absolute inset-0 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id, category)}
                      />
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <span className={`text-sm select-none leading-tight ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>
                        {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm border-b border-slate-100 pb-1">Ferramentas</h4>
            <div className="space-y-3">
              {ferramentas.map(item => {
                 const isSelected = selectedInfraIds.includes(item.id);
                 return (
                 <label key={item.id} className="flex items-start gap-3 cursor-pointer group hover:bg-slate-50 p-2 rounded-lg -ml-2 transition-colors">
                 <div className={`relative flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border transition-colors mt-0.5 ${
                     isSelected ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300 group-hover:border-slate-400'
                 }`}>
                   <input 
                     type="checkbox" 
                     className="opacity-0 absolute inset-0 cursor-pointer"
                     checked={isSelected}
                     onChange={() => toggleItem(item.id, category)}
                   />
                   {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                 </div>
                 <span className={`text-sm select-none leading-tight ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>
                     {item.label}
                 </span>
               </label>
               );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasEI = segments.includes("Educação Infantil");
  const hasEF = segments.includes("Ens. Fundamental Anos Iniciais") || segments.includes("Ens. Fundamental Anos Finais") || segments.includes("Ensino Médio");

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
        {/* Region Selector Header */}
        <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 shrink-0">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <label className="font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Região Entrega:
                    </label>
                    <div className="relative">
                        <select 
                            value={regionId}
                            onChange={(e) => setAppState(prev => ({ ...prev, regionId: e.target.value }))}
                            className="appearance-none bg-[#EBF5E0] text-slate-800 font-medium py-2 pl-4 pr-10 rounded-full border border-[#d4e8c0] focus:outline-none focus:ring-2 focus:ring-[#8BBF56] cursor-pointer min-w-[200px]"
                        >
                            {/* USE SETTINGS REGIONS */}
                            {settings.regions.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-600">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
                
                {onNext && (
                    <button 
                        onClick={onNext}
                        className="flex items-center gap-2 bg-[#71477A] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#5d3a64] transition-colors shadow-sm"
                    >
                        <span>Continuar para Proposta</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>

        {/* Scrollable Columns */}
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden">
            <div className="h-full flex gap-6 p-6 min-w-max">
                {hasEI ? renderCategoryColumn('Maker Infantil', 'infantil') : (
                    <div className="flex-1 min-w-[300px] max-w-[340px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-slate-400 p-8 text-center text-sm">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-8 h-8 opacity-50" />
                            <p>Educação Infantil não selecionada nos Dados do Cliente.</p>
                        </div>
                    </div>
                )}
                {hasEF ? renderCategoryColumn('Maker Fundamental e Médio', 'maker') : null}
                {hasEF ? renderCategoryColumn('Mídia Fundamental e Médio', 'midia') : (
                     <div className="flex-1 min-w-[300px] max-w-[340px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-slate-400 p-8 text-center text-sm">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-8 h-8 opacity-50" />
                            <p>Ensino Fundamental/Médio não selecionado nos Dados do Cliente.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
