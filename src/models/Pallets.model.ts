import { model, Schema } from "mongoose";
import {
  type IPalletsMain,
  type IPalletsDetails,
  IPalletsCalc,
  IPalletSingle,
} from "../interfaces/IPalletsmodel";

const PalletsDetailsSchema = new Schema<IPalletsDetails>(
  {
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

    totalUnitPrice: {
      type: Number,
      required: true,
    },
  },
  {
    versionKey: false,
    _id: false,
  },
);

const PalletCalcSchema = new Schema<IPalletsCalc>(
  {
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
      required: true,
    },
    caribeTrans: {
      type: Number,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    utility: {
      type: Number,
      required: true,
    },
  },
  {
    versionKey: false,
    _id: false,
  },
);

const PalletSingleSchema = new Schema<IPalletSingle>(
  {
    palletDescription: {
      type: String,
      required: true,
    },
    pallets: {
      type: [PalletsDetailsSchema],
      required: true,
    },
    calcPallet: {
      type: PalletCalcSchema,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);
const PalletsMainSchema = new Schema<IPalletsMain>(
  {
    clientName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    motherGuide: {
      type: String,
      required: true,
    },
    pallet: {
      type: PalletSingleSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["Invoiced", "Not invoiced"],
      default: "Not invoiced"
    },
    isDelete: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default model<IPalletsMain>("Pallets", PalletsMainSchema);
