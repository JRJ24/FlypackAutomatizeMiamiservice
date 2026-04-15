import { model, Schema } from "mongoose";
import type { IMaintenanceCost } from "../interfaces/maintenance/IMaintenance";

const maintenanceSchema = new Schema<IMaintenanceCost>({
  kgVal: {
    type: Number,
    required: true
  },
  dollarCost: {
    type: Number,
    required: true
  },
  customDutyVal: {
    type: Number,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  ADM: {
    type: Number,
    required: true
  }
}, {
  versionKey: false
})

export default model<IMaintenanceCost>("Maintenance", maintenanceSchema)