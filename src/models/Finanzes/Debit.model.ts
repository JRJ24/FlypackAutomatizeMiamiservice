import { IDebit } from "./../../interfaces/finanzes/IAccounts";
import { model, Schema } from "mongoose";

const DebitSchema = new Schema<IDebit>({
  bankAccountName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: false,
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  }
})

export default model<IDebit>('Debit Accounts', DebitSchema)