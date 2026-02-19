
import { InfraItem, Region, AppState } from './types';

export const REGIONS: Region[] = [
  { id: 'ate_700', label: 'Até 700Km', priceSimple: 1500, priceAssembly: 4000 },
  { id: 'sudeste', label: 'Sudeste', priceSimple: 1500, priceAssembly: 8500 },
  { id: 'sul', label: 'Sul', priceSimple: 2500, priceAssembly: 8500 },
  { id: 'centro_oeste', label: 'Centro-Oeste', priceSimple: 2500, priceAssembly: 8500 },
  { id: 'nordeste', label: 'Nordeste', priceSimple: 4000, priceAssembly: 15500 },
  { id: 'norte', label: 'Norte', priceSimple: 5000, priceAssembly: 21800 },
];

export const BRAZIL_STATES = [
    { uf: 'AC', name: 'Acre', region: 'norte' },
    { uf: 'AL', name: 'Alagoas', region: 'nordeste' },
    { uf: 'AP', name: 'Amapá', region: 'norte' },
    { uf: 'AM', name: 'Amazonas', region: 'norte' },
    { uf: 'BA', name: 'Bahia', region: 'nordeste' },
    { uf: 'CE', name: 'Ceará', region: 'nordeste' },
    { uf: 'DF', name: 'Distrito Federal', region: 'centro_oeste' },
    { uf: 'ES', name: 'Espírito Santo', region: 'sudeste' },
    { uf: 'GO', name: 'Goiás', region: 'centro_oeste' },
    { uf: 'MA', name: 'Maranhão', region: 'nordeste' },
    { uf: 'MT', name: 'Mato Grosso', region: 'centro_oeste' },
    { uf: 'MS', name: 'Mato Grosso do Sul', region: 'centro_oeste' },
    { uf: 'MG', name: 'Minas Gerais', region: 'sudeste' },
    { uf: 'PA', name: 'Pará', region: 'norte' },
    { uf: 'PB', name: 'Paraíba', region: 'nordeste' },
    { uf: 'PR', name: 'Paraná', region: 'sul' },
    { uf: 'PE', name: 'Pernambuco', region: 'nordeste' },
    { uf: 'PI', name: 'Piauí', region: 'nordeste' },
    { uf: 'RJ', name: 'Rio de Janeiro', region: 'sudeste' },
    { uf: 'RN', name: 'Rio Grande do Norte', region: 'nordeste' },
    { uf: 'RS', name: 'Rio Grande do Sul', region: 'sul' },
    { uf: 'RO', name: 'Rondônia', region: 'norte' },
    { uf: 'RR', name: 'Roraima', region: 'norte' },
    { uf: 'SC', name: 'Santa Catarina', region: 'sul' },
    { uf: 'SP', name: 'São Paulo', region: 'ate_700' },
    { uf: 'SE', name: 'Sergipe', region: 'nordeste' },
    { uf: 'TO', name: 'Tocantins', region: 'norte' }
];

