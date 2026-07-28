import type { ISuitCases, ISuitCasesData } from "@/interfaces/ISuitcasesmodel";
import { model, Schema } from "mongoose";

const DataSuitCasesSchema = new Schema<ISuitCasesData>({
  brandModel: {
    type: String,
    required: true,
  },
  inches: {
    type: String,
    required: true,
  },
  weightLB: {
    type: Number,
    required: true,
  },
  modelDescription: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
  },
  totalFreight: {
    type: Number,
    required: true,
  },
  totalRate: {
    type: Number,
    required: true,
  },
  totalCostVersat: {
    type: Number,
    required: true,
  },
  totalUnitPrice: {
    type: Number,
    required: true,
  },
  totalUtility: {
    type: Number,
    required: true,
  },
});

const SuitCasesSchema = new Schema<ISuitCases>({
  clientName: {
    type: String,
    required: true,
  },
  motherGuide: {
    type: String,
    required: true,
  },
  miamiInvoiceNumber: {
    type: String,
    required: false,
    index: true,
  },
  clientCode: {
    type: String,
    required: false,
    index: true,
  },
  arrivalStatus: {
    type: String,
    enum: ["IN_TRANSIT", "ARRIVED", "DELIVERED"],
    default: "IN_TRANSIT",
  },
  arrivedAt: {
    type: Date,
    required: false,
  },
  deliveredAt: {
    type: Date,
    required: false,
  },
  dateArrive: {
    type: String,
    required: true,
  },
  suitCases: {
    type: [DataSuitCasesSchema],
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["Invoiced", "Not invoiced"],
    default: "Not invoiced",
  },
  isDelete: {
    type: Boolean,
    required: true,
    default: false,
  },
});

export default model<ISuitCases>("SuitCases", SuitCasesSchema);
