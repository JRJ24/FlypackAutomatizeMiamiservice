import { ISuitCasesData2 } from "@/interfaces/ISuitcasesmodel";
import { IMaintenanceCost } from "@/interfaces/maintenance/IMaintenance";

export const CalcSuitCases = async (weightLB: number, quantity: number, price: number,  maintenance: IMaintenanceCost) => {
  try {

    const totalWeight = weightLB * quantity;
    const totalFreight = totalWeight * maintenance.freightSuit;
    const totalRate = totalWeight * maintenance.rateSuit;
    const totalCostVersat = totalFreight + totalRate;
    const totalUnitPrice = price * quantity;
    const totalUtility = totalUnitPrice - totalCostVersat;
    
    const suitCasesCalc: ISuitCasesData2 = {
      weightLB: totalWeight,
      quantity: quantity,
      totalFreight: totalFreight,
      totalRate: totalRate,
      totalCostVersat: totalCostVersat,
      totalUnitPrice: totalUnitPrice,
      totalUtility: totalUtility,
    }

    return suitCasesCalc;
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
};
