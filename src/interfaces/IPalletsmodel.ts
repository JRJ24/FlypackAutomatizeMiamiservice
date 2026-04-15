export interface IPalletsMain {
  clientName: string;
  date: string;
  motherGuide: string;
  pallet: IPalletSingle;
  isDelete: boolean;
  isActive: boolean;
  createAt: Date;
  updateAt: Date;
}


export interface IPalletSingle {
  palletDescription: string;
  pallets: IPalletsDetails[];
  calcPallet: IPalletsCalc;
}

export interface IPalletsDetails {
  model: string;
  inchs: string;
  descriptionModel: string;
  unitPrice: number;
  quantityUnit: number;
  totalUnitPrice: number;
}

export interface IPalletsCalc {
  weightLB: number;
  weightKG: number;
  costLbUS: number;
  customDuty: number;
  totalUSD: number;
  totalRD: number;
  ADM: number;
  caribeTrans: number;
  totalCost: number;
  totalPrice: number;
  utility: number;
}


export interface IPalletNew {
  clientName: string;
  date: string;
  motherGuide: string;
  pallet: {
    palletDescription: string;
    pallets: [{
      model: string;
      inchs: string;
      descriptionModel: string;
      unitPrice: number;
      quantityUnit: number;
      totalUnitPrice: number
    }];
    calcPallet: {
      weightLB: number;
    }
  }
}