import { model, Schema } from "mongoose";
import type { IPriceModel } from "../interfaces/IPricesmodel";

const PriceSchema = new Schema<IPriceModel>({
  model: {
    type: String,
    required: true
  },
  inches: {
    type: String,
    required: true
  },
  unitPrice: {
    type: Number,
    required: true
  },
  isSpecial: {
    type: Boolean,
    required: true
  }
})

export default model<IPriceModel>("Price", PriceSchema)