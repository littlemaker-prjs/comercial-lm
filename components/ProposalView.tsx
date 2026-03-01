import React, { useState } from 'react';
import { AppState, CategoryType } from '../types';
import { Download, CheckSquare, Edit3, Presentation, Loader2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { PROPOSAL_TEXTS, INFRA_DETAILS, AMBIENTATION_IMAGES } from '../constants';
import PptxGenJS from 'pptxgenjs';
import { auth, googleProvider } from '../firebase';
import { createGoogleSlidePresentation } from '../utils/googleSlides';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

interface ProposalViewProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onSave?: (redirect?: boolean) => void;
  isSaving?: boolean;
  user?: any;
  isMaster: boolean;
  googleAccessToken?: string | null;
}

export const ProposalView: React.FC<ProposalViewProps> = ({ appState, setAppState, onSave, isSaving, user, isMaster, googleAccessToken }) => {
  const { settings } = useSettings();
  const { selectedInfraIds, regionId, commercial } = appState;
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);

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
            customValues: { ...prev.commercial.customValues, materialBonus: undefined, infraBonus: undefined }
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
                customValues: { ...prev.commercial.customValues, materialBonus: undefined, infraBonus: undefined }
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
            customValues: { ...prev.commercial.customValues, materialBonus: undefined, infraBonus: undefined }
        }
    }));
  };

  const updateStudents = (val: number) => {
    setAppState(prev => ({ ...prev, commercial: { ...prev.commercial, totalStudents: val } }));
  };

  const updateOverride = (field: keyof NonNullable<typeof commercial.customValues>, value: number) => {
      setAppState(prev => ({
          ...prev,
          commercial: {
              ...prev.commercial,
              customValues: { ...prev.commercial.customValues, [field]: value }
          }
      }));
  };

  // --- CALCULATIONS (Replicated for View & PPTX) ---
  const getBaseMaterialPrice = (students: number) => {
    if (students >= 800) return 240;
    if (students >= 400) return 280;
    if (students >= 200) return 350;
    if (students >= 100) return 480;
    return 650;
  };

  const basePricePerStudentYearTiered = getBaseMaterialPrice(commercial.totalStudents);
  const basePricePerStudentYear = commercial.customValues?.materialPricePerYear !== undefined 
    ? commercial.customValues.materialPricePerYear 
    : basePricePerStudentYearTiered;
  
  const currentRegion = settings.regions.find(r => r.id === regionId) || settings.regions[0];
  const infraSum = selectedItems.reduce((sum, i) => sum + i.price, 0);
  let freightCost = 0;
  if (hasInfraItems) {
      const requiresAssembly = selectedItems.some(i => i.requiresAssembly);
      freightCost = requiresAssembly ? currentRegion.priceAssembly : currentRegion.priceSimple;
  }
  const totalInfraCalculated = infraSum + freightCost;
  const totalInfraGross = commercial.customValues?.infraTotal !== undefined ? commercial.customValues.infraTotal : totalInfraCalculated;

  let appliedRatePerStudentYear = 0;
  if (commercial.customValues?.materialPricePerYear !== undefined) {
      appliedRatePerStudentYear = commercial.customValues.materialPricePerYear;
  } else {
      appliedRatePerStudentYear = commercial.useMarketplace 
        ? basePricePerStudentYearTiered / settings.variables.marketplaceMargin 
        : basePricePerStudentYearTiered;
  }

  let materialDiscountAmount = 0;
  let infraDiscountAmount = 0;
  
  if (commercial.contractDuration === 3) {
      const referenceContractValue = appliedRatePerStudentYear * commercial.totalStudents * 3;
      if (commercial.useMarketplace && commercial.applyInfraBonus && hasInfraItems) {
          const calculatedInfraBonus = referenceContractValue * settings.variables.infraBonus;
          if (calculatedInfraBonus > totalInfraGross) {
              infraDiscountAmount = totalInfraGross;
              materialDiscountAmount = calculatedInfraBonus - totalInfraGross;
          } else {
              infraDiscountAmount = calculatedInfraBonus;
              materialDiscountAmount = 0;
          }
      } else {
          const effectiveApplyInfra = commercial.applyInfraBonus && hasInfraItems && commercial.useMarketplace;
          if (!effectiveApplyInfra) {
              materialDiscountAmount = referenceContractValue * settings.variables.materialBonus;
          }
      }
  }

  if (commercial.customValues?.materialBonus !== undefined) materialDiscountAmount = commercial.customValues.materialBonus;
  if (commercial.customValues?.infraBonus !== undefined) infraDiscountAmount = commercial.customValues.infraBonus;

  const grossContractMaterial = appliedRatePerStudentYear * commercial.totalStudents * 3;
  const netContractMaterial = grossContractMaterial - materialDiscountAmount;
  const finalMaterialRatePerYear = netContractMaterial / 3 / commercial.totalStudents;
  const finalMaterialRatePerMonth = finalMaterialRatePerYear / 12;
  const totalInfraNet = totalInfraGross - infraDiscountAmount;
  const infraInstallment = totalInfraNet / 3;

  // Bonus Text Formatting
  const materialBonusPercent = (settings.variables.materialBonus * 100).toFixed(0);
  const materialBonusMonths = (settings.variables.materialBonus * 36).toFixed(0);
  const materialBonusText = `Bônus fidelidade desc ${materialBonusPercent}% (${materialBonusMonths} meses grátis)`;

  const infraBonusPercent = (settings.variables.infraBonus * 100).toFixed(0);
  const infraBonusText = `Bônus fidelidade desc ${infraBonusPercent}%`;

  // Bundle Calculations for passing to API
  const calculationData = {
      totalStudents: commercial.totalStudents,
      totalMaterialYear: grossContractMaterial / 3, // Normalized year value
      totalInfra: totalInfraGross,
      // Added fields for consistency
      appliedRatePerStudentYear,
      finalMaterialRatePerMonth,
      finalMaterialRatePerYear, // Added for Slides
      materialDiscountAmount,
      infraDiscountAmount,
      totalInfraNet,
      infraInstallment,
      commercial: appState.commercial, // Pass full commercial state for flags
      hasInfraItems,
      materialBonusText, // Added for Slides
      infraBonusText // Added for Slides
  };

  // --- CAPACITY HELPERS ---
  const calculateCapacity = (category: CategoryType) => {
    let furnitureCap = 0;
    let toolCap = 0;
    const items = selectedItems.filter(i => i.category === category);
    
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
    if (category === 'maker' && selectedInfraIds.includes('maker_ferr_red_18')) toolCap = 18;
    else if (category === 'maker' && selectedInfraIds.includes('maker_minima')) {
        toolCap = 24; 
        if (selectedInfraIds.includes('maker_ferr_red_18')) toolCap = 18;
    }
    if (category === 'infantil' && selectedInfraIds.includes('infantil_carrinho')) {
        toolCap = 18; 
        if (selectedInfraIds.includes('infantil_ferr_up_6')) toolCap += 6;
        if (selectedInfraIds.includes('infantil_ferr_up_12')) toolCap += 12;
    }
    return { num: furnitureCap, numf: toolCap };
  };

  const replacePlaceholders = (text: string, num: number, numf: number) => {
    return text.replace(/{{num}}/g, num.toString()).replace(/{{numf}}/g, numf.toString());
  };

  // --- GOOGLE SLIDES GENERATION ---
  const handleGoogleSlidesGeneration = async () => {
    setIsGeneratingSlides(true);
    try {
        // Auto-save before generating slides (no redirect)
        if (onSave) {
            await onSave(false);
        }

        const getFreshToken = async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/presentations');
            provider.addScope('https://www.googleapis.com/auth/drive.file');
            
            const result = await auth.signInWithPopup(provider);
            const credential = result.credential as any;
            const token = credential?.accessToken;

            if (token) {
                sessionStorage.setItem('googleAccessToken', token);
                sessionStorage.setItem('googleTokenTimestamp', Date.now().toString());
            }
            return token;
        };

        const isTokenExpired = () => {
            const timestamp = sessionStorage.getItem('googleTokenTimestamp');
            if (!timestamp) return true;
            const now = Date.now();
            const diff = now - parseInt(timestamp);
            return diff > 50 * 60 * 1000; // 50 minutes (safety margin)
        };

        let accessToken = googleAccessToken || sessionStorage.getItem('googleAccessToken');

        // Proactive check
        if (!accessToken || isTokenExpired()) {
            accessToken = await getFreshToken();
        }

        if (!accessToken) throw new Error("Não foi possível obter permissão de acesso.");

        // 2. Call Generator Service
        const consultantName = user?.displayName || appState.client.consultantName || "Consultor";
        
        const stateToPass = {
            ...appState,
            client: {
                ...appState.client,
                consultantName: consultantName
            }
        };

        try {
            const editUrl = await createGoogleSlidePresentation(accessToken, stateToPass, calculationData);
            window.open(editUrl, '_blank');
        } catch (error: any) {
            // Reactive check: if unauthorized, try one more time with a fresh token
            if (error.message?.includes('401') || error.message?.includes('unauthorized') || error.message?.includes('authenticated')) {
                console.log("Token expired (401), attempting refresh...");
                accessToken = await getFreshToken();
                if (accessToken) {
                    const editUrl = await createGoogleSlidePresentation(accessToken, stateToPass, calculationData);
                    window.open(editUrl, '_blank');
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

    } catch (error: any) {
        console.error("Google Slides Error:", error);
        alert(`Erro ao gerar slides: ${error.message}`);
    } finally {
        setIsGeneratingSlides(false);
    }
  };


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
        <img src="https://littlemaker.com.br/wp-content/uploads/2026/02/logo_lm.png" alt="Little Maker" className="w-full h-full object-contain object-center" />
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

  // --- VIEW RENDER HELPERS ---

  const hasCarrinho = selectedInfraIds.includes('infantil_carrinho');
  const hasInfantilOficina = selectedInfraIds.includes('infantil_padrao_18');
  const hasMaker = selectedItems.some(i => i.category === 'maker');
  const hasMidia = selectedItems.some(i => i.category === 'midia');

  // Dynamic Asterisk Logic
  const materialHasMp = commercial.useMarketplace;
  const materialHasDiscount = commercial.contractDuration === 3 && !commercial.applyInfraBonus;
  const showMaterialNote = materialHasMp || materialHasDiscount;
  
  const showInfraBonusNote = commercial.contractDuration === 3 && commercial.applyInfraBonus && hasInfraItems && commercial.useMarketplace;
  const showRegionNote = hasInfraItems;

  let symbolCounter = 1;
  const getNextSymbol = () => '*'.repeat(symbolCounter++);

  const materialSymbol = showMaterialNote ? getNextSymbol() : '';
  const regionSymbol = showRegionNote ? getNextSymbol() : '';
  const infraBonusSymbol = showInfraBonusNote ? getNextSymbol() : '';
  
  const renderScopeItem = (title: string, subtitle: string, items: string[]) => (
      <div className="mb-6 break-inside-avoid">
          <h3 className="font-bold text-slate-800 text-lg border-b border-slate-200 pb-1 mb-2">{title}</h3>
          <p className="text-slate-500 text-sm italic mb-2">{subtitle}</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {items.map((it, idx) => <li key={idx}>{it}</li>)}
          </ul>
      </div>
  );

  const renderCarrinhoText = () => {
      const caps = calculateCapacity('infantil');
      const t = PROPOSAL_TEXTS.infantil_carrinho;
      return renderScopeItem(
          replacePlaceholders(t.title, caps.num, caps.numf),
          t.subtitle,
          t.items.map(i => replacePlaceholders(i, caps.num, caps.numf))
      );
  };

  const renderInfantilOficinaText = () => {
      const caps = calculateCapacity('infantil');
      const t = PROPOSAL_TEXTS.infantil_oficina;
      return renderScopeItem(
          replacePlaceholders(t.title, caps.num, caps.numf),
          t.subtitle,
          t.items.map(i => replacePlaceholders(i, caps.num, caps.numf))
      );
  };

  const renderMakerText = () => {
      const caps = calculateCapacity('maker');
      const isMinima = selectedInfraIds.includes('maker_minima');
      const hasReduzida = selectedInfraIds.includes('maker_ferr_red_18');
      const hasPadrao = selectedInfraIds.includes('maker_ferr_padrao');
      const hasDigitais = selectedInfraIds.includes('maker_ferr_digitais');
      const hasPC = selectedInfraIds.includes('maker_ferr_pc');
      
      let t = PROPOSAL_TEXTS.maker_padrao;
      if (isMinima) {
          if (hasReduzida) t = PROPOSAL_TEXTS.maker_minima_reduzida;
          else if (hasPadrao) t = PROPOSAL_TEXTS.maker_minima_padrao;
          else t = PROPOSAL_TEXTS.maker_minima_solo;
      } else {
          if (hasPC && hasDigitais) t = PROPOSAL_TEXTS.maker_completa_pc;
          else if (hasDigitais) t = PROPOSAL_TEXTS.maker_completa;
          else t = PROPOSAL_TEXTS.maker_padrao;
      }

      return renderScopeItem(
          replacePlaceholders(t.title, caps.num, caps.numf),
          t.subtitle,
          t.items.map(i => replacePlaceholders(i, caps.num, caps.numf))
      );
  };

  const renderMidiaText = () => {
      const caps = calculateCapacity('midia');
      const hasPC = selectedInfraIds.includes('midia_ferr_pc');
      const t = hasPC ? PROPOSAL_TEXTS.midia_com_computadores : PROPOSAL_TEXTS.midia_padrao;

      return renderScopeItem(
          replacePlaceholders(t.title, caps.num, caps.numf),
          t.subtitle,
          t.items.map(i => replacePlaceholders(i, caps.num, caps.numf))
      );
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-y-auto">
      
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row justify-between items-center shadow-sm print:hidden gap-4">
         <div className="flex items-center gap-4 flex-wrap">
            <CustomCheckbox checked={commercial.contractDuration === 3} onChange={toggleContract} label="Contrato de 3 anos" />
            <CustomCheckbox checked={commercial.useMarketplace} onChange={toggleMarketplace} label="Usar Market Place" />
            {commercial.useMarketplace && commercial.contractDuration === 3 && hasInfraItems && (
                <CustomCheckbox checked={commercial.applyInfraBonus} onChange={toggleBonus} label="Bônus na infraestrutura" />
            )}
         </div>
         <div className="flex gap-2">
            <button 
                onClick={handleGoogleSlidesGeneration} 
                disabled={isGeneratingSlides}
                className="flex items-center gap-2 bg-[#F24E1E] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#d43d10] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait"
            >
                {isGeneratingSlides ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                {isGeneratingSlides ? 'Gerando...' : 'Gerar Google Slides'}
            </button>
         </div>
      </div>

      {/* Main Document View (PREVIEW HTML) */}
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
                    <div className="py-2 px-4 text-right bg-white border-b border-slate-100 print:py-3 print:px-4 print:font-bold">
                        <div className="print:hidden">
                            <input type="number" value={commercial.totalStudents} onChange={(e) => updateStudents(parseInt(e.target.value) || 0)} className="bg-slate-50 text-slate-900 text-right font-bold w-20 py-1 px-1 outline-none focus:bg-white focus:ring-1 focus:ring-[#8BBF56] rounded transition-all border border-transparent hover:border-slate-200" />
                        </div>
                        <div className="hidden print:block">{commercial.totalStudents}</div>
                    </div>

                    {/* Investimento Ano - Editable by Master */}
                    <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100 flex items-center gap-2 group">
                        Investimento Aluno/ano {materialSymbol}
                        {isMaster && (
                            <button onClick={() => setEditingField('materialPricePerYear')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded print:hidden">
                                <Edit3 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>
                    <div className="py-3 px-4 text-right font-bold text-slate-900 border-b border-slate-100">
                        {isMaster ? (
                            <EditableCurrency 
                                fieldId="materialPricePerYear"
                                value={finalMaterialRatePerYear}
                                onUpdate={(val) => updateOverride('materialPricePerYear', val)}
                            />
                        ) : (
                            finalMaterialRatePerYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
                                {materialBonusText}
                                {isMaster && (
                                    <button onClick={() => setEditingField('materialBonus')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded print:hidden">
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
                                    `- ${materialDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
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
                                <button onClick={() => setEditingField('infraTotal')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded print:hidden">
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
                                    {infraBonusText} {infraBonusSymbol}
                                    {isMaster && (
                                        <button onClick={() => setEditingField('infraBonus')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded print:hidden">
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

          {/* ESCOPO MACRO */}
          <div className="mb-10 break-inside-avoid">
             {hasCarrinho && renderCarrinhoText()}
             {hasInfantilOficina && renderInfantilOficinaText()}
             {hasMaker && renderMakerText()}
             {hasMidia && renderMidiaText()}
          </div>

          {/* Footer Notes (Page 1) */}
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

          <div className="text-center mt-12 text-slate-400 text-sm border-t pt-4 print:hidden">
              <p>Esta é uma visualização simplificada. Gere em Google Slides para salvar a opção detalhada.</p>
          </div>

        </div>
      </div>
    </div>
  );
};