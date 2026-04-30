export interface ISuitCasesMain {
  clientName: string;
  suitCases: ISuitCases[];
  totalSuitCases: ISuitCasesTotals;
  status: string;
  createAt: Date;
  updateAt: Date;
}

export interface ISuitCases {
  modelBrand: string;
  weightLb: number;
  inches: number;
  quantity: number;
  freight: number;
  rate: number;
  costVersat: number;
  unitPriceSale: number;
  utility: number;
}

export interface ISuitCasesClient {
  modelBrand: string;
  weightLb: number;
  inches: string;
  quantity: number;
}

export interface ISuitCasesTotals {
  totalFreight: number; // Suma de los fletes
  totalRate: number; // Suma de la tasa
  totalCosts: number; // Suma de los costos
  totalSale: number; // Suma de las ventas
  totalUtility: number; // Suma de la utilidades
}

export interface ISuitClientSend {
  clientName: string;
  suitCases: ISuitCasesClient[];
}
