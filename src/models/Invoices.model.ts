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
    required: false
  },
  totalTVs: {
    type: String,
    required: false
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
    required: false
  },
  totalService: {
    type: Number,
    required: false
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
  type: {
    type: String,
    required: true,
    enum: ["LUGGAGES", "PALLETS"]
  },
  totalPaid: {
    type: Number,
    required: true,
    default: 0,
  }
})

export default model<IInvoices>("Invoices", InvoicesSchema);