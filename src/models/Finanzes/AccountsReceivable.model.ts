import { IAccountsReceivable } from "@/interfaces/finanzes/IAccounts";
import { model, Schema } from "mongoose";

const AccountsReceivableSchema = new Schema<IAccountsReceivable>({
  clientName: {
    type: String,
    required: true,
  },
  motherGuide: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  status: {
    type: String,
    enum: ["PENDING", "PARTIALLY_PAID", "PAID"],
    default: "PENDING",
  },
  currency: {
    type: String,
    enum: ["RD", "USD"],
    default: "RD",
  },
  notes: {
    type: String,
    required: false,
  },
}, {
  timestamps: true
});

export default model<IAccountsReceivable>(
  "AccountsReceivable",
  AccountsReceivableSchema,
);
