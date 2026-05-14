import { Request, Response } from "express";
import MaintenanceCostModel from "../models/MaintenanceCost.model";
import PalletsModel from "./../models/Pallets.model";
import { CalcCost } from "./../helpers/calcCost";
import SuitcasesModel from "./../models/Suitcases.model";
import { CalcSuitCases } from "./../helpers/calcSuitCases";

const getMaintenance = async (req: Request, res: Response) => {
  try {
    const maintenance = await MaintenanceCostModel.find();

    if (!maintenance) {
      return res.status(404).json({
        ok: false,
        message: "No found",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Y",
      mensaje: "Y",
      data: maintenance,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const UpdateMaintenances = async (req: Request, res: Response) => {
  try {
    const { _id, ...data } = req.body;

    const maintenance = await MaintenanceCostModel.findByIdAndUpdate(
      _id,
      data,
      {
        returnDocument: "after",
      },
    );

    if (!maintenance) {
      return res.status(404).json({
        ok: false,
        message: "No update",
        mensaje: "No actualizado",
        data: null,
      });
    }

    // =========================
    // UPDATE PALLETS
    // =========================

    const activeGuides = await PalletsModel.find({
      status: "Not invoiced",
    });

    for (const guide of activeGuides) {
      let isModified = false;

      const updateOperations: Record<string, any> = {};

      if (!guide.pallet || !Array.isArray(guide.pallet)) continue;

      for (let i = 0; i < guide.pallet.length; i++) {
        const singlePallet: any = guide.pallet[i];

        if (!singlePallet.pallets || !Array.isArray(singlePallet.pallets))
          continue;

        const currentGlobalTotalPrice = singlePallet.pallets.reduce(
          (acc: number, item: any) => acc + (item.totalUnitPrice || 0),
          0,
        );

        if (!singlePallet.calcPallet) continue;

        const weightLB = singlePallet.calcPallet.weightLB;

        const newCalculations = await CalcCost(
          weightLB,
          maintenance,
          currentGlobalTotalPrice,
        );

        updateOperations[`pallet.${i}.calcPallet`] = newCalculations;

        isModified = true;
      }

      if (isModified) {
        await PalletsModel.updateOne(
          { _id: guide._id },
          { $set: updateOperations },
        );
      }
    }

    // =========================
    // UPDATE SUITCASES
    // =========================

    const activeSuitCases = await SuitcasesModel.find({
      status: "Not invoiced",
      isDelete: false,
    });

    for (const suitcaseDoc of activeSuitCases) {
      let isModified = false;

      const updatedSuitCases = [];

      for (const suitCase of suitcaseDoc.suitCases) {
        const recalculated = await CalcSuitCases(
          suitCase.weightLB,
          suitCase.quantity,
          suitCase.totalUnitPrice / suitCase.quantity,
          maintenance,
        );

        updatedSuitCases.push({
          brandModel: suitCase.brandModel,
          inches: suitCase.inches,
          modelDescription: suitCase.modelDescription,
          quantity: suitCase.quantity,

          weightLB: recalculated.weightLB,
          totalFreight: recalculated.totalFreight,
          totalRate: recalculated.totalRate,
          totalCostVersat: recalculated.totalCostVersat,
          totalUnitPrice: recalculated.totalUnitPrice,
          totalUtility: recalculated.totalUtility,
        });

        isModified = true;
      }

      if (isModified) {
        await SuitcasesModel.updateOne(
          { _id: suitcaseDoc._id },
          {
            $set: {
              suitCases: updatedSuitCases,
            },
          },
        );
      }
    }

    return res.status(200).json({
      ok: true,
      message: "Y",
      mensaje: "Y",
      data: maintenance,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

export { getMaintenance, UpdateMaintenances };
