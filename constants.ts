
import { InfraItem, Region, AppState, TechDetail } from './types';

export const SUPER_ADMINS = [
  'diego.thuler@littlemaker.com.br',
  'denise@littlemaker.com.br'
];

export const REGIONS: Region[] = [
  { id: 'ate_700', label: 'Até 700Km', priceSimple: 1500, priceAssembly: 4000 },
  { id: 'sudeste', label: 'Sudeste', priceSimple: 1500, priceAssembly: 8500 },
  { id: 'sul', label: 'Sul', priceSimple: 2500, priceAssembly: 8500 },
  { id: 'centro_oeste', label: 'Centro-Oeste', priceSimple: 2500, priceAssembly: 8500 },
  { id: 'nordeste', label: 'Nordeste', priceSimple: 4000, priceAssembly: 15500 },
  { id: 'norte', label: 'Norte', priceSimple: 5000, priceAssembly: 21800 },
];

/** Planos de assinatura (Material do Aluno) para Espaço de Aprendizagem - tabela fixa na proposta/contrato */
export const SUBSCRIPTION_PLANS_EA = [
  { id: 'start', name: 'Plano Start', perfil: 'Validando mercado', mensalFixo: 1900, alunosInclusos: 10, alunoAdicionalMes: 210, refUpgrade: 15 },
  { id: 'grow', name: 'Plano Grow', perfil: 'Ganhando escala', mensalFixo: 2900, alunosInclusos: 25, alunoAdicionalMes: 120, refUpgrade: 42 },
  { id: 'full', name: 'Plano Full', perfil: 'Aumentando a margem', mensalFixo: 4900, alunosInclusos: 50, alunoAdicionalMes: 90, refUpgrade: null as number | null },
] as const;

/** Retorna o valor mensal do plano mais provável pelo número de alunos (EA). */
export function getSubscriptionMonthlyForStudents(students: number): number {
  const start = 1900 + Math.max(0, students - 10) * 210;
  const grow = 2900 + Math.max(0, students - 25) * 120;
  const full = 4900 + Math.max(0, students - 50) * 90;
  return Math.min(start, grow, full);
}

/** Índice do plano mais indicado pelo número de alunos (0=Start, 1=Grow, 2=Full) para destacar coluna. */
export function getRecommendedPlanIndexForStudents(students: number): 0 | 1 | 2 {
  const start = 1900 + Math.max(0, students - 10) * 210;
  const grow = 2900 + Math.max(0, students - 25) * 120;
  const full = 4900 + Math.max(0, students - 50) * 90;
  const min = Math.min(start, grow, full);
  if (min === start) return 0;
  if (min === grow) return 1;
  return 2;
}

