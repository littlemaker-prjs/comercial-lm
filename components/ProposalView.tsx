
import React, { useState } from 'react';
import { AppState, CategoryType } from '../types';
import { Download, CheckSquare, Edit3 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { PROPOSAL_TEXTS } from '../constants';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

interface ProposalViewProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onSave?: () => void;
  isSaving?: boolean;
  user?: any;
  isMaster: boolean; // Received from App
}

export const ProposalView: React.FC<ProposalViewProps> = ({ appState, setAppState, onSave, isSaving, user, isMaster }) => {
  const { settings } = useSettings(); // Use Global Settings
  const { selectedInfraIds, regionId, commercial } = appState;
  
  // Local state for field editing
  const [editingField, setEditingField] = useState<string | null>(null);
  
  // --- HELPERS ---
  const selectedItems = settings.infraCatalog.filter(i => selectedInfraIds.includes(i.id));
  const hasInfraItems = selectedItems.length > 0;

  // --- CONFIGURATION HANDLERS ---
  const toggleContract = () => {
    setAppState(prev => ({
        ...prev,
        commercial: { 
            ...prev.commercial, 
            contractDuration: prev.commercial.contractDuration === 3 ? 1 : 3,
            applyInfraBonus: prev.commercial.contractDuration === 3 ? false : prev.commercial.applyInfraBonus,
            // Reset manual bonuses to force recalculation based on new contract rules
            customValues: {
                ...prev.commercial.customValues,
                materialBonus: undefined,
                infraBonus: undefined
            }
        }
    }));
  };

  const toggleMarketplace = () => {
    setAppState(prev => {
        const newVal = !prev.commercial.useMarketplace;
        return {
            ...prev,
            commercial: { 
                ...prev.commercial, 
                useMarketplace: newVal,
                applyInfraBonus: newVal ? prev.commercial.applyInfraBonus : false,
                // Reset manual bonuses to force recalculation based on MP rules
                customValues: {
                    ...prev.commercial.customValues,
                    materialBonus: undefined,
                    infraBonus: undefined
                }
            }
        };
    });
  };

  const toggleBonus = () => {
    setAppState(prev => ({
        ...prev,
        commercial: { 
            ...prev.commercial, 
            applyInfraBonus: !prev.commercial.applyInfraBonus,
            // Reset manual bonuses to force recalculation to original logic
            customValues: {
                ...prev.commercial.customValues,
                materialBonus: undefined,
                infraBonus: undefined
            }
        }
    }));
  };

  const updateStudents = (val: number) => {
    setAppState(prev => ({
        ...prev,
        commercial: { ...prev.commercial, totalStudents: val }
    }));
  };

  const updateOverride = (field: keyof NonNullable<typeof commercial.customValues>, value: number) => {
      setAppState(prev => ({
          ...prev,
          commercial: {
              ...prev.commercial,
              customValues: {
                  ...prev.commercial.customValues,
                  [field]: value
              }
          }
      }));
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('proposal-content');
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `Proposta_${appState.client.schoolName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        window.print();
    }
  };

  // --- FINANCIAL CALCULATIONS ---

  // 1. Base Price Lookup (Tiered)
  const getBaseMaterialPrice = (students: number) => {
    if (students >= 800) return 240;
    if (students >= 400) return 280;
    if (students >= 200) return 350;
    if (students >= 100) return 480;
    return 650;
  };

  const basePricePerStudentYearTiered = getBaseMaterialPrice(commercial.totalStudents);
  
  // LOGIC: Use Override if exists, else Tiered
  const basePricePerStudentYear = commercial.customValues?.materialPricePerYear !== undefined 
    ? commercial.customValues.materialPricePerYear 
    : basePricePerStudentYearTiered;

  const baseContractValue3Years = basePricePerStudentYear * commercial.totalStudents * 3;
  
  // 2. Infra Base Calculations
  const currentRegion = settings.regions.find(r => r.id === regionId) || settings.regions[0];
  const infraSum = selectedItems.reduce((sum, i) => sum + i.price, 0);
  
  let freightCost = 0;
  if (hasInfraItems) {
      const requiresAssembly = selectedItems.some(i => i.requiresAssembly);
      freightCost = requiresAssembly ? currentRegion.priceAssembly : currentRegion.priceSimple;
  }
  
  const totalInfraCalculated = infraSum + freightCost;
  
  // LOGIC: Use Override if exists, else Calculated
  const totalInfraGross = commercial.customValues?.infraTotal !== undefined
    ? commercial.customValues.infraTotal
    : totalInfraCalculated;

  // 3. Discount & Rate Logic
  let appliedRatePerStudentYear = 0;

  if (commercial.customValues?.materialPricePerYear !== undefined) {
      // Master Override Active: Value is absolute
      appliedRatePerStudentYear = commercial.customValues.materialPricePerYear;
  } else {
      // Standard Calculation - USE SETTINGS MARGIN
      appliedRatePerStudentYear = commercial.useMarketplace 
        ? basePricePerStudentYearTiered / settings.variables.marketplaceMargin 
        : basePricePerStudentYearTiered;
  }

  let materialDiscountAmount = 0;
  let infraDiscountAmount = 0;
  let isCalculatedMaterialBonus = false;
  
  if (commercial.contractDuration === 3) {
      const referenceContractValue = appliedRatePerStudentYear * commercial.totalStudents * 3;

      if (commercial.useMarketplace && commercial.applyInfraBonus && hasInfraItems) {
          // Scenario: Infra Bonus - USE SETTINGS VARIABLE
          const calculatedInfraBonus = referenceContractValue * settings.variables.infraBonus;
          
          if (calculatedInfraBonus > totalInfraGross) {
              infraDiscountAmount = totalInfraGross;
              const overflow = calculatedInfraBonus - totalInfraGross;
              materialDiscountAmount = overflow;
          } else {
              infraDiscountAmount = calculatedInfraBonus;
              materialDiscountAmount = 0;
          }
      } else {
          // Scenario: Standard Material Discount - USE SETTINGS VARIABLE
          const effectiveApplyInfra = commercial.applyInfraBonus && hasInfraItems && commercial.useMarketplace;
          if (!effectiveApplyInfra) {
              materialDiscountAmount = referenceContractValue * settings.variables.materialBonus;
              isCalculatedMaterialBonus = true;
          }
      }
  }

  // LOGIC: Overrides for Bonuses take precedence
  if (commercial.customValues?.materialBonus !== undefined) materialDiscountAmount = commercial.customValues.materialBonus;
  if (commercial.customValues?.infraBonus !== undefined) infraDiscountAmount = commercial.customValues.infraBonus;

  // DYNAMIC LABEL CALCULATION
  let materialBonusLabel = "Saldo Bônus Infraestrutura";
  if (isCalculatedMaterialBonus || commercial.customValues?.materialBonus !== undefined) {
      // Calculate effective Percentage and Months based on the discount amount vs Total Contract
      const totalContractValueRaw = appliedRatePerStudentYear * commercial.totalStudents * 3;
      
      if (totalContractValueRaw > 0 && materialDiscountAmount > 0) {
          const discountPct = (materialDiscountAmount / totalContractValueRaw) * 100;
          const monthsFree = (materialDiscountAmount / totalContractValueRaw) * 36;
          
          materialBonusLabel = `Bônus fidelidade ${discountPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% (${monthsFree.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses grátis)`;
      } else {
          materialBonusLabel = "Bônus fidelidade";
      }
  }


  const grossContractMaterial = appliedRatePerStudentYear * commercial.totalStudents * 3;
  const netContractMaterial = grossContractMaterial - materialDiscountAmount;
  
  const finalMaterialRatePerYear = netContractMaterial / 3 / commercial.totalStudents;
  const finalMaterialRatePerMonth = finalMaterialRatePerYear / 12;

  const totalInfraNet = totalInfraGross - infraDiscountAmount;
  const infraInstallment = totalInfraNet / 3;

  // --- CAPACITY CALCULATIONS ---
  const calculateCapacity = (category: CategoryType) => {
    let furnitureCap = 0;
    let toolCap = 0;
    const items = selectedItems.filter(i => i.category === category);
    
    // Furniture Cap logic...
    if (category === 'maker') {
        if (selectedInfraIds.includes('maker_padrao_24')) furnitureCap += 24;
        if (selectedInfraIds.includes('maker_up_12')) furnitureCap += 12;
        if (selectedInfraIds.includes('maker_up_6')) furnitureCap += 6;
    } else if (category === 'midia') {
        if (selectedInfraIds.includes('midia_padrao_24')) furnitureCap += 24;
        if (selectedInfraIds.includes('midia_up_12')) furnitureCap += 12;
        if (selectedInfraIds.includes('midia_up_6')) furnitureCap += 6;
    } else if (category === 'infantil') {
        if (selectedInfraIds.includes('infantil_padrao_18')) furnitureCap += 18;
        if (selectedInfraIds.includes('infantil_up_12')) furnitureCap += 12;
        if (selectedInfraIds.includes('infantil_up_6')) furnitureCap += 6;
    }

    toolCap = furnitureCap;
    // Restrictions logic...
    if (category === 'maker' && selectedInfraIds.includes('maker_ferr_red_18')) toolCap = 18;
    else if (category === 'maker' && selectedInfraIds.includes('maker_minima')) {
        toolCap = 24; 
        if (selectedInfraIds.includes('maker_ferr_red_18')) toolCap = 18;
    }
    if (category === 'infantil' && selectedInfraIds.includes('infantil_carrinho')) {
        toolCap = 18; 
        if (selectedInfraIds.includes('infantil_ferr_up_6')) toolCap += 6;
    }

    return { num: furnitureCap, numf: toolCap };
  };

  // --- SYMBOLS ---
  let symbolCounter = 0;
  const getNextSymbol = () => {
    const symbols = ['*', '**', '***', '****'];
    return symbols[symbolCounter++] || '*';
  };

  const materialHasMp = commercial.useMarketplace;
  const materialHasDiscount = commercial.contractDuration === 3 && !commercial.applyInfraBonus;
  const showMaterialNote = materialHasMp || materialHasDiscount;
  const materialSymbol = showMaterialNote ? getNextSymbol() : '';

  const showInfraBonusNote = commercial.contractDuration === 3 && commercial.applyInfraBonus && hasInfraItems && commercial.useMarketplace;
  const infraBonusSymbol = showInfraBonusNote ? getNextSymbol() : '';

  const showRegionNote = hasInfraItems; 
  const regionSymbol = showRegionNote ? getNextSymbol() : '';

  // --- TEXT RENDERERS ---
  const replacePlaceholders = (text: string, num: number, numf: number) => {
    return text.replace('{{num}}', num.toString()).replace('{{numf}}', numf.toString());
  };

  // --- RENDER FUNCTIONS WITH LOGIC ---
  const renderCarrinhoText = () => {
    const caps = calculateCapacity('infantil');
    const t = PROPOSAL_TEXTS.infantil_carrinho;
    return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">{t.title}</h3>
            <p className="mb-2 text-slate-600 text-sm italic">{t.subtitle}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                {t.items.map((item, idx) => (
                    <li key={idx}>{replacePlaceholders(item, caps.num, caps.numf)}</li>
                ))}
            </ul>
        </div>
    );
  };

  const renderInfantilOficinaText = () => {
      const caps = calculateCapacity('infantil');
      const t = PROPOSAL_TEXTS.infantil_oficina;
      const title = replacePlaceholders(t.title, caps.num, caps.numf);
      return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">{title}</h3>
            <p className="mb-2 text-slate-600 text-sm italic">{t.subtitle}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                 {t.items.map((item, idx) => (
                    <li key={idx}>{replacePlaceholders(item, caps.num, caps.numf)}</li>
                ))}
            </ul>
        </div>
      );
  }

  const renderMakerText = () => {
      const caps = calculateCapacity('maker');
      const isMinima = selectedInfraIds.includes('maker_minima');
      const hasReduzida = selectedInfraIds.includes('maker_ferr_red_18');
      const hasPadrao = selectedInfraIds.includes('maker_ferr_padrao');
      const hasDigitais = selectedInfraIds.includes('maker_ferr_digitais');
      const hasPC = selectedInfraIds.includes('maker_ferr_pc');

      let t = PROPOSAL_TEXTS.maker_padrao;

      // Logic to determine variant
      if (isMinima) {
          if (hasReduzida) t = PROPOSAL_TEXTS.maker_minima_reduzida;
          else if (hasPadrao) t = PROPOSAL_TEXTS.maker_minima_padrao;
          else t = PROPOSAL_TEXTS.maker_minima_solo;
      } else {
          if (hasPC && hasDigitais) t = PROPOSAL_TEXTS.maker_completa_pc;
          else if (hasDigitais) t = PROPOSAL_TEXTS.maker_completa;
          else t = PROPOSAL_TEXTS.maker_padrao;
      }
      
      const title = replacePlaceholders(t.title, caps.num, caps.numf);

      return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">{title}</h3>
            <p className="mb-2 text-slate-600 text-sm italic">{t.subtitle}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                {t.items.map((item, idx) => (
                    <li key={idx}>{replacePlaceholders(item, caps.num, caps.numf)}</li>
                ))}
            </ul>
        </div>
      );
  }

  const renderMidiaText = () => {
      const caps = calculateCapacity('midia');
      const hasPC = selectedInfraIds.includes('midia_ferr_pc');
      
      const t = hasPC ? PROPOSAL_TEXTS.midia_com_computadores : PROPOSAL_TEXTS.midia_padrao;
      const title = replacePlaceholders(t.title, caps.num, caps.numf);

      return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">{title}</h3>
            <p className="mb-2 text-slate-600 text-sm italic">{t.subtitle}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                 {t.items.map((item, idx) => (
                    <li key={idx}>{replacePlaceholders(item, caps.num, caps.numf)}</li>
                ))}
            </ul>
        </div>
      );
  }

  const hasCarrinho = selectedInfraIds.includes('infantil_carrinho');
  const hasInfantilOficina = selectedItems.some(i => i.category === 'infantil' && i.type === 'ambientacao' && i.id !== 'infantil_carrinho');
  const hasMaker = selectedItems.some(i => i.category === 'maker' && (i.type === 'ambientacao' || i.id === 'maker_minima'));
  const hasMidia = selectedItems.some(i => i.category === 'midia' && i.type === 'ambientacao');

  const CustomCheckbox = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) => (
    <div onClick={onChange} className="flex items-center gap-2 cursor-pointer group select-none">
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-[#8BBF56] border-[#8BBF56] text-white' : 'bg-white border-slate-300 group-hover:border-[#8BBF56]'}`}>
            {checked ? <CheckSquare className="w-4 h-4" /> : null}
        </div>
        <span className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
    </div>
  );

   const BrandLogo = ({ className = "" }: { className?: string }) => (
    <div className={`relative overflow-hidden ${className}`}>
        <img src="https://littlemaker.com.br/logo_lm-2/" alt="Little Maker" className="w-full h-full object-contain object-center" />
    </div>
  );

  // --- EDITABLE FIELD COMPONENT ---
  const EditableCurrency = ({ 
    value, 
    fieldId, 
    onUpdate 
  }: { 
    value: number; 
    fieldId: string; 
    onUpdate: (val: number) => void;
  }) => {
      const isEditing = editingField === fieldId;
      const [localVal, setLocalVal] = useState(value.toString());

      const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
              onUpdate(parseFloat(localVal) || 0);
              setEditingField(null);
          }
      };

      const handleBlur = () => {
          onUpdate(parseFloat(localVal) || 0);
          setEditingField(null);
      };

      if (isEditing) {
          return (
              <input
                autoFocus
                type="number"
                value={localVal}
                onChange={(e) => setLocalVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-24 px-1 py-0.5 text-right font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#8BBF56] outline-none"
              />
          );
      }

      return (
          <span className="cursor-default">
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
      );
  };


  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-y-auto">
      
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm print:hidden">
         <div className="flex items-center gap-4">
            <CustomCheckbox checked={commercial.contractDuration === 3} onChange={toggleContract} label="Contrato de 3 anos" />
            <CustomCheckbox checked={commercial.useMarketplace} onChange={toggleMarketplace} label="Usar Market Place" />
            {commercial.useMarketplace && commercial.contractDuration === 3 && hasInfraItems && (
                <CustomCheckbox checked={commercial.applyInfraBonus} onChange={toggleBonus} label="Bônus na infraestrutura" />
            )}
         </div>
         <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-[#8BBF56] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#7aa84b] transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Baixar PDF
         </button>
      </div>

      {/* Main Document View */}
      <div className="flex-1 p-8 print:p-0 flex justify-center">
        <div id="proposal-content" className="w-[210mm] bg-white min-h-[297mm] shadow-2xl print:shadow-none p-12 print:p-8 flex flex-col relative print:w-full">
          
          {/* Header */}
          <div className="mb-8">
             <div className="flex justify-between items-center gap-4 mb-6">
                 <div className="w-[20%]"><BrandLogo className="w-full aspect-[2.5/1]" /></div>
                 <div className="flex-1 text-right">
                    <h1 className="text-2xl font-bold text-slate-800">Proposta Comercial - {appState.client.schoolName || 'Nome da Escola'}</h1>
                 </div>
             </div>
             <div className="flex justify-between items-end border-b-[4px] border-[#8BBF56] pb-2">
                <div>
                   <span className="text-slate-500 text-sm mr-2">A/C:</span>
                   <span className="text-slate-800 font-bold text-lg">{appState.client.contactName || 'Responsável'}</span>
                </div>
                <div className="text-slate-600 font-medium">
                   {new Date(appState.client.date).toLocaleDateString('pt-BR')}
                </div>
             </div>
          </div>

          {/* MATERIAL DO ALUNO SECTION */}
          <div className="mb-10">
             <div className="bg-[#8BBF56] text-white font-bold px-4 py-3 text-lg mb-0 rounded-t-lg">Material do Aluno</div>
             <div className="border border-slate-200 border-t-0 rounded-b-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] text-sm">
                    {/* Alunos */}
                    <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100 flex items-center">Total de Alunos</div>
                    <div className="py-2 px-4 text-right bg-white border-b border-slate-100">
                        <input type="number" value={commercial.totalStudents} onChange={(e) => updateStudents(parseInt(e.target.value) || 0)} className="bg-slate-50 text-slate-900 text-right font-bold w-20 py-1 px-1 outline-none focus:bg-white focus:ring-1 focus:ring-[#8BBF56] rounded transition-all border border-transparent hover:border-slate-200" />
                    </div>

                    {/* Investimento Ano - Editable by Master */}
                    <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100 flex items-center gap-2 group">
                        Investimento Aluno/ano {materialSymbol}
                        {isMaster && (
                            <button onClick={() => setEditingField('materialPricePerYear')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded">
                                <Edit3 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>
                    <div className="py-3 px-4 text-right font-bold text-slate-900 border-b border-slate-100">
                        {isMaster ? (
                            <EditableCurrency 
                                fieldId="materialPricePerYear"
                                value={appliedRatePerStudentYear}
                                onUpdate={(val) => updateOverride('materialPricePerYear', val)}
                            />
                        ) : (
                            appliedRatePerStudentYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        )}
                    </div>

                    {/* Investimento Mês - Calculated */}
                    <div className="bg-[#EBF5E0] py-4 px-4 font-bold text-base text-slate-900 border-b border-white">Investimento Aluno/mês {materialSymbol}</div>
                    <div className="bg-[#EBF5E0] py-4 px-4 text-right font-bold text-xl text-slate-900 border-b border-white">
                        {finalMaterialRatePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    
                    {/* Bonus - Editable by Master */}
                    {materialDiscountAmount > 0 && (
                        <>
                            <div className="py-2 px-4 font-medium text-slate-500 bg-white flex items-center gap-2 group">
                                {materialBonusLabel}
                                {isMaster && (
                                    <button onClick={() => setEditingField('materialBonus')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded">
                                        <Edit3 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                                    </button>
                                )}
                            </div>
                            <div className="py-2 px-4 text-right font-bold text-[#8BBF56] bg-white flex justify-end">
                                {isMaster ? (
                                    <EditableCurrency 
                                        fieldId="materialBonus"
                                        value={materialDiscountAmount}
                                        onUpdate={(val) => updateOverride('materialBonus', val)}
                                    />
                                ) : (
                                    materialDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                )}
                            </div>
                        </>
                    )}
                </div>
             </div>
          </div>

          {/* INFRAESTRUTURA SECTION */}
          {hasInfraItems && (
            <div className="mb-12">
                <div className="bg-[#8BBF56] text-white font-bold px-4 py-3 text-lg mb-0 rounded-t-lg">Infraestrutura (Oficina e Ferramentas)</div>
                <div className="border border-slate-200 border-t-0 rounded-b-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-sm">
                        
                        {/* Investimento Infra Total - Editable by Master */}
                        <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100 flex items-center gap-2 group">
                            Investimento Infraestrutura {regionSymbol}
                            {isMaster && (
                                <button onClick={() => setEditingField('infraTotal')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded">
                                    <Edit3 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                                </button>
                            )}
                        </div>
                        <div className="py-3 px-4 text-right font-medium text-slate-900 border-b border-slate-100 bg-white">
                             {isMaster ? (
                                <EditableCurrency 
                                    fieldId="infraTotal"
                                    value={totalInfraGross}
                                    onUpdate={(val) => updateOverride('infraTotal', val)}
                                />
                            ) : (
                                totalInfraGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            )}
                        </div>

                        {/* Desconto Infra - Editable by Master */}
                        {infraDiscountAmount > 0 && (
                            <>
                                <div className="py-2 px-4 font-medium text-slate-700 border-b border-slate-100 flex items-center gap-2 group">
                                    Desconto do bônus fidelidade {infraBonusSymbol}
                                    {isMaster && (
                                        <button onClick={() => setEditingField('infraBonus')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded">
                                            <Edit3 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                                        </button>
                                    )}
                                </div>
                                <div className="py-2 px-4 text-right font-bold text-[#8BBF56] border-b border-slate-100 bg-white flex justify-end">
                                    {isMaster ? (
                                        <div className="flex items-center gap-1 text-[#8BBF56]">
                                            - <EditableCurrency 
                                                fieldId="infraBonus"
                                                value={infraDiscountAmount}
                                                onUpdate={(val) => updateOverride('infraBonus', val)}
                                            />
                                        </div>
                                    ) : (
                                        `- ${infraDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                    )}
                                </div>
                            </>
                        )}

                        {/* Total Final */}
                        <div className="py-3 px-4 font-bold text-slate-900 border-b border-slate-100">Total Infraestrutura (único no contrato)</div>
                        <div className="py-3 px-4 text-right font-bold text-lg text-slate-900 border-b border-slate-100 bg-white">
                            {totalInfraNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>

                        {/* Parcelamento */}
                        <div className="bg-[#EBF5E0] py-4 px-4 font-bold text-base text-slate-900">Parcelamento em 3x</div>
                        <div className="bg-[#EBF5E0] py-4 px-4 text-right font-bold text-xl text-slate-900">
                            {infraInstallment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* DETALHAMENTO */}
          <div className="mb-10 break-inside-avoid">
             {hasCarrinho && renderCarrinhoText()}
             {hasInfantilOficina && renderInfantilOficinaText()}
             {hasMaker && renderMakerText()}
             {hasMidia && renderMidiaText()}
          </div>

          {/* Footer Notes */}
          <div className="mt-auto pt-8 border-t border-slate-200">
              <div className="text-[10px] text-slate-500 space-y-1">
                {showMaterialNote && (
                    <p>{materialSymbol} {
                        materialHasMp && materialHasDiscount 
                        ? "Margem operacional do parceiro de market place inclusa e desconto para contrato de 3 anos aplicado no valor."
                        : materialHasMp
                            ? "Margem operacional do parceiro de market place inclusa no valor."
                            : "Desconto para contrato de 3 anos aplicado no valor do material do aluno ao longo de todo o contrato."
                    }</p>
                )}
                
                {showInfraBonusNote && (
                    <>
                        <p>{infraBonusSymbol} Desconto para contrato de 3 anos aplicado no valor da infraestrutura. É necessário comprovar quantitativo de aluno atual equivalente à proposta.</p>
                    </>
                )}
                {showRegionNote && <p>{regionSymbol} Região de entrega considerada: <strong>{currentRegion.label}</strong>.</p>}
                <p className="pt-2 font-medium text-slate-600">Proposta válida por 30 dias a partir da data de emissão.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};