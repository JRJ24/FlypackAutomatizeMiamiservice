export interface IPalletsMain {
  clientName: string;
  date: string;
  motherGuide: string;
  miamiInvoiceNumber?: string;
  clientCode?: string;
  arrivalStatus?: string;
  arrivedAt?: Date;
  deliveredAt?: Date;
  pallet: IPalletSingle[];
  status: string;
  isDelete: boolean;
  isActive: boolean;
  createAt: Date;
  updateAt: Date;
}

export interface DiskContainers {
  disk: IPalletSingle[];
}
export interface IPalletSingle {
  packingId?: string;
  palletDescription: string;
  arrivalStatus?: string;
  arrivedAt?: Date;
  pallets: IPalletsDetails[];
  calcPallet: IPalletsCalc;
}

export interface IPalletsDetails {
  lineId?: string;
  inventoryId?: string;
  inventoryMiamiInvoiceNumber?: string;
  model: string;
  inchs: string;
  descriptionModel: string;
  unitPrice: number;
  quantityUnit: number;
  arrivedQuantity?: number;
  invoicedQuantity?: number;
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
  totalFreight: number;
  totalRate: number;
  utility: number;
}


export interface IPalletNew {
  clientName: string;
  date: string;
  motherGuide: string;
  miamiInvoiceNumber?: string;
  clientCode?: string;
  pallet: {
    palletDescription: string;
    pallets: {
      lineId?: string;
      inventoryId?: string;
      inventoryMiamiInvoiceNumber?: string;
      model: string;
      inchs: string;
      descriptionModel: string;
      unitPrice: number;
      quantityUnit: number;
      arrivedQuantity?: number;
      invoicedQuantity?: number;
      totalUnitPrice: number
    }[];
    calcPallet: {
      weightLB: number;
    }
  }
}
