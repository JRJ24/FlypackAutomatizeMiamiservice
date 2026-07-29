import { model, Schema } from "mongoose";
import {
  type IPalletsMain,
  type IPalletsDetails,
  IPalletsCalc,
  IPalletSingle,
} from "../interfaces/IPalletsmodel";

const PalletsDetailsSchema = new Schema<IPalletsDetails>(
  {
    lineId: {
      type: String,
      required: false,
      index: true,
    },
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
      required: false,
    },
    inventoryMiamiInvoiceNumber: {
      type: String,
      required: false,
    },
    model: {
      type: String,
      required: true,
    },
    inchs: {
      type: String,
      required: true,
    },
    descriptionModel: {
      type: String,
      required: false,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    quantityUnit: {
      type: Number,
      required: true,
    },
    arrivedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    invoicedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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
    totalFreight: {
      type: Number,
      required: true,
    },
    totalRate: {
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
    packingId: {
      type: String,
      required: false,
      index: true,
    },
    palletDescription: {
      type: String,
      required: true,
    },
    arrivalStatus: {
      type: String,
      enum: ["IN_TRANSIT", "PARTIAL_ARRIVED", "ARRIVED", "MISSING"],
      default: "IN_TRANSIT",
    },
    arrivedAt: {
      type: Date,
      required: false,
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
      required: false,
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
      enum: ["IN_TRANSIT", "PARTIAL_ARRIVED", "ARRIVED", "DELIVERED"],
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
    pallet: {
      type: [PalletSingleSchema],
      required: true,
    },
    status: {
      type: String,
      enum: ["Invoiced", "Partially invoiced", "Not invoiced", "Pending guidance"],
      default: "Not invoiced",
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
