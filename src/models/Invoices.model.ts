import { model, Schema } from "mongoose";
import type { IInvoices } from "../interfaces/IInvoices";
import CounterYearModel from "./CounterYear.model";

const InvoicesSchema = new Schema<IInvoices>({
  client: {
    type: String,
    required: true,
  },
  motherGuide: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  totalPallets: {
    type: String,
    required: false,
  },
  totalTVs: {
    type: String,
    required: false,
  },
  totalFreight: {
    type: Number,
    required: true,
    default: 0,
  },
  totalRate: {
    type: Number,
    required: true,
    default: 0,
  },
  totalADM: {
    type: Number,
    required: false,
    default: 0,
  },
  costTransport: {
    type: Number,
    required: true,
    default: 0,
  },
  totalSaleNoTransport: {
    type: Number,
    required: false,
    default: 0,
  },
  totalService: {
    type: Number,
    required: false,
    default: 0,
  },
  totalCosts: {
    type: Number,
    required: true,
    default: 0,
  },
  totalSale: {
    type: Number,
    required: true,
    default: 0,
  },
  totalUtility: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    required: true,
    default: "NO PAID",
    enum: ["NO PAID", "PAID", "OWES"],
  },
  type: {
    type: String,
    required: false,
    enum: ["LUGGAGES", "PALLETS"],
  },
  totalPaid: {
    type: Number,
    required: true,
    default: 0,
  },
});

InvoicesSchema.pre("save", async function () {
  if (!this.isNew) return;

  const currentYear = new Date().getFullYear();

  try {
    const counter = await CounterYearModel.findOneAndUpdate(
      { id: "invoice_counter", year: currentYear },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!counter) throw new Error("");

    const secuencia = counter.seq.toString().padStart(3, "0");

    const clientCode = this.client.trim().substring(0, 3).toUpperCase();

    this.invoiceNumber = `${clientCode}${currentYear}-${secuencia}`;
  } catch (error) {
    throw error;
  }
});

export default model<IInvoices>("Invoices", InvoicesSchema);