export const PROPOSAL_TEXTS = {
  // --- INFANTIL ---
  infantil_carrinho: {
    title: "Carrinho Educação Infantil",
    subtitle: "Tudo que a EI precisa com flexibilidade total",
    items: [
      "Carrinho que transforma a EI em um espaço Maker completo",
      "Caixas de Exploração Exclusiva",
      "Eletrônicos Infantil Exclusiva",
      "Ferramentas Diversas"
    ]
  },
  infantil_oficina: {
    title: "Oficina Educação Infantil",
    subtitle: "Ambientação de oficina temática completa",
    items: [
      "Caixas de Exploração Exclusiva",
      "Conjunto de Eletrônicos Infantil Exclusivo",
      "Ferramentas Diversas",
      "Adequada para turmas de até {{numf}} alunos"
    ]
  },

  // --- MÍDIA ---
  midia_padrao: {
    title: "Sala de Mídia Completa - {{num}} alunos",
    subtitle: "Ambientação de sala temática completa",
    items: [
      "Conjunto de ferramentas Maker completa",
      "Inclui impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit 60 módulos eletrônicos, microbits e ferramentas manuais",
      "Adequada para turmas de até {{num}} alunos",
      "Requer 4 laptops/chromebook (não inclusos)"
    ]
  },
  midia_com_computadores: {
    title: "Sala de Mídia Completa com Computadores - {{num}} alunos",
    subtitle: "Ambientação de sala temática completa",
    items: [
      "Conjunto de ferramentas Maker completa",
      "Inclui impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit 60 módulos eletrônicos, microbits e ferramentas manuais",
      "Fornecido com 4 laptops",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },

  // --- MAKER ---
  maker_padrao: {
    title: "Oficina Maker Padrão - {{num}} alunos",
    subtitle: "Ambientação de oficina temática com ferramentas padrão",
    items: [
      "Conjunto de ferramentas Maker com amplas possibilidades",
      "Inclui impressora 3D, canetas 3D, máquina de costura, kit 60 módulos eletrônicos, ferramentas manuais e muito mais",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },
  maker_completa: {
    title: "Oficina Maker Completa - {{num}} alunos",
    subtitle: "Ambientação de oficina temática com ferramentas completas",
    items: [
      "Conjunto de ferramentas Maker completa",
      "Inclui impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit 60 módulos eletrônicos, microbits, ferramentas manuais e muito mais",
      "Adequada para turmas de até {{num}} alunos",
      "Requer 4 laptops/chromebook (não inclusos)"
    ]
  },
  maker_completa_pc: {
    title: "Oficina Maker Completa com Computadores - {{num}} alunos",
    subtitle: "Ambientação de oficina temática com ferramentas completas",
    items: [
      "Conjunto de ferramentas Maker completa",
      "Inclui impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit 60 módulos eletrônicos, microbits, ferramentas manuais e muito mais",
      "Fornecido com 4 laptops",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },

  // --- MAKER (VARIANTE AMBIENTAÇÃO MÍNIMA) ---
  maker_minima_reduzida: {
    title: "Amb. Mínima com Ferramentas Reduzidas EFAI",
    subtitle: "Ideal para iniciar com turmas reduzidas",
    items: [
      "Incluem containers, organizadores de materiais e adesivos de sinalização",
      "Conjunto de ferramentas diversas de complexidade adequada para Anos Iniciais",
      "Adequada para turmas de até {{numf}} alunos"
    ]
  },
  maker_minima_padrao: {
    title: "Amb. Mínima com Ferramentas Padrão",
    subtitle: "Ideal para equipar espaço multi atividades",
    items: [
      "Conjunto de ferramentas Maker com amplas possibilidades",
      "Adequada para turmas de até 36 alunos a depender do espaço"
    ]
  },
  maker_minima_solo: {
    title: "Ambientação Mínima",
    subtitle: "Indicado para escolas que já possuem oficinas",
    items: [
      "Incluem containers, organizadores de materiais e adesivos de sinalização"
    ]
  },

  // --- Espaço de Aprendizagem (prefixo ls_): oficina Padrão / Completa / com Computadores (Híbrida e Fund) + mínima ---
  ls_hybrid_oficina: {
    title: "Maker Híbrida Padrão - {{num}} alunos",
    subtitle: "Oficina Maker ideal para EI e Fund/Médio",
    items: [
      "Mobiliário da Ed. Infantil e Fundamental/Médio",
      "Maker: impressora 3D, canetas 3D, máquina de costura, kit de eletrônicos com 30 módulos, ferramentas manuais",
      "Infantil: Kit Eletrônicos infantil (12 módulos), caixas de exploração, carimbos, lupas e muito mais",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },
  ls_hybrid_oficina_completa: {
    title: "Maker Híbrida Completa - {{num}} alunos",
    subtitle: "Oficina Maker ideal para EI e Fund/Médio",
    items: [
      "Mobiliário da Ed. Infantil e Fundamental/Médio",
      "Maker: impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit de eletrônicos com 30 módulos, microbits, ferramentas manuais",
      "Infantil: Kit Eletrônicos infantil (12 módulos), caixas de exploração e materiais Infantil",
      "Adequada para turmas de até {{num}} alunos",
      "Requer 2 laptops/chromebook (não inclusos)"
    ]
  },
  ls_hybrid_oficina_completa_pc: {
    title: "Maker Híbrida Completa com Computadores - {{num}} alunos",
    subtitle: "Oficina Maker ideal para EI e Fund/Médio",
    items: [
      "Mobiliário da Ed. Infantil e Fundamental/Médio",
      "Maker: impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit de eletrônicos com 30 módulos, microbits, ferramentas manuais",
      "Infantil: Kit Eletrônicos infantil (12 módulos) e materiais diversos",
      "Fornecido com 2 laptops",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },
  ls_hybrid_minima: {
    title: "Ambientação Mínima Híbrida - {{numf}} alunos",
    subtitle: "Ferramentas para EI e Fund/Médio, sem mobiliário",
    items: [
      "Organizadores e adesivos de sinalização do espaço",
      "Conjunto de ferramentas com amplas possibilidades",
      "Adequada para turmas de até {{numf}} alunos"
    ]
  },
  ls_fund_oficina: {
    title: "Maker Fundamental e Médio Padrão - {{num}} alunos",
    subtitle: "Oficina ideal para Fund/Médio",
    items: [
      "Mobiliário da Fundamental/Médio",
      "Conjunto de ferramentas Maker: impressora 3D, canetas 3D, máquina de costura, kit de eletrônicos com 30 módulos, ferramentas manuais e muito mais",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },
  ls_fund_oficina_completa: {
    title: "Maker Fundamental e Médio Completa - {{num}} alunos",
    subtitle: "Oficina ideal para Fund/Médio",
    items: [
      "Mobiliário da Fundamental/Médio",
      "Conjunto de ferramentas Maker completa: impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit de eletrônicos com 30 módulos, microbits, ferramentas manuais e muito mais",
      "Adequada para turmas de até {{num}} alunos",
      "Requer 2 laptops/chromebook (não inclusos)"
    ]
  },
  ls_fund_oficina_completa_pc: {
    title: "Maker Fundamental e Médio Completa com Computadores - {{num}} alunos",
    subtitle: "Oficina ideal para Fund/Médio",
    items: [
      "Mobiliário da Fundamental/Médio",
      "Conjunto de ferramentas Maker completa: impressora 3D, cortadora laser, canetas 3D, máquina de costura, kit de eletrônicos com 30 módulos, microbits, ferramentas manuais e muito mais",
      "Fornecido com 2 laptops",
      "Adequada para turmas de até {{num}} alunos"
    ]
  },
  ls_fund_minima: {
    title: "Ambientação Mínima Maker - {{numf}} alunos",
    subtitle: "Ferramentas para Fund/Médio, sem mobiliário",
    items: [
      "Organizadores e adesivos de sinalização do espaço",
      "Conjunto de ferramentas com amplas possibilidades",
      "Adequada para turmas de até {{numf}} alunos"
    ]
  },
  ls_inf_oficina: {
    title: "Maker Infantil - {{num}} alunos",
    subtitle: "Oficina ideal para Ed. Infantil",
    items: [
      "Mobiliário da Ed. Infantil",
      "Caixas de Exploração Exclusiva",
      "Conjunto de Eletrônicos Infantil Exclusivo",
      "Ferramentas Diversas para turmas de até {{num}} alunos"
    ]
  },
  ls_inf_minima: {
    title: "Ambientação Mínima Infantil - {{numf}} alunos",
    subtitle: "Ferramentas para Ed. Infantil, sem mobiliário",
    items: [
      "Organizadores e adesivos de sinalização do espaço",
      "Conjunto de ferramentas com amplas possibilidades",
      "Adequada para turmas de até {{numf}} alunos"
    ]
  }
};

export const INFRA_CATALOG: InfraItem[] = [
  // --- Mídia Fundamental e Médio ---
  {
    id: 'midia_padrao_24',
    label: 'Oficina Padrão - 24 alunos',
    category: 'midia',
    type: 'ambientacao',
    price: 30000,
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'midia_up_12',
    label: 'Upgrade 12 alunos',
    category: 'midia',
    type: 'ambientacao',
    price: 5000,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'midia_up_6',
    label: 'Upgrade 6 alunos',
    category: 'midia',
    type: 'ambientacao',
    price: 2500,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'midia_ferr_padrao',
    label: 'Ferramentas Padrão',
    category: 'midia',
    type: 'ferramentas',
    price: 24000,
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'midia_ferr_pc',
    label: 'Upgrade Computadores',
    category: 'midia',
    type: 'ferramentas',
    price: 14000,
    requiresAssembly: false,
    isUpgrade: true
  },

  // --- Maker Fundamental e Médio ---
  {
    id: 'maker_padrao_24',
    label: 'Oficina Padrão - 24 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 38000,
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'maker_up_12',
    label: 'Upgrade 12 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 15500,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'maker_up_6',
    label: 'Upgrade 6 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 4500,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'maker_minima',
    label: 'Ambientação Mínima',
    category: 'maker',
    type: 'ambientacao',
    price: 2500,
    requiresAssembly: false, // No assembly needed
    isBase: false // Special handling
  },
  {
    id: 'maker_ferr_padrao',
    label: 'Ferramentas Padrão',
    category: 'maker',
    type: 'ferramentas',
    price: 19000,
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'maker_ferr_digitais',
    label: 'Upgrade P. Digitais',
    category: 'maker',
    type: 'ferramentas',
    price: 18000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'maker_ferr_pc',
    label: 'Upgrade Computadores',
    category: 'maker',
    type: 'ferramentas',
    price: 14000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'maker_ferr_red_18',
    label: 'Ferramentas Red. - 18 alunos',
    category: 'maker',
    type: 'ferramentas',
    price: 8500,
    requiresAssembly: false
  },

  // --- Maker Infantil ---
  {
    id: 'infantil_padrao_18',
    label: 'Oficina Padrão - 18 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 22500,
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'infantil_up_12',
    label: 'Upgrade 12 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 8500,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'infantil_up_6',
    label: 'Upgrade 6 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 1200,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'infantil_carrinho',
    label: 'Carrinho',
    category: 'infantil',
    type: 'ambientacao',
    price: 4000,
    requiresAssembly: false,
    isBase: false // Special handling
  },
  {
    id: 'infantil_ferr_18',
    label: 'Ferramentas 18 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 8500,
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'infantil_ferr_up_12',
    label: 'Upgrade 12 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 3000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'infantil_ferr_up_6',
    label: 'Upgrade 6 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 1500,
    requiresAssembly: false,
    isUpgrade: true
  },

  // --- Espaço de Aprendizagem (prefixo ls_) ---
  {
    id: 'ls_hybrid_ambient_minima',
    label: 'Ambientação Mínima Híbrida',
    category: 'maker',
    type: 'ambientacao',
    price: 2500,
    requiresAssembly: false,
    isBase: false
  },
  {
    id: 'ls_hybrid_ambient_padrao_12',
    label: 'Oficina Padrão - 12 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 19500,
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'ls_hybrid_ambient_up_12',
    label: 'Upgrade 12 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 9000,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'ls_hybrid_ambient_up_6',
    label: 'Upgrade 6 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 3000,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'ls_hybrid_tools_padrao',
    label: 'Ferramentas Híbrida',
    category: 'maker',
    type: 'ferramentas',
    price: 18500,
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'ls_hybrid_tools_digitais',
    label: 'Upgrade P. Digitais',
    category: 'maker',
    type: 'ferramentas',
    price: 17000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_hybrid_tools_pc',
    label: 'Upgrade Computadores',
    category: 'maker',
    type: 'ferramentas',
    price: 7000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_hybrid_tools_infantil_12',
    label: 'Upgrade Infantil 12 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 3000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_hybrid_tools_infantil_6',
    label: 'Upgrade Infantil 6 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 1500,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_fund_ambient_minima',
    label: 'Ambientação Mínima Maker',
    category: 'maker',
    type: 'ambientacao',
    price: 2500,
    requiresAssembly: false,
    isBase: false
  },
  {
    id: 'ls_fund_ambient_padrao_12',
    label: 'Oficina Padrão - 12 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 18500,
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'ls_fund_ambient_up_12',
    label: 'Upgrade 12 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 6500,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'ls_fund_ambient_up_6',
    label: 'Upgrade 6 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 4500,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'ls_fund_tools_padrao',
    label: 'Ferramentas Maker Padrão 12 alunos',
    category: 'maker',
    type: 'ferramentas',
    price: 13500,
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'ls_fund_tools_digitais',
    label: 'Upgrade P. Digitais',
    category: 'maker',
    type: 'ferramentas',
    price: 17000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_fund_tools_pc',
    label: 'Upgrade Computadores',
    category: 'maker',
    type: 'ferramentas',
    price: 7000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_fund_tools_red_12',
    label: 'Upgrade Padrão até 12 alunos',
    category: 'maker',
    type: 'ferramentas',
    price: 6500,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_inf_ambient_minima',
    label: 'Ambientação Mínima Infantil',
    category: 'infantil',
    type: 'ambientacao',
    price: 2100,
    requiresAssembly: false,
    isBase: false
  },
  {
    id: 'ls_inf_ambient_padrao_12',
    label: 'Oficina Padrão - 12 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 13000,
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'ls_inf_ambient_up_12',
    label: 'Upgrade 12 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 4200,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'ls_inf_ambient_up_6',
    label: 'Upgrade 6 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 2100,
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'ls_inf_carrinho',
    label: 'Carrinho',
    category: 'infantil',
    type: 'ambientacao',
    price: 4000,
    requiresAssembly: false,
    isBase: false
  },
  {
    id: 'ls_inf_tools_12',
    label: 'Ferramentas Infantil',
    category: 'infantil',
    type: 'ferramentas',
    price: 5800,
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'ls_inf_tools_up_12',
    label: 'Upgrade Infantil 12 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 3000,
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'ls_inf_tools_up_6',
    label: 'Upgrade Infantil 6 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 1500,
    requiresAssembly: false,
    isUpgrade: true
  }
];

export const INITIAL_APP_STATE: AppState = {
  client: {
    clientType: 'Escola',
    schoolName: '',
    contactName: '',
    date: new Date().toISOString().split('T')[0],
    state: '', // Default vazia para forçar seleção
    segments: [],
  },
  regionId: 'ate_700',
  selectedInfraIds: [],
  commercial: {
    totalStudents: 50,
    contractDuration: 1,
    useMarketplace: false,
    applyInfraBonus: false,
    customValues: {} // Start empty
  },
  learningSpaceInfra: {
    hybrid: [],
    fundamental: [],
    infantil: []
  }
};

// --- DATA FOR TECHNICAL DESCRIPTION ---
// IMPORTANT: These URLs must point to VALID IMAGES (PNG/JPG), not SVG or HTML pages.
// Using .png extension for placehold.co ensures a raster image is returned.
export const AMBIENTATION_IMAGES: Record<string, string> = {
  'maker_padrao': 'https://littlemaker.com.br/wp-content/uploads/2026/03/maker_padrao.jpg',
  'maker_minima': 'https://littlemaker.com.br/wp-content/uploads/2026/03/maker_minima.jpg',
  'midia_padrao': 'https://littlemaker.com.br/wp-content/uploads/2026/03/midia_padrao.jpg',
  'infantil_oficina': 'https://littlemaker.com.br/wp-content/uploads/2026/03/infantil_oficina.jpg',
  'infantil_carrinho': 'https://littlemaker.com.br/wp-content/uploads/2026/03/infantil_carrinho.jpg',
  'ls_hybrid_oficina': 'https://littlemaker.com.br/wp-content/uploads/2026/03/maker_hibrida.jpg',
};

export const INFRA_DETAILS: Record<string, TechDetail> = {
  // --- MAKER AMBIENTAÇÃO ---
  'maker_padrao_24': {
    items: [
      { qty: 2, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 4, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 24, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Módulos colmeia (LxAxP): 1.20m x 2.50m x 40cm" },
      { qty: 1, name: "Baú (LxAxP): 60cm x 60cm x 1.20m" },
      { qty: 6, name: "Lousas brancas (AxL): 40cm x 60cm" },
      { qty: 3, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 8, name: "Conectivos para grade" },
      { qty: 4, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 9, name: "Spots de iluminação" },
      { qty: 4, name: "Suportes para lousas" },
      { qty: 2, name: "Suportes para colas quentes em aço" },
      { qty: 16, name: "Cestos organizadores P" },
      { qty: 8, name: "Cestos organizadores M" },
      { qty: 4, name: "Cestos organizadores G" },
      { qty: 20, name: "Cachepôs" },
      { qty: 8, name: "Cestos para eletrônicos" },
      { qty: 1, name: "Tambor de lixo" },
      { qty: 16, name: "Caixas plásticas pretas" },
      { qty: 2, name: "Carrinhos de ferramentas" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" },
      { qty: 1, name: "Luminária torneira" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Placa com adesivo logo (LxA): 1.20m x 0.50m" },
      { qty: 1, name: "Placa com adesivo tag cloud (Lx A): 1,20m x 0.80m" },
      { qty: 1, name: "Adesivo CRIE transparente (LxA) - 1.60m x 1.10m" },
      { qty: 1, name: "Adesivo tijolo (LxA): 1.70m x 0.94m" },
      { qty: 1, name: "Kit de adesivos elementos (LxA): 35cm x 35cm" },
      { qty: 1, name: "Faixa de identificação da porta" }
    ]
  },
  'maker_up_12': {
    items: [
      { qty: 1, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 2, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 12, name: "Banquetas de aço: 45cm de altura" },
      { qty: 1, name: "Módulos colmeia (LxAxP): 1.20m x 2.50m x 40cm" },
      { qty: 2, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 8, name: "Caixas plásticas pretas" },
      { qty: 3, name: "Spots de iluminação" }
    ]
  },
  'maker_up_6': {
    items: [
      { qty: 1, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 6, name: "Banquetas de aço: 45cm de altura" },
      { qty: 1, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 3, name: "Spots de iluminação" }
    ]
  },
  'maker_minima': {
    items: [
      { qty: 3, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 8, name: "Conectivos para grade" },
      { qty: 1, name: "Suportes para colas quentes em aço" },
      { qty: 16, name: "Cestos organizadores P" },
      { qty: 8, name: "Cestos organizadores M" },
      { qty: 4, name: "Cestos organizadores G" },
      { qty: 20, name: "Cachepôs" },
      { qty: 8, name: "Cestos para eletrônicos" },
      { qty: 2, name: "Caixa Container 65l" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" }
    ]
  },

  // --- MÍDIA AMBIENTAÇÃO ---
  'midia_padrao_24': {
    items: [
      { qty: 2, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 4, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 24, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Mesas escritório (LxAxP): 60cm x 74cm x 1.20m" },
      { qty: 1, name: "Espelho camarim (LxAxP): 90cm x 70cm x 30cm" },
      { qty: 1, name: "Cadeira camarim (AxL): 82cm x 47cm" },
      { qty: 1, name: "Cadeira diretor (AxL): 82cm x 54cm" },
      { qty: 2, name: "Banquetas altas 1.0m de altura" },
      { qty: 6, name: "Lousas brancas (AxL): 40cm x 60cm" },
      { qty: 2, name: "Pastas A4 com 50 plásticos" },
      { qty: 1, name: "Claquete de madeira (LxA): 29cm x 27cm" },
      { qty: 3, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 8, name: "Conectivos para grade" },
      { qty: 1, name: "Suportes para colas quentes em aço" },
      { qty: 3, name: "Trilhos suporte para lousas" },
      { qty: 16, name: "Cestos organizadores P" },
      { qty: 8, name: "Cestos organizadores M" },
      { qty: 4, name: "Cestos organizadores G" },
      { qty: 20, name: "Cachepôs" },
      { qty: 8, name: "Cestos para eletrônicos" },
      { qty: 1, name: "Tambor de lixo" },
      { qty: 1, name: "Carrinhos de ferramentas" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" },
      { qty: 12, name: "Spots de iluminação" },
      { qty: 1, name: "Espelho de corpo inteiro (LxA): 70cm x 1.15m" },
      { qty: 1, name: "Cabideiro" },
      { qty: 1, name: "Luminária canhão" },
      { qty: 1, name: "Lona Chroma Key" },
      { qty: 1, name: "Varão de cortina para chroma key" },
      { qty: 1, name: "Conjunto de prendedor para chroma key (6 unidades)" },
      { qty: 6, name: "Ganchos" },
      { qty: 1, name: "Fio de Nylon (10 m)" },
      { qty: 1, name: "Fita dupla face 3M" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Placa com adesivo logo (LxA): 1.20m x 0.50m" },
      { qty: 1, name: "Adesivo CRIE transparente (LxA) - 1.60m x 1.10m" },
      { qty: 1, name: "Faixa de identificação da porta" }
    ]
  },
  'midia_up_12': {
    items: [
      { qty: 2, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 12, name: "Banquetas de aço: 45cm de altura" },
      { qty: 4, name: "Spots de iluminação" }
    ]
  },
  'midia_up_6': {
    items: [
      { qty: 1, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 6, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Spots de iluminação" }
    ]
  },

  // --- INFANTIL AMBIENTAÇÃO ---
  'infantil_padrao_18': {
    items: [
      { qty: 2, name: "Bancadas infantil (LxAxP): 1.25m x 60cm x 65cm" },
      { qty: 2, name: "Baús infantil (LxAxP): 40cm x 60cm x 50cm" },
      { qty: 2, name: "Puffs (AxL): 39cm x 34cm" },
      { qty: 3, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 2, name: "Módulos colmeia infantil (LxAxP): 1.20m x 1.28m x 40cm" },
      { qty: 3, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 8, name: "Conectivos para grade" },
      { qty: 1, name: "Luminária torneira" },
      { qty: 16, name: "Cestos organizadores P" },
      { qty: 8, name: "Cestos organizadores M" },
      { qty: 4, name: "Cestos organizadores G" },
      { qty: 20, name: "Cachepôs" },
      { qty: 1, name: "Tambor de lixo" },
      { qty: 10, name: "Caixas plásticas pretas" },
      { qty: 4, name: "Luminárias pendentes meia esfera (DxA): 30cm x 15cm" },
      { qty: 9, name: "Spots de iluminação" },
      { qty: 8, name: "Caixas organizadoras para colmeia do Infantil" },
      { qty: 6, name: "Ganchos" },
      { qty: 1, name: "Fio de Nylon (10 m)" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Placa com adesivo logo (LxA): 1.20m x 0.50m" },
      { qty: 1, name: "Adesivo tijolo (LxA): 1.70m x 0.94m" },
      { qty: 1, name: "Faixa de identificação da porta" },
      { qty: 1, name: "Adesivo cachorro (LxA): 40cm x 40cm" },
      { qty: 1, name: "Adesivo CRIE transparente (LxA) - 1.60m x 1.10m" },
      { qty: 1, name: "Kit Elementos do Infantil (LxA): Lâmpada (14x25), Nuvem (25x18), Engrenagem (25x25)" },
      { qty: 1, name: "Foguete (LxA): 1.4m x 2.2m" },
      { qty: 1, name: "Planeta (LxA): 60cm x 33cm" }
    ]
  },
  'infantil_up_12': {
    items: [
      { qty: 1, name: "Bancadas infantil (LxAxP): 1.25m x 60cm x 65cm" },
      { qty: 2, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 1, name: "Módulos colmeia infantil (LxAxP): 1.20m x 1.28m x 40cm" },
      { qty: 5, name: "Caixas plásticas pretas" },
      { qty: 2, name: "Luminárias pendentes meia esfera (DxA): 30cm x 15cm" },
      { qty: 6, name: "Spots de iluminação" }
    ]
  },
  'infantil_up_6': {
    items: [
      { qty: 1, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 2, name: "Spots de iluminação" }
    ]
  },
  'infantil_carrinho': {
    items: [
      { qty: 1, name: "Carrinho Infantil (LxAxP): 50cm x 90cm x 90cm" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Kit de Adesivo lateral" }
    ]
  },
  'ls_inf_carrinho': {
    items: [
      { qty: 1, name: "Carrinho Infantil (LxAxP): 50cm x 90cm x 90cm" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Kit de Adesivo lateral" }
    ]
  },

  // --- FERRAMENTAS MAKER ---
  'maker_ferr_padrao': {
    items: [
      { qty: 4, name: "Tablets 3G 2GB preto" },
      { qty: 4, name: "Capinhas de tablets" },
      { qty: 4, name: "Máquinas de costura portátil manual" },
      { qty: 1, name: "Caixa de ferramentas sanfonada (5 gavetas)" },
      { qty: 1, name: "Jogo de ferramentas 1/4\" 129 peças" },
      { qty: 1, name: "Micro retífica 3.6v Li 1 bateria 12 acessórios" },
      { qty: 1, name: "Parafusadeira/Furadeira 12V com 13 acessórios" },
      { qty: 4, name: "Canetas 3D ajustável velocidade e temperatura" },
      { qty: 1, name: "Impressora 3D - Área de moldagem: 220x220x250mm³" },
      { qty: 1, name: "Kit de eletrônicos com 60 módulos" },
      { qty: 1, name: "Máquina de Costura Singer M2505" }
    ]
  },
  'maker_ferr_red_18': {
    items: [
      { qty: 2, name: "Tablets 3G 2GB preto" },
      { qty: 2, name: "Capinhas de tablets" },
      { qty: 4, name: "Máquinas de costura portátil manual" },
      { qty: 1, name: "Caixa de ferramentas sanfonada (5 gavetas)" },
      { qty: 1, name: "Jogo de ferramentas 1/4\" 129 peças" },
      { qty: 1, name: "Micro retífica 3.6v Li 1 bateria 12 acessórios" },
      { qty: 1, name: "Parafusadeira/Furadeira 12V com 13 acessórios" },
      { qty: 4, name: "Canetas 3D ajustável velocidade e temperatura" },
      { qty: 1, name: "Kit de eletrônicos com 30 módulos" }
    ]
  },
  'maker_ferr_digitais': {
    items: [
      { qty: 6, name: "Micro Bits" },
      { qty: 1, name: "Cortadora a Laser - 8W Área de corte: 42 cm x 32 cm" },
      { qty: 1, name: "Microbit de Expansão" }
    ]
  },
  'maker_ferr_pc': {
    items: [
      { qty: 4, name: "Notebooks Intel Celeron N4020 4GB de RAM 128GB SSD, Intel UHD Graphics 600 1366x768px Windows 11" }
    ]
  },

  // --- FERRAMENTAS MÍDIA ---
  'midia_ferr_padrao': {
    items: [
      { qty: 4, name: "Micro Bits" },
      { qty: 4, name: "Tablets 3G 2GB preto" },
      { qty: 4, name: "Capinhas de tablets" },
      { qty: 4, name: "Máquinas de costura portátil manual" },
      { qty: 4, name: "Caneta 3D ajustável velocidade e temperatura led" },
      { qty: 6, name: "Mesas animação 75x71x78" },
      { qty: 3, name: "Mesas de desenho portátil A3" },
      { qty: 1, name: "Mesa luz A4 desenho led branco usb" },
      { qty: 1, name: "Microfone acústico - Difusor Acústico com espuma de isolamento" },
      { qty: 1, name: "Câmeras fotográfica DSLR" },
      { qty: 4, name: "Microfones KP-917 condensador omnidirecional preto" },
      { qty: 4, name: "Fone de ouvido over-ear gamer" },
      { qty: 1, name: "Estabilizador de celular steadicam para vídeos em smartphone" },
      { qty: 1, name: "Mini projetor 1800lm 100V/240V" },
      { qty: 1, name: "Tripé, sombrinha e suporte para iluminação 2 metros" },
      { qty: 1, name: "Máquina de costura reta portátil" },
      { qty: 2, name: "Monitores led 19\" 100V/240V" },
      { qty: 1, name: "Impressora ecotank a cor multifuncional com wifi preta 110V/220V" },
      { qty: 1, name: "Carregador de pilhas" },
      { qty: 1, name: "Pilha recarregável kit com 4 unidades" },
      { qty: 1, name: "Tela branca projetor medida da 1,40m x 1,0m" },
      { qty: 1, name: "Tripé câmera Canon 1,80m + suporte celular" },
      { qty: 1, name: "Kit lentes para Tablet com 3 unidades" },
      { qty: 1, name: "Powerbank carregador portátil" },
      { qty: 1, name: "Alto-falante Mondial" },
      { qty: 1, name: "Ring light 1,60 m" }
    ]
  },
  'midia_ferr_pc': {
    items: [
      { qty: 4, name: "Notebooks Intel Celeron N4020 4GB de RAM 128GB SSD, Intel UHD Graphics 600 1366x768px Windows 11" }
    ]
  },

  // --- FERRAMENTAS INFANTIL ---
  'infantil_ferr_18': {
    items: [
      { qty: 4, name: "Caixas organizadoras (AxLxP): 8cm x 23cm x 27cm" },
      { qty: 1, name: "Caixa para eletrônicos (AxLxP): 20cm x 46cm x 26cm" },
      { qty: 2, name: "Caixas de tato (AxLxP): 22cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas de projeção (AxLxP): 22cm x 42cm x 23cm" },
      { qty: 4, name: "Caixas gaveta (AxLxP): 10cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas recicláveis (AxLxP): 26cm x 42cm x 46cm" },
      { qty: 1, name: "Kit adesivos caixas" },
      { qty: 1, name: "Carregadores dos eletrônicos HUB USB 7 Portas" },
      { qty: 7, name: "Cabos de carregamento micro usb de 20cm" },
      { qty: 1, name: "Tablet 3G 2GB preto" },
      { qty: 1, name: "Capinha de tablet" },
      { qty: 1, name: "Kit carimbo de formas geométricas (10 formas)" },
      { qty: 1, name: "Kit Eletrônicos infantil (18 módulos)" },
      { qty: 1, name: "Lupa grande com luz" },
      { qty: 1, name: "Kit carimbo infantil (5 unidades)" },
      { qty: 2, name: "Almofadas de carimbo sem tinta" },
      { qty: 5, name: "Alicates furador de papel" },
      { qty: 3, name: "Kits de estecas para biscuit (8 unidades)" },
      { qty: 3, name: "Tesoura vai e vem" },
      { qty: 3, name: "Kit normógrafo" },
      { qty: 1, name: "Kit tesouras com cortes diferentes (6 unidades)" },
      { qty: 6, name: "Reguas Geometricas" }
    ]
  },
  'infantil_ferr_up_6': {
    items: [
      { qty: 1, name: "Upgrade Eletrônico infantil (6 módulos)" }
    ]
  },
  'infantil_ferr_up_12': {
    items: [
      { qty: 2, name: "Upgrade Eletrônico infantil (6 módulos)" }
    ]
  },

  // --- Espaço de Aprendizagem (prefixo ls_) ---
  'ls_hybrid_ambient_minima': {
    items: [
      { qty: 2, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 6, name: "Conectivos para grade" },
      { qty: 2, name: "Suportes para colas quentes em aço" },
      { qty: 8, name: "Cestos organizadores P" },
      { qty: 4, name: "Cestos organizadores M" },
      { qty: 2, name: "Cestos organizadores G" },
      { qty: 10, name: "Cachepôs" },
      { qty: 4, name: "Cestos para eletrônicos" },
      { qty: 2, name: "Caixa Container 65l" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" }
    ]
  },
  'ls_hybrid_ambient_padrao_12': {
    items: [
      { qty: 1, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 2, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 12, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 2, name: "Módulos colmeia infantil (LxAxP): 1.20m x 1.28m x 40cm" },
      { qty: 2, name: "Baús infantil (LxAxP): 40cm x 60cm x 50cm" },
      { qty: 6, name: "Lousas brancas (AxL): 40cm x 60cm" },
      { qty: 2, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 6, name: "Conectivos para grade" },
      { qty: 2, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 2, name: "Suportes para colas quentes em aço" },
      { qty: 3, name: "Trilhos suporte para lousas" },
      { qty: 1, name: "Luminária torneira" },
      { qty: 8, name: "Cestos organizadores P" },
      { qty: 4, name: "Cestos organizadores M" },
      { qty: 2, name: "Cestos organizadores G" },
      { qty: 10, name: "Cachepôs" },
      { qty: 4, name: "Cestos para eletrônicos" },
      { qty: 1, name: "Tambor de lixo" },
      { qty: 1, name: "Carrinhos de ferramentas" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" },
      { qty: 6, name: "Caixas plásticas pretas" },
      { qty: 6, name: "Spots de iluminação" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Placa com adesivo logo (LxA): 1.20m x 0.50m" },
      { qty: 1, name: "Placa com adesivo tag cloud (Lx A): 1,20m x 0.80m" },
      { qty: 1, name: "Adesivo CRIE transparente (LxA) - 1.60m x 1.10m" },
      { qty: 1, name: "Adesivo tijolo (LxA): 1.70m x 0.94m" },
      { qty: 1, name: "Kit de adesivos elementos (LxA): 35cm x 35cm" }
    ]
  },
  'ls_hybrid_ambient_up_12': {
    items: [
      { qty: 2, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 1, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 12, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 2, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 4, name: "Spots de iluminação" }
    ]
  },
  'ls_hybrid_ambient_up_6': {
    items: [
      { qty: 1, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 6, name: "Banquetas de aço: 45cm de altura" },
      { qty: 1, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 1, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 2, name: "Spots de iluminação" }
    ]
  },
  'ls_hybrid_tools_padrao': {
    items: [
      { qty: 2, name: "Caixas organizadoras (AxLxP): 8cm x 23cm x 27cm" },
      { qty: 1, name: "Caixa para eletrônicos (AxLxP): 20cm x 46cm x 26cm" },
      { qty: 2, name: "Caixas de tato (AxLxP): 22cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas de projeção (AxLxP): 22cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas gaveta (AxLxP): 10cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas recicláveis (AxLxP): 26cm x 42cm x 46cm" },
      { qty: 1, name: "Kit adesivos caixas" },
      { qty: 1, name: "Caixa de ferramentas sanfonada (5 gavetas)" },
      { qty: 1, name: "Carregador dos eletrônicos HUB USB 7 portas" },
      { qty: 7, name: "Cabos de carregamento micro usb de 20cm" },
      { qty: 2, name: "Tablets 3G 2GB preto" },
      { qty: 2, name: "Capinhas de tablets" },
      { qty: 1, name: "Máquina de costura portátil manual" },
      { qty: 1, name: "Jogo de ferramentas 1/4\" 129 peças" },
      { qty: 1, name: "Micro retífica 3.6v Li 1 bateria 12 acessórios" },
      { qty: 1, name: "Parafusadeira/Furadeira 12V com 13 acessórios" },
      { qty: 4, name: "Canetas 3D ajustável velocidade e temperatura" },
      { qty: 1, name: "Impressora 3D - Área de moldagem: 220x220x250mm³" },
      { qty: 1, name: "Kit de eletrônicos com 30 módulos" },
      { qty: 1, name: "Kit carimbo de formas geométricas (10 formas)" },
      { qty: 1, name: "Kit Eletrônicos infantil (12 módulos)" },
      { qty: 1, name: "Lupa grande com luz" },
      { qty: 1, name: "Kit carimbo infantil (5 unidades)" },
      { qty: 2, name: "Almofadas de carimbo sem tinta" },
      { qty: 5, name: "Alicates furador de papel" },
      { qty: 3, name: "Kits de estecas para biscuit (8 unidades)" },
      { qty: 3, name: "Tesoura vai e vem" },
      { qty: 3, name: "Kit normógrafo" },
      { qty: 1, name: "Kit tesouras com cortes diferentes (6 unidades)" },
      { qty: 3, name: "Reguas Geometricas" },
      { qty: 1, name: "Máquina de Costura Singer M2505" }
    ]
  },
  'ls_hybrid_tools_digitais': {
    items: [
      { qty: 3, name: "Micro Bits" },
      { qty: 1, name: "Cortadora a Laser - 8W Área de corte: 42 cm x 32 cm" },
      { qty: 1, name: "Microbit de Expansão" }
    ]
  },
  'ls_hybrid_tools_pc': {
    items: [
      { qty: 2, name: "Notebooks Intel Celeron N4020 4GB de RAM 128GB SSD, Intel UHD Graphics 600 1366x768px Windows 11" }
    ]
  },
  'ls_hybrid_tools_infantil_12': {
    items: [
      { qty: 2, name: "Upgrade Eletrônico infantil (6 módulos)" }
    ]
  },
  'ls_hybrid_tools_infantil_6': {
    items: [
      { qty: 1, name: "Upgrade Eletrônico infantil (6 módulos)" }
    ]
  },
  'ls_fund_ambient_minima': {
    items: [
      { qty: 2, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 2, name: "Conectivos para grade" },
      { qty: 2, name: "Suportes para colas quentes em aço" },
      { qty: 8, name: "Cestos organizadores P" },
      { qty: 4, name: "Cestos organizadores M" },
      { qty: 2, name: "Cestos organizadores G" },
      { qty: 10, name: "Cachepôs" },
      { qty: 4, name: "Cestos para eletrônicos" },
      { qty: 2, name: "Caixa Container 65l" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" }
    ]
  },
  'ls_fund_ambient_padrao_12': {
    items: [
      { qty: 1, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 2, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 12, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Módulos colmeia infantil (LxAxP): 1.20m x 1.28m x 40cm" },
      { qty: 2, name: "Baús infantil (LxAxP): 40cm x 60cm x 50cm" },
      { qty: 6, name: "Lousas brancas (AxL): 40cm x 60cm" },
      { qty: 2, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 2, name: "Conectivos para grade" },
      { qty: 2, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 2, name: "Suportes para lousas" },
      { qty: 2, name: "Suportes para colas quentes em aço" },
      { qty: 3, name: "Chapas metálicas de suporte para lousas" },
      { qty: 1, name: "Luminária torneira" },
      { qty: 8, name: "Cestos organizadores P" },
      { qty: 4, name: "Cestos organizadores M" },
      { qty: 2, name: "Cestos organizadores G" },
      { qty: 10, name: "Cachepôs" },
      { qty: 4, name: "Cestos para eletrônicos" },
      { qty: 1, name: "Tambor de lixo" },
      { qty: 1, name: "Carrinhos de ferramentas" },
      { qty: 1, name: "Kit de Adesivos de sinalização de materiais" },
      { qty: 6, name: "Caixas plásticas pretas" },
      { qty: 4, name: "Spots de iluminação" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Placa com adesivo logo (LxA): 1.20m x 0.50m" },
      { qty: 1, name: "Placa com adesivo tag cloud (Lx A): 1,20m x 0.80m" },
      { qty: 1, name: "Adesivo CRIE transparente (LxA) - 1.60m x 1.10m" },
      { qty: 1, name: "Adesivo tijolo (LxA): pequeno" },
      { qty: 1, name: "Kit de adesivos elementos (LxA): 35cm x 35cm" }
    ]
  },
  'ls_fund_ambient_up_12': {
    items: [
      { qty: 2, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 1, name: "Bancadas maker (LxAxP): 1.25m x 90cm x 65cm" },
      { qty: 12, name: "Banquetas de aço: 45cm de altura" },
      { qty: 2, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 4, name: "Spots de iluminação" }
    ]
  },
  'ls_fund_ambient_up_6': {
    items: [
      { qty: 1, name: "Mesas maker (LxAxP): 80cm x 74cm x 1.20m" },
      { qty: 6, name: "Banquetas de aço: 45cm de altura" },
      { qty: 1, name: "Luminárias pendentes 45 cm de diâmetro" },
      { qty: 2, name: "Spots de iluminação" }
    ]
  },
  'ls_fund_tools_padrao': {
    items: [
      { qty: 2, name: "Tablets 3G 2GB preto" },
      { qty: 2, name: "Capinhas de tablets" },
      { qty: 1, name: "Máquina de costura portátil manual" },
      { qty: 1, name: "Caixa de ferramentas sanfonada (5 gavetas)" },
      { qty: 1, name: "Jogo de ferramentas 1/4\" 129 peças" },
      { qty: 1, name: "Micro retífica 3.6v Li 1 bateria 12 acessórios" },
      { qty: 1, name: "Parafusadeira/Furadeira 12V com 13 acessórios" },
      { qty: 4, name: "Canetas 3D ajustável velocidade e temperatura" },
      { qty: 1, name: "Impressora 3D - Área de moldagem: 220x220x250mm³" },
      { qty: 1, name: "Kit de eletrônicos com 30 módulos" },
      { qty: 1, name: "Máquina de Costura Singer M2505" }
    ]
  },
  'ls_fund_tools_digitais': {
    items: [
      { qty: 3, name: "Micro Bits" },
      { qty: 1, name: "Cortadora a Laser - 8W Área de corte: 42 cm x 32 cm" },
      { qty: 1, name: "Microbit de Expansão" }
    ]
  },
  'ls_fund_tools_pc': {
    items: [
      { qty: 2, name: "Notebooks Intel Celeron N4020 4GB de RAM 128GB SSD, Intel UHD Graphics 600 1366x768px Windows 11" }
    ]
  },
  'ls_fund_tools_red_12': {
    items: [
      { qty: 1, name: "Descrição técnica a preencher." }
    ]
  },
  'ls_inf_ambient_minima': {
    items: [
      { qty: 1, name: "Descrição técnica a preencher." }
    ]
  },
  'ls_inf_ambient_padrao_12': {
    items: [
      { qty: 1, name: "Bancadas infantil (LxAxP): 1.25m x 60cm x 65cm" },
      { qty: 2, name: "Baús infantil (LxAxP): 40cm x 60cm x 50cm" },
      { qty: 2, name: "Puffs (AxL): 39cm x 34cm" },
      { qty: 2, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 1, name: "Módulos colmeia infantil (LxAxP): 1.20m x 1.28m x 40cm" },
      { qty: 2, name: "Grades (AxL): 1.00m x 60cm" },
      { qty: 6, name: "Conectivos para grade" },
      { qty: 1, name: "Luminária torneira" },
      { qty: 8, name: "Cestos organizadores P" },
      { qty: 4, name: "Cestos organizadores M" },
      { qty: 2, name: "Cestos organizadores G" },
      { qty: 10, name: "Cachepôs" },
      { qty: 1, name: "Tambor de lixo" },
      { qty: 5, name: "Caixas plásticas pretas" },
      { qty: 2, name: "Luminárias pendentes meia esfera (DxA): 30cm x 15cm" },
      { qty: 6, name: "Spots de iluminação" },
      { qty: 6, name: "Caixas organizadoras para colmeia do Infantil" },
      { qty: 6, name: "Ganchos" },
      { qty: 1, name: "Fio de Nylon (10 m)" }
    ],
    identityItems: [
      { qty: 1, name: "Placa de parceria" },
      { qty: 1, name: "Banner de divulgação" },
      { qty: 1, name: "Totem de divulgação" },
      { qty: 1, name: "Placa com adesivo logo (LxA): 1.20m x 0.50m" },
      { qty: 1, name: "Adesivo tijolo (LxA): 1.70m x 0.94m" },
      { qty: 1, name: "Faixa de identificação da porta" },
      { qty: 1, name: "Adesivo cachorro (LxA): 40cm x 40cm" },
      { qty: 1, name: "Adesivo CRIE transparente (LxA) - 1.60m x 1.10m" },
      { qty: 1, name: "Kit Elementos do Infantil (LxA): Lâmpada (14x25), Nuvem (25x18), Engrenagem (25x25)" },
      { qty: 1, name: "Foguete (LxA): 1.4m x 2.2m" },
      { qty: 1, name: "Planeta (LxA): 60cm x 33cm" }
    ]
  },
  'ls_inf_ambient_up_12': {
    items: [
      { qty: 1, name: "Bancadas infantil (LxAxP): 1.25m x 60cm x 65cm" },
      { qty: 2, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 1, name: "Módulos colmeia infantil (LxAxP): 1.20m x 1.28m x 40cm" },
      { qty: 5, name: "Caixas plásticas pretas" },
      { qty: 2, name: "Luminárias pendentes meia esfera (DxA): 30cm x 15cm" },
      { qty: 6, name: "Spots de iluminação" }
    ]
  },
  'ls_inf_ambient_up_6': {
    items: [
      { qty: 1, name: "Mesas tatame (LxAxP): 80cm x 30cm x 1.20m" },
      { qty: 2, name: "Spots de iluminação" }
    ]
  },
  'ls_inf_tools_12': {
    items: [
      { qty: 2, name: "Caixas organizadoras (AxLxP): 8cm x 23cm x 27cm" },
      { qty: 1, name: "Caixa para eletrônicos (AxLxP): 20cm x 46cm x 26cm" },
      { qty: 2, name: "Caixas de tato (AxLxP): 22cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas de projeção (AxLxP): 22cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas gaveta (AxLxP): 10cm x 42cm x 23cm" },
      { qty: 2, name: "Caixas recicláveis (AxLxP): 26cm x 42cm x 46cm" },
      { qty: 1, name: "Kit adesivos caixas" },
      { qty: 1, name: "Carregador dos eletrônicos HUB USB 7 portas" },
      { qty: 7, name: "Cabos de carregamento micro usb de 20cm" },
      { qty: 1, name: "Tablet 3G 2GB preto" },
      { qty: 1, name: "Capinha de tablet" },
      { qty: 1, name: "Kit carimbo de formas geométricas (10 formas)" },
      { qty: 1, name: "Kit Eletrônicos infantil (12 módulos)" },
      { qty: 1, name: "Lupa grande com luz" },
      { qty: 1, name: "Kit carimbo infantil (5 unidades)" },
      { qty: 2, name: "Almofadas de carimbo sem tinta" },
      { qty: 5, name: "Alicates furador de papel" },
      { qty: 3, name: "Kits de estecas para biscuit (8 unidades)" },
      { qty: 3, name: "Tesoura vai e vem" },
      { qty: 3, name: "Kit normógrafo" },
      { qty: 1, name: "Kit tesouras com cortes diferentes (6 unidades)" },
      { qty: 6, name: "Reguas Geometricas" },
      { qty: 4, name: "Mini lanterna" }
    ]
  },
  'ls_inf_tools_up_12': {
    items: [
      { qty: 2, name: "Upgrade Eletrônico infantil (6 módulos)" }
    ]
  },
  'ls_inf_tools_up_6': {
    items: [
      { qty: 1, name: "Upgrade Eletrônico infantil (6 módulos)" }
    ]
  }
};

export const BRAZIL_STATES = [
  { name: "Acre", uf: "AC", region: "norte" },
  { name: "Alagoas", uf: "AL", region: "nordeste" },
  { name: "Amapá", uf: "AP", region: "norte" },
  { name: "Amazonas", uf: "AM", region: "norte" },
  { name: "Bahia", uf: "BA", region: "nordeste" },
  { name: "Ceará", uf: "CE", region: "nordeste" },
  { name: "Distrito Federal", uf: "DF", region: "centro_oeste" },
  { name: "Espírito Santo", uf: "ES", region: "sudeste" },
  { name: "Goiás", uf: "GO", region: "centro_oeste" },
  { name: "Maranhão", uf: "MA", region: "nordeste" },
  { name: "Mato Grosso", uf: "MT", region: "centro_oeste" },
  { name: "Mato Grosso do Sul", uf: "MS", region: "centro_oeste" },
  { name: "Minas Gerais", uf: "MG", region: "sudeste" },
  { name: "Pará", uf: "PA", region: "norte" },
  { name: "Paraíba", uf: "PB", region: "nordeste" },
  { name: "Paraná", uf: "PR", region: "sul" },
  { name: "Pernambuco", uf: "PE", region: "nordeste" },
  { name: "Piauí", uf: "PI", region: "nordeste" },
  { name: "Rio de Janeiro", uf: "RJ", region: "sudeste" },
  { name: "Rio Grande do Norte", uf: "RN", region: "nordeste" },
  { name: "Rio Grande do Sul", uf: "RS", region: "sul" },
  { name: "Rondônia", uf: "RO", region: "norte" },
  { name: "Roraima", uf: "RR", region: "norte" },
  { name: "Santa Catarina", uf: "SC", region: "sul" },
  { name: "São Paulo", uf: "SP", region: "ate_700" },
  { name: "Sergipe", uf: "SE", region: "nordeste" },
  { name: "Tocantins", uf: "TO", region: "norte" }
];