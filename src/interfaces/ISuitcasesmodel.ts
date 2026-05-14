export interface ISuitCases {
  clientName: string;
  motherGuide: string;
  dateArrive: string;
  suitCases: ISuitCasesData[];
  status: string;
  isDelete: boolean;
}

export interface ISuitCasesData {
  brandModel: string;
  inches: string;
  weightLB: number;
  modelDescription: string;
  quantity: number;
  totalFreight: number;
  totalRate: number;
  totalCostVersat: number;
  totalUnitPrice: number;
  totalUtility: number;
}

export interface ISuitCasesClientSend {
  clientName: string;
  motherGuide: string;
  dateArrive: string;
  items: ISuitCaseItem[];
}

export interface ISuitCaseItem {
  brandModel: string;
  inches: string;
  weightLB: number;
  modelDescription: string;
  quantity: number;
}

export interface ISuitCasesData2 {
  weightLB: number;
  quantity: number;
  totalFreight: number;
  totalRate: number;
  totalCostVersat: number;
  totalUnitPrice: number;
  totalUtility: number;
}
