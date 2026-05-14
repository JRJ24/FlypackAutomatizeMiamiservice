export interface IAccountsReceivable {
  clientName: string;
  motherGuide: string;
  amount: number;
  invoiceNumber: string;
  date: Date;
  // dueDate: Date;
  status: string;
  currency: string;
  notes?: string;
  createdAt: Date;
}

export interface IAccountsAvailable {
  bankAccountName: string;
  amount: number;
  // type: string;
  // currency: string;
  lastUpdated?: Date;
  isActive?: boolean;
}

export interface IAccountsCXC {
  clientName: string;
  totalAmount: number;
  lastUpdate: Date;
  isActive: boolean;
  // currency: string;
}

export interface IDebit{
  bankAccountName: string,
  date: Date,
  amount: number,
  reason: string,
  isActive: boolean,
}

