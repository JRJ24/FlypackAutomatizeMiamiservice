import { IMaintenanceCost } from "../interfaces/maintenance/IMaintenance";
import MaintenanceCostModel from "../models/MaintenanceCost.model";

export const MaintenanceCostSeeders = async() => {
  try {
    const costMaintenance:IMaintenanceCost = {
      kgVal: 2.205,
      dollarCost: 0.61,
      customDutyVal: 0.25,
      rate: 65,
      ADM: 0,
      freightSuit: 36.677,
      rateSuit: 0
    }

    const count = await MaintenanceCostModel.countDocuments();

    if(count === 0){
      await MaintenanceCostModel.create(costMaintenance);
    }
  } catch (error) {
    throw new Error(`Error: ${error}`)
  }
}