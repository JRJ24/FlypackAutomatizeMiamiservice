import { ICounter } from "@/interfaces/ICounter";
import { model, Schema } from "mongoose";


const counterSchema = new Schema<ICounter>({
  id: { type: String, required: true }, // Ej: "invoice_counter"
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 }
});

// Creamos un índice para que no pueda existir el mismo ID para el mismo año
counterSchema.index({ id: 1, year: 1 }, { unique: true });

export default model<ICounter>('Counter', counterSchema);