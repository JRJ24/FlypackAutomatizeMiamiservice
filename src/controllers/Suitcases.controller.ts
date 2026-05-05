import { Request, Response } from "express";
import SuitcasesModel from "./../models/Suitcases.model";
import type {
  ISuitCases,
  ISuitCasesClientSend,
  ISuitCasesData,
} from "@/interfaces/ISuitcasesmodel";
import PriceModel from "./../models/PriceModel";
import MaintenanceCostModel from "@/models/MaintenanceCost.model";
import { CalcSuitCases } from "./../helpers/calcSuitCases";

const createSuitCases = async (req: Request, res: Response) => {
  try {
    const data: ISuitCasesClientSend = req.body;

    if (
      !data ||
      !data.items ||
      !Array.isArray(data.items) ||
      data.items.length === 0
    ) {
      return res.status(400).json({
        ok: false,
        message: "No data or empty items array",
        mensaje: "No hay datos o el arreglo de maletas está vacío",
        data: null,
      });
    }

    // const maintenance = await MaintenanceCostModel.findOne();
    const processedSuitCases: ISuitCasesData[] = [];

    for (const item of data.items) {
      const priceBrand = await PriceModel.findOne({
        model: item.brandModel,
        inches: item.inches,
        isSpecial: false,
      });

      if (!priceBrand) {
        return res.status(404).json({
          ok: false,
          message: `No price found for model: ${item.brandModel} ${item.inches}"`,
          mensaje: `No se encontró precio para el modelo: ${item.brandModel} ${item.inches}"`,
          data: null,
        });
      }
      
      console.log(priceBrand.unitPrice, "esto llega");

      const suitCalc = await CalcSuitCases(
        item.weightLB,
        item.quantity,
        priceBrand.unitPrice,
      );

      processedSuitCases.push({
        brandModel: item.brandModel,
        inches: item.inches,
        weightLB: suitCalc.weightLB,
        quantity: suitCalc.quantity,
        totalFreight: suitCalc.totalFreight,
        totalRate: suitCalc.totalRate,
        totalCostVersat: suitCalc.totalCostVersat,
        totalUnitPrice: suitCalc.totalUnitPrice,
        totalUtility: suitCalc.totalUtility,
      });
    }

    const payloadSuit: ISuitCases = {
      clientName: data.clientName,
      motherGuide: data.motherGuide,
      dateArrive: data.dateArrive,
      suitCases: processedSuitCases,
    };

    const suitCases = await SuitcasesModel.create(payloadSuit);

    if (!suitCases) {
      return res.status(400).json({
        ok: false,
        message: "No save",
        mensaje: "No guardado",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Save",
      mensaje: "Guardado correctamente",
      data: suitCases,
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

const getSuitCases = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const getSuitCasesByMotherGuide = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const updateSuitCases = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const deleteSuitCases = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

export {
  createSuitCases,
  getSuitCasesByMotherGuide,
  getSuitCases,
  updateSuitCases,
  deleteSuitCases,
};
