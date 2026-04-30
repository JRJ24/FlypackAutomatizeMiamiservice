import {
  ISuitCases,
  ISuitCasesMain,
  ISuitCasesTotals,
} from "@/interfaces/ISuitcasesmodel";
import { model, Schema } from "mongoose";

const totalSuitCases = new Schema<ISuitCasesTotals>(
  {
    totalFreight: {
      type: Number,
      required: true,
    },
    totalRate: {
      type: Number,
      required: true,
    },
    totalCosts: {
      type: Number,
      required: true,
    },
    totalSale: {
      type: Number,
      required: true,
    },
    totalUtility: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const suitCases = new Schema<ISuitCases>(
  {
    modelBrand: {
      type: String,
      required: true,
    },
    weightLb: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    freight: {
      type: Number,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    costVersat: {
      type: Number,
      required: true,
    },
    unitPriceSale: {
      type: Number,
      required: true,
    },
    utility: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const SuitCasesSchema = new Schema<ISuitCasesMain>({
  clientName: {
    type: String,
    required: true,
  },
  suitCases: {
    type: [suitCases],
    required: true,
  },
  totalSuitCases: {
    type: totalSuitCases,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

export default model<ISuitCasesMain>("SuitCases", SuitCasesSchema);
