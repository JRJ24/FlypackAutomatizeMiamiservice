import { Imodels } from "./../interfaces/modelsReference";
import { model, Schema } from "mongoose";

const modelReferenceSchema = new Schema<Imodels>({
  modelName: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
})

export default model<Imodels>('ModelsTVReference', modelReferenceSchema);