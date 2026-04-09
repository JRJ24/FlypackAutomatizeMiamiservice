import { model, Schema } from "mongoose";
import type {
  IPalletsMain,
  IPalletsDetails,
} from "../interfaces/IPalletsmodel";

const PalletsDetailsSchema = new Schema<IPalletsDetails>({
  model: {
    type: String,
    required: true,
  },
  inchs: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  quantityUnit: {
    type: Number,
    required: true,
  },
  weightKG: {
    type: Number,
    required: true,
  },
  weightLB: {
    type: Number,
    required: true,
  },
  costLbUS: {
    type: Number,
    required: true,
  },
  customDuty: {
    type: Number,
    required: true,
  },
  totalUSD: {
    type: Number,
    required: true,
  },
  totalRD: {
    type: Number,
    required: true,
  },
  ADM: {
    type: Number,
    required: true
  },
  caribeTrans: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true,
  },
  totalUnitPrice: {
    type: Number,
    required: true
  },
  utility: {
    type: Number,
    required: true
  }
}, {
  versionKey: false,
  _id: false
});

const PalletsMainSchema = new Schema<IPalletsMain>({
  clientName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  motherGuide: {
    type: String,
    required: true,
  },
  pallets: {
    type: [PalletsDetailsSchema],
    required: true
  },
  isDelete: {
    type: Boolean,
    required: true,
    default: false
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true
})

export default model<IPalletsMain>("Pallets", PalletsMainSchema);
