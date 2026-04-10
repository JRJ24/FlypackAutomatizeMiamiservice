import { model, Schema } from "mongoose";
import type { ICostModel } from "../interfaces/ICostmodel";

const CostSchema = new Schema<ICostModel>({
  freight: {
    type: Number,
    required: true
  },
  customsDuty: {
    type: Number,
    required: true
  },
  ADM: {
    type: Number,
    required: true
  },
  dollar: {
    type: Number,
    required: true
  },
  costLB: {
    type: Number,
    required: true
  },
  isInvalidate: {
    type: Boolean,
    required: true,
    default: false
  }
})

export default model<ICostModel>("Costs", CostSchema);