export const INFRA_CATALOG: InfraItem[] = [
  // --- Mídia Fundamental e Médio ---
  {
    id: 'midia_padrao_24',
    label: 'Oficina Padrão - 24 alunos',
    category: 'midia',
    type: 'ambientacao',
    price: 30000,
    description: 'Mobiliário completo para sala de mídia (mesas, cadeiras, armários) adequado para 24 alunos.',
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'midia_up_12',
    label: 'Upgrade 12 alunos',
    category: 'midia',
    type: 'ambientacao',
    price: 5000,
    description: 'Expansão de mobiliário para atender +12 alunos adicionais.',
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'midia_up_6',
    label: 'Upgrade 6 alunos',
    category: 'midia',
    type: 'ambientacao',
    price: 2500,
    description: 'Expansão de mobiliário para atender +6 alunos adicionais.',
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'midia_ferr_padrao',
    label: 'Ferramentas Padrão',
    category: 'midia',
    type: 'ferramentas',
    price: 24000,
    description: 'Kit de produção audiovisual: Câmeras, Tripés, Iluminação básica e Microfones.',
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'midia_ferr_pc',
    label: 'Upgrade Computadores',
    category: 'midia',
    type: 'ferramentas',
    price: 14000,
    description: 'Estações de edição: 4 Computadores de alta performance para renderização de vídeo.',
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
    description: 'Bancadas robustas, painéis de ferramentas e armários organizadores para espaço Maker (24 alunos).',
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'maker_up_12',
    label: 'Upgrade 12 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 15500,
    description: 'Mobiliário adicional para +12 alunos no espaço Maker.',
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'maker_up_6',
    label: 'Upgrade 6 alunos',
    category: 'maker',
    type: 'ambientacao',
    price: 4500,
    description: 'Mobiliário adicional para +6 alunos no espaço Maker.',
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'maker_minima',
    label: 'Ambientação Mínima',
    category: 'maker',
    type: 'ambientacao',
    price: 2500,
    description: 'Kit básico de organização: Caixas, sinalização e painel reduzido. (Não inclui bancadas).',
    requiresAssembly: false, // No assembly needed
    isBase: false // Special handling
  },
  {
    id: 'maker_ferr_padrao',
    label: 'Ferramentas Padrão',
    category: 'maker',
    type: 'ferramentas',
    price: 19000,
    description: 'Kit Maker: Impressora 3D, Cortadora Laser de pequeno porte, Ferramentas manuais e Elétricas.',
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'maker_ferr_digitais',
    label: 'Upgrade P. Digitais',
    category: 'maker',
    type: 'ferramentas',
    price: 18000,
    description: 'Kit de Fabricação Digital: Plotter de recorte e scanners 3D de mão.',
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'maker_ferr_pc',
    label: 'Upgrade Computadores',
    category: 'maker',
    type: 'ferramentas',
    price: 14000,
    description: '4 Notebooks ou Chromebooks para modelagem 3D e programação.',
    requiresAssembly: false,
    isUpgrade: true
  },
  {
    id: 'maker_ferr_red_18',
    label: 'Ferramentas Red. - 18 alunos',
    category: 'maker',
    type: 'ferramentas',
    price: 8500,
    description: 'Kit Maker Reduzido: Impressora 3D e ferramentas manuais essenciais para turmas menores.',
    requiresAssembly: false
  },

  // --- Maker Infantil ---
  {
    id: 'infantil_padrao_18',
    label: 'Oficina Padrão - 18 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 22500,
    description: 'Mobiliário ergonômico infantil: Mesas baixas, tapetes de atividade e organizadores acessíveis.',
    requiresAssembly: true,
    isBase: true
  },
  {
    id: 'infantil_up_12',
    label: 'Upgrade 12 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 8500,
    description: 'Expansão infantil para +12 alunos.',
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'infantil_up_6',
    label: 'Upgrade 6 alunos',
    category: 'infantil',
    type: 'ambientacao',
    price: 1200,
    description: 'Expansão infantil para +6 alunos.',
    requiresAssembly: true,
    isUpgrade: true
  },
  {
    id: 'infantil_carrinho',
    label: 'Carrinho',
    category: 'infantil',
    type: 'ambientacao',
    price: 4000, 
    description: 'Carrinho Maker Móvel: Armazenamento sobre rodas para levar a oficina até a sala de aula.',
    requiresAssembly: false, 
    isBase: false // Special handling
  },
  {
    id: 'infantil_ferr_18',
    label: 'Ferramentas 18 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 8500,
    description: 'Ferramentas seguras para crianças: Serras plásticas, parafusadeiras de baixa rotação e consumíveis.',
    requiresAssembly: false,
    isBase: true
  },
  {
    id: 'infantil_ferr_up_6',
    label: 'Upgrade 6 alunos',
    category: 'infantil',
    type: 'ferramentas',
    price: 1500,
    description: 'Kit extra de ferramentas infantis para +6 alunos.',
    requiresAssembly: false,
    isUpgrade: true
  }
];

export const INITIAL_APP_STATE: AppState = {
  client: {
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
  }
};