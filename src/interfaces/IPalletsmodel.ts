export interface IPalletsMain {
  clientName: string,
  date: string,
  motherGuide: string;
  pallets: IPalletsDetails[];
  isDelete: boolean;
  isActive: boolean;
  createAt: Date;
  updateAt: Date;
}

export interface IPalletsDetails {
  model: string,
  inchs: string,
  unitPrice: number,
  quantityUnit: Number,
  weightLB: number,
  weightKG: number,
  costLbUS: number,
  customDuty: number,
  totalUSD: number,
  totalRD: number,
  ADM: number,
  caribeTrans: number,
  totalCost: number,
  totalUnitPrice: number,
  utility: number,
}