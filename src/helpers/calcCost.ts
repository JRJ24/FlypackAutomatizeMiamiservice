import { IPalletsCalc } from "../interfaces/IPalletsmodel";
import { IMaintenanceCost } from "../interfaces/maintenance/IMaintenance"

export const CalcCost = async (weightLB: number, maintenance: IMaintenanceCost, totalPrice: number) => {
  try {
    const weightKG: number = weightLB / maintenance.kgVal;
    const costDollarLB: number = weightLB * maintenance.dollarCost;
    const customDutyUS: number = weightKG * maintenance.customDutyVal;
    const totalUS: number = costDollarLB + customDutyUS;
    const totalRD: number = maintenance.rate * totalUS;
    const caribeTrans: number = weightLB * (0.1) * maintenance.rate;
    const totalCost: number = totalRD + maintenance.ADM + caribeTrans;
    const utility: number = totalPrice - totalCost;
    const totalFreight: number = costDollarLB * maintenance.rate;
    const totalRate: number = customDutyUS * maintenance.rate;
    
    const palletCalc:IPalletsCalc = {
      weightLB: weightLB,
      weightKG: weightKG,
      costLbUS: costDollarLB,
      customDuty: customDutyUS,
      totalUSD: totalUS,
      totalRD: totalRD,
      ADM: maintenance.ADM,
      caribeTrans: caribeTrans,
      totalCost: totalCost,
      totalPrice: totalPrice,
      totalFreight: totalFreight,
      totalRate: totalRate,
      utility: utility
    }

    return palletCalc;
    
  } catch (error) {
    throw new Error(`Error: ${error}`)
  }
} 