import React from 'react';
import { AppState, CategoryType } from '../types';
import { INFRA_CATALOG, REGIONS } from '../constants';
import { Download, CheckSquare, Save, Loader2 } from 'lucide-react';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

interface ProposalViewProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onSave?: () => void;
  isSaving?: boolean;
}

export const ProposalView: React.FC<ProposalViewProps> = ({ appState, setAppState, onSave, isSaving }) => {
  const { selectedInfraIds, regionId, commercial } = appState;
  
  // --- HELPERS ---
  const selectedItems = INFRA_CATALOG.filter(i => selectedInfraIds.includes(i.id));
  const hasInfraItems = selectedItems.length > 0;

  // --- CONFIGURATION HANDLERS ---
  const toggleContract = () => {
    setAppState(prev => ({
        ...prev,
        commercial: { ...prev.commercial, contractDuration: prev.commercial.contractDuration === 3 ? 1 : 3 }
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
                // If turning off MP, also turn off Infra Bonus as it depends on MP
                applyInfraBonus: newVal ? prev.commercial.applyInfraBonus : false 
            }
        };
    });
  };

  const toggleBonus = () => {
    setAppState(prev => ({
        ...prev,
        commercial: { ...prev.commercial, applyInfraBonus: !prev.commercial.applyInfraBonus }
    }));
  };

  const updateStudents = (val: number) => {
    setAppState(prev => ({
        ...prev,
        commercial: { ...prev.commercial, totalStudents: val }
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

    // Use the injected library
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
    return 650; // Base for 50 or less
  };

  const basePricePerStudentYear = getBaseMaterialPrice(commercial.totalStudents);
  const baseContractValue3Years = basePricePerStudentYear * commercial.totalStudents * 3;
  
  // 2. Infra Base Calculations
  const currentRegion = REGIONS.find(r => r.id === regionId) || REGIONS[0];
  const infraSum = selectedItems.reduce((sum, i) => sum + i.price, 0);
  
  let freightCost = 0;
  if (hasInfraItems) {
      const requiresAssembly = selectedItems.some(i => i.requiresAssembly);
      freightCost = requiresAssembly ? currentRegion.priceAssembly : currentRegion.priceSimple;
  }
  
  const totalInfraGross = infraSum + freightCost;

  // 3. Discount & Rate Logic
  // Formula: Base / 0.83 if Marketplace
  const appliedRatePerStudentYear = commercial.useMarketplace 
    ? basePricePerStudentYear / 0.83 
    : basePricePerStudentYear;

  let materialDiscountAmount = 0;
  let infraDiscountAmount = 0;
  let materialBonusLabel = "Bônus fidelidade 25% (9 meses grátis)";
  
  if (commercial.contractDuration === 3) {
      if (commercial.useMarketplace && commercial.applyInfraBonus && hasInfraItems) {
          // Scenario: Infra Bonus (15% of TOTAL CONTRACT) applied to Infra
          const calculatedInfraBonus = baseContractValue3Years * 0.15;
          
          if (calculatedInfraBonus > totalInfraGross) {
              // OVERFLOW: Bonus is bigger than Infra cost
              infraDiscountAmount = totalInfraGross; // Infra becomes 0
              const overflow = calculatedInfraBonus - totalInfraGross;
              materialDiscountAmount = overflow; // Apply remainder to material
              materialBonusLabel = "Saldo Bônus Infraestrutura";
          } else {
              // Normal case: Bonus fits in Infra
              infraDiscountAmount = calculatedInfraBonus;
              materialDiscountAmount = 0;
          }

      } else {
          // Scenario: Standard Material Discount (25%)
          // Only apply if NOT using infra bonus
          // Also check if checkbox is logically false (even if state is true, if hasInfraItems is false, treat as false)
          const effectiveApplyInfra = commercial.applyInfraBonus && hasInfraItems;
          
          if (!effectiveApplyInfra) {
              materialDiscountAmount = baseContractValue3Years * 0.25;
          }
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
    
    // 1. Calculate Furniture Capacity (Ambientação)
    if (category === 'maker') {
        if (selectedInfraIds.includes('maker_padrao_24')) furnitureCap += 24;
        if (selectedInfraIds.includes('maker_up_12')) furnitureCap += 12;
        if (selectedInfraIds.includes('maker_up_6')) furnitureCap += 6;
        // Minima does not add specific numeric capacity
    } else if (category === 'midia') {
        if (selectedInfraIds.includes('midia_padrao_24')) furnitureCap += 24;
        if (selectedInfraIds.includes('midia_up_12')) furnitureCap += 12;
        if (selectedInfraIds.includes('midia_up_6')) furnitureCap += 6;
    } else if (category === 'infantil') {
        if (selectedInfraIds.includes('infantil_padrao_18')) furnitureCap += 18;
        if (selectedInfraIds.includes('infantil_up_12')) furnitureCap += 12;
        if (selectedInfraIds.includes('infantil_up_6')) furnitureCap += 6;
        // Carrinho has no furniture capacity
    }

    // 2. Calculate Tool Capacity (Ferramentas)
    // Default: Tool capacity follows furniture capacity unless specific restrictions apply
    toolCap = furnitureCap;

    // RESTRICTIONS & SPECIAL CASES
    
    // Maker: Ferramentas Reduzidas limits to 18
    if (category === 'maker' && selectedInfraIds.includes('maker_ferr_red_18')) {
        toolCap = 18;
    } 
    // Maker: Minima has no furniture limit, so toolCap depends on base logic or is just standard (24) if not reduced
    else if (category === 'maker' && selectedInfraIds.includes('maker_minima')) {
        toolCap = 24; // Default standard tools capacity
        if (selectedInfraIds.includes('maker_ferr_red_18')) toolCap = 18;
    }

    // Infantil: Carrinho limits based on tools (Base 18 + Upgrade 6)
    if (category === 'infantil' && selectedInfraIds.includes('infantil_carrinho')) {
        toolCap = 18; // Base tools
        if (selectedInfraIds.includes('infantil_ferr_up_6')) toolCap += 6;
    }

    return { num: furnitureCap, numf: toolCap };
  };

  // --- NOTE SYMBOL LOGIC ---
  let symbolCounter = 0;
  const getNextSymbol = () => {
    const symbols = ['*', '**', '***', '****'];
    return symbols[symbolCounter++] || '*';
  };

  // 1. Material Note Logic (Investimento Aluno)
  // Logic: Show symbol if Marketplace is ON OR (3 Years is ON AND No Infra Bonus)
  const materialHasMp = commercial.useMarketplace;
  const materialHasDiscount = commercial.contractDuration === 3 && !commercial.applyInfraBonus;
  
  const showMaterialNote = materialHasMp || materialHasDiscount;
  const materialSymbol = showMaterialNote ? getNextSymbol() : '';

  // 2. Infra Bonus Note Logic (Discount on Infra)
  const showInfraBonusNote = commercial.contractDuration === 3 && commercial.applyInfraBonus && hasInfraItems;
  const infraBonusSymbol = showInfraBonusNote ? getNextSymbol() : '';

  // 3. Region Note Logic (Infra Investment)
  const showRegionNote = hasInfraItems; 
  const regionSymbol = showRegionNote ? getNextSymbol() : '';


  // --- TEXT GENERATION HANDLERS ---
  const renderCarrinhoText = () => {
    const caps = calculateCapacity('infantil');
    return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">Carrinho Educação Infantil</h3>
            <p className="mb-2 text-slate-600 text-sm italic">Tudo que a EI precisa com flexibilidade total</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                <li>Caixas de Exploração Exclusiva</li>
                <li>Eletrônicos Infantil Exclusiva</li>
                <li>Ferramentas Diversas para turmas de até <strong>{caps.numf} alunos</strong></li>
            </ul>
        </div>
    );
  };

  const renderInfantilOficinaText = () => {
      const caps = calculateCapacity('infantil');
      return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">
                Oficina Kids - {caps.num} alunos
            </h3>
            <p className="mb-2 text-slate-600 text-sm italic">Ambientação de oficina temática para educação infantil</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                <li>Conjunto de ferramentas Kids completa</li>
                <li>Bancadas e cadeiras ergonômicas</li>
                <li>Armários organizadores baixos</li>
                <li>Tapete de atividades</li>
                <li>Adequada para turmas de até <strong>{caps.numf} alunos</strong></li>
            </ul>
        </div>
      );
  }

  const renderMakerText = () => {
      const caps = calculateCapacity('maker');
      const isMinima = selectedInfraIds.includes('maker_minima');
      const title = isMinima 
        ? "Oficina Maker - Ambientação Básica" 
        : `Oficina Maker Completa - ${caps.num} alunos`;

      return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">{title}</h3>
            <p className="mb-2 text-slate-600 text-sm italic">Ambientação de oficina temática com ferramentas completas</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                <li>Conjunto de ferramentas Maker completa</li>
                <li>Inclui impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit 60 módulos eletrônicos, expansão microbit (programável), ferramentas manuais e muito mais</li>
                <li>Adequada para turmas de até <strong>{caps.numf} alunos</strong></li>
                <li>Requer 4 laptops/chromebook (não inclusos)</li>
            </ul>
        </div>
      );
  }

  const renderMidiaText = () => {
      const caps = calculateCapacity('midia');
      return (
        <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 mb-1 border-b border-slate-200 pb-1">
                Sala de Mídia Completa - {caps.num} alunos
            </h3>
            <p className="mb-2 text-slate-600 text-sm italic">Ambientação de sala temática completa</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                <li>Conjunto de ferramentas Mídia completa</li>
                <li>Inclui Câmeras, Tripés, Iluminação, Chroma key, Microfones e softwares de edição</li>
                <li>Adequada para turmas de até <strong>{caps.numf} alunos</strong></li>
                <li>Requer 4 laptops/chromebook (não inclusos)</li>
            </ul>
        </div>
      );
  }

  // Detect which blocks to show
  const hasCarrinho = selectedInfraIds.includes('infantil_carrinho');
  const hasInfantilOficina = selectedItems.some(i => i.category === 'infantil' && i.type === 'ambientacao' && i.id !== 'infantil_carrinho');
  const hasMaker = selectedItems.some(i => i.category === 'maker' && i.type === 'ambientacao');
  const hasMidia = selectedItems.some(i => i.category === 'midia' && i.type === 'ambientacao');

  const CustomCheckbox = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) => (
    <div onClick={onChange} className="flex items-center gap-2 cursor-pointer group select-none">
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            checked 
            ? 'bg-[#8BBF56] border-[#8BBF56] text-white' 
            : 'bg-white border-slate-300 group-hover:border-[#8BBF56]'
        }`}>
            {checked ? <CheckSquare className="w-4 h-4" /> : null}
        </div>
        <span className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
    </div>
  );

   // PNG Logo Component with Cropping Logic
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
    <div className="h-full flex flex-col bg-slate-100 overflow-y-auto">
      
      {/* Toolbar - Actions (Not printed) */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm print:hidden">
         <div className="flex items-center gap-4">
            <CustomCheckbox 
                checked={commercial.contractDuration === 3} 
                onChange={toggleContract} 
                label="Contrato de 3 anos" 
            />
            <CustomCheckbox 
                checked={commercial.useMarketplace} 
                onChange={toggleMarketplace} 
                label="Usar Market Place" 
            />
            {/* ONLY SHOW INFRA BONUS OPTION IF INFRA EXISTS */}
            {commercial.useMarketplace && hasInfraItems && (
                <CustomCheckbox 
                    checked={commercial.applyInfraBonus} 
                    onChange={toggleBonus} 
                    label="Bônus na infraestrutura" 
                />
            )}
         </div>
         <div className="flex gap-2">
            {/* Save Button Removed from here */}
            <button 
                onClick={handleDownloadPDF} 
                className="flex items-center gap-2 bg-[#8BBF56] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#7aa84b] transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Baixar PDF
            </button>
         </div>
      </div>

      {/* Main Document View */}
      <div className="flex-1 p-8 print:p-0 flex justify-center">
        <div id="proposal-content" className="w-[210mm] bg-white min-h-[297mm] shadow-2xl print:shadow-none p-12 print:p-8 flex flex-col relative print:w-full">
          
          {/* Header Reorganization - Updated Layout */}
          <div className="mb-8">
             {/* Row 1: Logo and Title */}
             <div className="flex justify-between items-center gap-4 mb-6">
                 {/* Logo on Left - Width reduced to 20% */}
                 <div className="w-[20%]">
                    <BrandLogo className="w-full aspect-[2.5/1]" /> 
                 </div>
                 
                 {/* Title on Right */}
                 <div className="flex-1 text-right">
                    <h1 className="text-2xl font-bold text-slate-800">
                        Proposta Comercial - {appState.client.schoolName || 'Nome da Escola'}
                    </h1>
                 </div>
             </div>

             {/* Row 2: Contact and Date + Green Separator */}
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

          {/* Configuration Summary (Print Only) */}
          <div className="hidden print:flex gap-6 mb-6">
             <div className="flex items-center gap-2">
                <div className={`w-4 h-4 border ${commercial.contractDuration === 3 ? 'bg-slate-800 border-slate-800' : 'border-slate-300'}`}>
                    {commercial.contractDuration === 3 && <div className="text-white flex items-center justify-center text-[10px]">✓</div>}
                </div>
                <span className="text-xs font-medium uppercase text-slate-600">Contrato 3 anos</span>
             </div>
             <div className="flex items-center gap-2">
                <div className={`w-4 h-4 border ${commercial.useMarketplace ? 'bg-slate-800 border-slate-800' : 'border-slate-300'}`}>
                    {commercial.useMarketplace && <div className="text-white flex items-center justify-center text-[10px]">✓</div>}
                </div>
                <span className="text-xs font-medium uppercase text-slate-600">Market Place</span>
             </div>
             {hasInfraItems && (
                <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border ${commercial.applyInfraBonus ? 'bg-slate-800 border-slate-800' : 'border-slate-300'}`}>
                        {commercial.applyInfraBonus && <div className="text-white flex items-center justify-center text-[10px]">✓</div>}
                    </div>
                    <span className="text-xs font-medium uppercase text-slate-600">Bônus Infra</span>
                </div>
             )}
          </div>

          {/* MATERIAL DO ALUNO SECTION */}
          <div className="mb-10">
             <div className="bg-[#8BBF56] text-white font-bold px-4 py-3 text-lg mb-0 rounded-t-lg">
                Material do Aluno
             </div>
             <div className="border border-slate-200 border-t-0 rounded-b-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] text-sm">
                    
                    {/* Row 1: Alunos */}
                    <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100 flex items-center">Total de Alunos</div>
                    <div className="py-2 px-4 text-right bg-white border-b border-slate-100">
                        <input 
                            type="number" 
                            value={commercial.totalStudents} 
                            onChange={(e) => updateStudents(parseInt(e.target.value) || 0)}
                            className="bg-transparent text-slate-900 text-right font-bold w-20 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-[#8BBF56] rounded transition-all"
                        />
                    </div>

                    {/* Row 2: Investimento Ano */}
                    <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100">Investimento Aluno/ano {materialSymbol}</div>
                    <div className="py-3 px-4 text-right font-bold text-slate-900 border-b border-slate-100">
                        {finalMaterialRatePerYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>

                    {/* Row 3: Investimento Mês - Highlighted */}
                    <div className="bg-[#EBF5E0] py-4 px-4 font-bold text-base text-slate-900 border-b border-white">Investimento Aluno/mês {materialSymbol}</div>
                    <div className="bg-[#EBF5E0] py-4 px-4 text-right font-bold text-xl text-slate-900 border-b border-white">
                        {finalMaterialRatePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    
                    {/* Row 4: Bonus Fidelidade */}
                    {materialDiscountAmount > 0 && (
                        <>
                            <div className="py-2 px-4 font-medium text-slate-500 bg-white">
                                {materialBonusLabel}
                            </div>
                            <div className="py-2 px-4 text-right font-bold text-[#8BBF56] bg-white">
                                {materialDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </>
                    )}
                </div>
             </div>
          </div>

          {/* INFRAESTRUTURA SECTION - Only show if items selected */}
          {hasInfraItems && (
            <div className="mb-12">
                <div className="bg-[#8BBF56] text-white font-bold px-4 py-3 text-lg mb-0 rounded-t-lg">
                    Infraestrutura (Oficina e Ferramentas)
                </div>
                <div className="border border-slate-200 border-t-0 rounded-b-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-sm">
                        
                        {/* Row 1: Investimento Total */}
                        <div className="py-3 px-4 font-medium text-slate-700 border-b border-slate-100">Investimento Infraestrutura {regionSymbol}</div>
                        <div className="py-3 px-4 text-right font-medium text-slate-900 border-b border-slate-100 bg-white">
                            {totalInfraGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>

                        {/* Row 2: Desconto */}
                        {infraDiscountAmount > 0 && (
                            <>
                                <div className="py-2 px-4 font-medium text-slate-700 border-b border-slate-100">Desconto do bônus fidelidade {infraBonusSymbol}</div>
                                <div className="py-2 px-4 text-right font-bold text-[#8BBF56] border-b border-slate-100 bg-white">
                                    - {infraDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                            </>
                        )}

                        {/* Row 3: Total Final */}
                        <div className="py-3 px-4 font-bold text-slate-900 border-b border-slate-100">Total Infraestrutura (único no contrato)</div>
                        <div className="py-3 px-4 text-right font-bold text-lg text-slate-900 border-b border-slate-100 bg-white">
                            {totalInfraNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>

                        {/* Row 4: Parcelamento - Highlighted */}
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

          {/* Footer Notes (Stick to bottom of paper) */}
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

                {/* Region Note */}
                {showRegionNote && (
                    <p>{regionSymbol} Região de entrega considerada: <strong>{currentRegion.label}</strong>.</p>
                )}
                
                <p className="pt-2 font-medium text-slate-600">Proposta válida por 30 dias a partir da data de emissão.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};