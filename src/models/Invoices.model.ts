import { model, Schema } from "mongoose";
import type { IInvoices } from "../interfaces/IInvoices";

const InvoicesSchema = new Schema<IInvoices>({
  client: {
    type: String,
    required: true
  },
  motherGuide: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  totalPallets: {
    type: String,
    required: true
  },
  totalTVs: {
    type: String,
    required: true
  },
  totalFreight: {
    type: Number,
    required: true
  },
  totalRate: {
    type: Number,
    required: true
  },
  totalADM: {
    type: Number,
    required: true
  },
  totalService: {
    type: Number,
    required: true
  },
  totalCosts: {
    type: Number,
    required: true
  },
  totalSale: {
    type: Number,
    required: true
  },
  totalUtility: {
    type: Number, 
    required: true
  },
  status: {
    type: String,
    required: true,
    default: "NO PAID",
    enum: ["NO PAID", "PAID", "OWES"]
  },
  totalPaid: {
    type: Number,
    required: true,
    default: 0,
  }
})

export default model<IInvoices>("Invoices", InvoicesSchema);