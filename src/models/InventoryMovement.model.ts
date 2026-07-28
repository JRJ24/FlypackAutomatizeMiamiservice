import { model, Schema, Types } from "mongoose";

export interface IInventoryMovement {
  inventoryId: Types.ObjectId;
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  miamiInvoiceNumber?: string;
  referenceType?: string;
  referenceId?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["ENTRY", "EXIT", "ADJUSTMENT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    resultingQuantity: {
      type: Number,
      required: true,
    },
    miamiInvoiceNumber: String,
    referenceType: String,
    referenceId: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryMovementSchema.index({ inventoryId: 1, createdAt: -1 });
InventoryMovementSchema.index({ miamiInvoiceNumber: 1 });

export default model<IInventoryMovement>(
  "InventoryMovement",
  InventoryMovementSchema,
);
