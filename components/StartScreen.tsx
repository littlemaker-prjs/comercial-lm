import React from 'react';
import { AppState } from '../types';
import { Building2, Calendar, User, ArrowRight, Users, CheckCircle2, FileText } from 'lucide-react';

interface StartScreenProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onNext: () => void;
}

const SEGMENT_OPTIONS = [
    "Educação Infantil",
    "Ens. Fundamental Anos Iniciais",
    "Ens. Fundamental Anos Finais",
    "Ensino Médio"
];

export const StartScreen: React.FC<StartScreenProps> = ({ appState, setAppState, onNext }) => {
  const { client, commercial } = appState;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAppState(prev => ({
      ...prev,
      client: { ...prev.client, [name]: value }
    }));
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setAppState(prev => ({
        ...prev,
        commercial: { ...prev.commercial, totalStudents: val }
    }));
  };

  const toggleSegment = (segment: string) => {
    setAppState(prev => {
        const currentSegments = prev.client.segments || [];
        const newSegments = currentSegments.includes(segment)
            ? currentSegments.filter(s => s !== segment)
            : [...currentSegments, segment];
        return {
            ...prev,
            client: { ...prev.client, segments: newSegments }
        };
    });
  };

  const isFormValid = client.schoolName && client.contactName && client.date;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Bar - Fixed */}
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 shrink-0">
         <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-[#71477A]" />
                Dados do Cliente
            </h1>

            <button
              onClick={onNext}
              disabled={!isFormValid}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-sm ${
                isFormValid
                  ? 'bg-[#71477A] hover:bg-[#5d3a64] text-white hover:-translate-y-0.5'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Continuar para Infraestrutura</span>
              <ArrowRight className="h-4 w-4" />
            </button>
         </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 animate-fade-in">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Lean Green Header */}
            <div className="bg-[#8BBF56] p-6 text-white flex items-center gap-3">
                <FileText className="w-6 h-6" />
                <h2 className="text-xl font-bold">Nova Proposta Comercial</h2>
            </div>
            
            <div className="p-8 space-y-6">
                {/* Form Fields */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Nome da Escola / Cliente</label>
                    <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        name="schoolName"
                        value={client.schoolName}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-[#8BBF56] focus:border-[#8BBF56] transition-colors bg-white text-slate-900"
                        placeholder="Ex: Colégio Futuro"
                    />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Responsável / Contato</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                        type="text"
                        name="contactName"
                        value={client.contactName}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-[#8BBF56] focus:border-[#8BBF56] transition-colors bg-white text-slate-900"
                        placeholder="Ex: Maria Silva"
                        />
                    </div>
                    </div>

                    <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Data da Proposta</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                        type="date"
                        name="date"
                        value={client.date}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-[#8BBF56] focus:border-[#8BBF56] transition-colors bg-white text-slate-900"
                        />
                    </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Número Total de Alunos da Proposta</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                        type="number"
                        value={commercial.totalStudents}
                        onChange={handleStudentChange}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-[#8BBF56] focus:border-[#8BBF56] transition-colors bg-white text-slate-900"
                        placeholder="Ex: 250"
                        />
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Segmentos Contemplados na Proposta</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SEGMENT_OPTIONS.map(segment => {
                            const isSelected = (client.segments || []).includes(segment);
                            return (
                                <div 
                                    key={segment}
                                    onClick={() => toggleSegment(segment)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        isSelected 
                                        ? 'bg-green-50 border-[#8BBF56] text-[#6a9440]' 
                                        : 'bg-white border-slate-200 hover:border-green-300 text-slate-600'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                        isSelected ? 'bg-[#8BBF56] border-[#8BBF56]' : 'border-slate-300'
                                    }`}>
                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <span className="text-sm font-medium select-none">{segment}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};