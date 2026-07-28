export interface IInvoices {
  invoiceNumber: string;
  totalPallets: string;
  totalTVs: string;
  totalFreight: number;
  totalRate: number;
  totalADM: number;
  costTransport: number;
  totalSaleNoTransport: number;
  totalSale: number;
  totalUtility: number;
  totalCosts: number;
  totalService: number;
  client: string;
  clientCode?: string;
  motherGuide: string;
  date: string;
  status: string;
  totalPaid: number;
  type: string;
}
