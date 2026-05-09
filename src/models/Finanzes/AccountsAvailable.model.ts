import { IAccountsAvailable } from "@/interfaces/finanzes/IAccounts";
import { model, Schema } from "mongoose";

const AccountsAvailableSchema = new Schema<IAccountsAvailable>({
  bankAccountName: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
  },
  lastUpdated: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
});

export default model<IAccountsAvailable>('AccountsAvailable', AccountsAvailableSchema)