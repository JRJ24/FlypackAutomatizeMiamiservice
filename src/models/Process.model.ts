import { model, Schema } from "mongoose";
import { IProcessmodel } from "../interfaces/IProcessmodel";

const ProcessModelSchema = new Schema<IProcessmodel>(
  {
    nameProcess: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isDelete: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model<IProcessmodel>("Process", ProcessModelSchema);
