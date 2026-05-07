import { IAccountsCXC } from "@/interfaces/finanzes/IAccounts";
import { model, Schema } from "mongoose";

const AccountsCXCSchema = new Schema<IAccountsCXC>({
  clientName: {
    type: String,
    required: false,
  },
  totalAmount: {
    type: Number,
    required: false,
  },
});

export default model<IAccountsCXC>("AccountsCXC", AccountsCXCSchema);
