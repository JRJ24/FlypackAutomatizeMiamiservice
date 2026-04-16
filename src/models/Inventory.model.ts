import { model, Schema } from "mongoose";
import type { IInventoryTV } from "../interfaces/IInventory";

const InventorySchema = new Schema<IInventoryTV>({
  brandTV: {
    type: String,
    required: true
  },
  inchs: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  isDisabled: {
    type: Boolean,
    required: true,
    default: false
  }
})

export default model<IInventoryTV>("Inventory", InventorySchema);