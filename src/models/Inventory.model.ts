import { model, Schema } from "mongoose";
import type { IInventoryTV } from "../interfaces/IInventory";

const InventorySchema = new Schema<IInventoryTV>({
  brandTV: {
    type: String,
    required: true,
  },
  inchs: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  client: {
    type: String,
    required: true
  },
  lastMiamiInvoiceNumber: {
    type: String,
    required: false,
  },
  isDisabled: {
    type: Boolean,
    required: true,
    default: false,
  },
});

InventorySchema.index(
  { client: 1, brandTV: 1, inchs: 1, model: 1 },
  { unique: true, partialFilterExpression: { isDisabled: false } },
);

export default model<IInventoryTV>("Inventory", InventorySchema);
