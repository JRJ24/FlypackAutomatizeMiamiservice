export interface ISuitCases {
  clientName: string;
  motherGuide: string;
  miamiInvoiceNumber?: string;
  clientCode?: string;
  arrivalStatus?: string;
  arrivedAt?: Date;
  deliveredAt?: Date;
  dateArrive: string;
  suitCases: ISuitCasesData[];
  status: string;
  isDelete: boolean;
}

export interface ISuitCasesData {
  inventoryId?: string;
  inventoryMiamiInvoiceNumber?: string;
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
  miamiInvoiceNumber?: string;
  clientCode?: string;
  dateArrive: string;
  items: ISuitCaseItem[];
}

export interface ISuitCaseItem {
  inventoryId?: string;
  inventoryMiamiInvoiceNumber?: string;
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
