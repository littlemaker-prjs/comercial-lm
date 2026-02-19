import React from 'react';
import { AppState } from '../types';
import { INFRA_CATALOG } from '../constants';
import { FileText, ClipboardList, CheckSquare } from 'lucide-react';

interface InfrastructureViewProps {
  appState: AppState;
}

export const InfrastructureView: React.FC<InfrastructureViewProps> = ({ appState }) => {
  const { selectedInfraIds } = appState;
  
  const selectedItems = INFRA_CATALOG.filter(item => selectedInfraIds.includes(item.id));

  if (selectedItems.length === 0) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400">
            <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium mb-2">Sem dados para gerar</h3>
            <p>Selecione itens no Painel de Oficinas para gerar o descritivo técnico.</p>
        </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        <div className="p-6 bg-slate-800 text-white flex items-center gap-3 print:bg-slate-100 print:text-slate-900">
          <FileText className="w-6 h-6" />
          <h2 className="text-xl font-bold">Descritivo Técnico de Infraestrutura</h2>
        </div>
        
        <div className="p-8 space-y-6">
          <p className="text-slate-500 italic mb-6">
            Abaixo estão listados os itens de infraestrutura (Ambientação e Ferramentas) selecionados para o projeto, compondo a solução técnica a ser implantada.
          </p>

          <div className="grid gap-6">
            {selectedItems.map((item, index) => (
              <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 print:bg-white print:border-slate-200 break-inside-avoid">
                 <div className="flex-shrink-0 mt-1">
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{item.label}</h3>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 mb-2">
                        {item.category} • {item.type}
                    </span>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {item.description}
                    </p>
                 </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 print:text-slate-500">
             * Os equipamentos listados são entregues em regime de comodato durante a vigência do contrato, salvo negociação específica de venda.
          </div>
        </div>
      </div>
    </div>
  );
};
