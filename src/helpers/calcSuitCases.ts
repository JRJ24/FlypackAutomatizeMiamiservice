import { ISuitCasesData2 } from "@/interfaces/ISuitcasesmodel";

export const CalcSuitCases = async (weightLB: number, quantity: number, price: number) => {
  try {

    const totalWeight = weightLB * quantity;
    const totalFreight = totalWeight * 36.7525;
    const totalRate = totalWeight * 6.83;
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
