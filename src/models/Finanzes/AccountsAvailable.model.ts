import { IAccountsAvailable } from "@/interfaces/finanzes/IAccounts";
import { model, Schema } from "mongoose";

const AccountsAvailableSchema = new Schema<IAccountsAvailable>({
  bankAccountName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  lastUpdated: {
    type: Date,
  },
});

export default model<IAccountsAvailable>('AccountsAvailable', AccountsAvailableSchema)