
export interface ClientInfo {
  schoolName: string;
  contactName: string;
  date: string;
  state: string; // Novo campo
  segments: string[];
}

export type CategoryType = 'midia' | 'maker' | 'infantil';
export type ItemType = 'ambientacao' | 'ferramentas';

export interface InfraItem {
  id: string;
  label: string;
  category: CategoryType;
  type: ItemType;
  price: number;
  description: string;
  requiresAssembly: boolean; // True = Frete + Montagem (Table 2), False = Frete (Table 1)
  isUpgrade?: boolean;
  isBase?: boolean;
}

export interface Region {
  id: string;
  label: string;
  priceSimple: number;   // Table 1 (Frete)
  priceAssembly: number; // Table 2 (Frete + Montagem)
}

export interface CommercialConfig {
  totalStudents: number;
  contractDuration: 1 | 3;
  useMarketplace: boolean;
  applyInfraBonus: boolean;
  // Valores manuais definidos pelo Master (opcional)
  customValues?: {
    materialPricePerYear?: number;
    infraTotal?: number;
    materialBonus?: number;
    infraBonus?: number;
  };
}

// Global App State
export interface AppState {
  client: ClientInfo;
  regionId: string;
  selectedInfraIds: string[];
  commercial: CommercialConfig;
}