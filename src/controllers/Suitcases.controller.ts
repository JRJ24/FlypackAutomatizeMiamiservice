import { Request, Response } from "express";
import SuitcasesModel from "./../models/Suitcases.model";
import type {
  ISuitCases,
  ISuitCasesClientSend,
  ISuitCasesData,
} from "@/interfaces/ISuitcasesmodel";
import PriceModel from "./../models/PriceModel";
import MaintenanceCostModel from "./../models/MaintenanceCost.model";
import { CalcSuitCases } from "./../helpers/calcSuitCases";
import InventoryModel from "./../models/Inventory.model";

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

    const processedSuitCases: ISuitCasesData[] = [];

    /*
      -----------------------------------------
      PROCESS SUITCASES
      -----------------------------------------
    */

    for (const item of data.items) {
      const isSpecial = data.clientName === "Daniel";

      const priceBrand = await PriceModel.findOne({
        model: item.brandModel,
        inches: item.inches,
        isSpecial,
      });

      if (!priceBrand) {
        return res.status(404).json({
          ok: false,
          message: `No price found for model: ${item.brandModel} ${item.inches}"`,
          mensaje: `No se encontró precio para el modelo: ${item.brandModel} ${item.inches}"`,
          data: null,
        });
      }
      const maintenance = await MaintenanceCostModel.findOne();

      if (!maintenance) {
        return res.status(404).json({
          ok: false,
          message: "Maintenance cost not found",
          mensaje: "Costo de mantenimiento no encontrado",
          data: null,
        });
      }

      const suitCalc = await CalcSuitCases(
        item.weightLB,
        item.quantity,
        priceBrand.unitPrice,
        maintenance
      );

      processedSuitCases.push({
        brandModel: item.brandModel,
        inches: item.inches,
        modelDescription: item.modelDescription,
        weightLB: suitCalc.weightLB,
        quantity: suitCalc.quantity,
        totalFreight: suitCalc.totalFreight,
        totalRate: suitCalc.totalRate,
        totalCostVersat: suitCalc.totalCostVersat,
        totalUnitPrice: suitCalc.totalUnitPrice,
        totalUtility: suitCalc.totalUtility,
      });
    }

    /*
      -----------------------------------------
      CHECK IF MOTHER GUIDE EXISTS
      -----------------------------------------
    */

    const existingSuitCase = await SuitcasesModel.findOne({
      motherGuide: data.motherGuide,
    });

    /*
      -----------------------------------------
      UPDATE EXISTING
      -----------------------------------------
    */

    if (existingSuitCase) {
      existingSuitCase.suitCases.push(...processedSuitCases);

      await existingSuitCase.save();

      return res.status(200).json({
        ok: true,
        message: "Updated successfully",
        mensaje: "Actualizado correctamente",
        data: existingSuitCase,
      });
    }

    /*
      -----------------------------------------
      CREATE NEW
      -----------------------------------------
    */

    const payloadSuit: ISuitCases = {
      clientName: data.clientName,
      motherGuide: data.motherGuide,
      dateArrive: data.dateArrive,
      suitCases: processedSuitCases,
      status: "Not invoiced",
      isDelete: false,
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
      message: "Saved successfully",
      mensaje: "Guardado correctamente",
      data: suitCases,
    });
  } catch (error) {
    console.error(error);

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
    const getSuitCases = await SuitcasesModel.find({
      isDelete: false,
    }).limit(20);

    if (!getSuitCases || getSuitCases.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No Suit with this mother Guide",
        mensaje: "No valija con ese numero de guia",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Sucess",
      mensaje: "Sucess",
      data: getSuitCases,
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

const getSuitCasesByMotherGuide = async (req: Request, res: Response) => {
  try {
    const { motherGuide } = req.params;

    if (!motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const getSuitCases = await SuitcasesModel.find({
      motherGuide: motherGuide,
      isDelete: false,
    });

    if (!getSuitCases || getSuitCases.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No Suit with this mother Guide",
        mensaje: "No valija con ese numero de guia",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Sucess",
      mensaje: "Sucess",
      data: getSuitCases,
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

const getClientNameAndMotherGuide = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide } = req.params;

    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const getSuitCases = await SuitcasesModel.findOne({
      clientName: clientName,
      motherGuide: motherGuide,
    }).lean();

    if (!getSuitCases) {
      return res.status(404).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Sucess",
      mensaje: "Sucess",
      data: getSuitCases,
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

const getTotalSuits = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide } = req.params;

    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        data: null,
      });
    }

    const result = await SuitcasesModel.aggregate([
      // 1. Filtramos por el cliente y la guía
      {
        $match: {
          clientName: clientName,
          motherGuide: motherGuide,
        },
      },
      // 2. Sumamos los campos dentro del array suitCases
      {
        $project: {
          clientName: 1,
          motherGuide: 1,
          totalFreightSum: { $sum: "$suitCases.totalFreight" },
          totalRateSum: { $sum: "$suitCases.totalRate" },
          totalCostVersatSum: { $sum: "$suitCases.totalCostVersat" },
          totalUnitPriceSum: { $sum: "$suitCases.totalUnitPrice" },
          totalUtilitySum: { $sum: "$suitCases.totalUtility" },
        },
      },
    ]);

    if (result.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      data: result[0], // Retornamos el primer objeto con los totales
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
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

const updateSuitInvoices = async (req: Request, res: Response) => {
  try {
    const { status, motherGuide, clientName } = req.body;

    if (!status || !motherGuide || !clientName) {
      return res.status(400).json({
        ok: false,
        message: "Missing data",
        mensaje: "Faltan datos",
        data: null,
      });
    }

    const updatedPallet = await SuitcasesModel.findOneAndUpdate(
      { motherGuide: motherGuide, clientName: clientName },
      { status: status },
      { new: true },
    );

    if (!updatedPallet) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Updated",
      mensaje: "Actualizado correctamente",
      data: updatedPallet,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const deleteSuitCases = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;

    if (!_id) {
      return res.status(400).json({
        ok: false,
        message: "No Data",
        mensaje: "No data",
        data: null,
      });
    }

    const deleteSuit = await SuitcasesModel.findByIdAndUpdate(
      _id,
      {
        isDelete: true,
      },
      { new: true },
    );

    if (!deleteSuit) {
      return res.status(404).json({
        ok: false,
        message: "No Data",
        mensaje: "No data",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "The suit is delete",
      mensaje: "La valija fue eliminada",
      data: deleteSuit,
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

const deleteItemsSuitCases = async (req: Request, res: Response) => {
  try {
    const { _id, indexItem } = req.body;

    if (!_id || indexItem === undefined) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const docSuitcases = await SuitcasesModel.findById(_id);

    if (!docSuitcases) {
      return res.status(404).json({
        ok: false,
        message: "Not found",
        mensaje: "No encontrado",
        data: null,
      });
    }

    const suitSingle = docSuitcases.suitCases[indexItem];

    if (!suitSingle) {
      return res.status(404).json({
        ok: false,
        message: "Not found disk",
        mensaje: "No encontrado contenedor",
        data: null,
      });
    }

    if (suitSingle) {
      const itemDeleted = suitSingle;

      if (!itemDeleted) {
        return res.status(404).json({
          ok: false,
          message: "Not found pallet",
          mensaje: "No encontrado pallet",
          data: null,
        });
      }

      const restoreInv = await InventoryModel.findOneAndUpdate(
        {
          brandTV: itemDeleted.brandModel,
          model: itemDeleted.modelDescription,
          inchs: itemDeleted.inches,
        },
        { $inc: { quantity: itemDeleted.quantity } },
        { new: true },
      );

      if (!restoreInv) {
        return res.status(400).json({
          ok: false,
          message: "No restore inventory",
          mensaje: "No inventario restaurado",
          data: null,
        });
      }

      docSuitcases.suitCases.splice(indexItem, 1);

      await docSuitcases.save();

      return res.status(200).json({
        ok: true,
        message: "success",
        mensaje: "Success",
        data: null,
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

export {
  createSuitCases,
  getSuitCasesByMotherGuide,
  getClientNameAndMotherGuide,
  getSuitCases,
  updateSuitCases,
  deleteSuitCases,
  getTotalSuits,
  updateSuitInvoices,
  deleteItemsSuitCases,
};
