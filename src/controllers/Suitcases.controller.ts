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
  const session = await SuitcasesModel.startSession();

  try {
    session.startTransaction();

    const data: ISuitCasesClientSend = req.body;

    if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "No data or empty items array",
        mensaje: "No hay datos o el arreglo de maletas está vacío",
        data: null,
      });
    }

    const maintenance = await MaintenanceCostModel.findOne().session(session);

    if (!maintenance) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "Maintenance cost not found",
        mensaje: "Costo de mantenimiento no encontrado",
        data: null,
      });
    }

    const processedSuitCases: ISuitCasesData[] = [];

    for (const item of data.items) {
      const quantity = Number(item.quantity);
      const weightLB = Number(item.weightLB);
      const inches = Number(item.inches);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(weightLB) ||
        !Number.isFinite(inches) ||
        quantity <= 0
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Invalid numeric values",
          mensaje: "Valores numéricos inválidos",
          data: item,
        });
      }

      const isSpecial = data.clientName === "Daniel";

      const priceBrand = await PriceModel.findOne({
        model: item.brandModel,
        inches: item.inches,
        isSpecial,
      }).session(session);

      if (!priceBrand || !Number.isFinite(Number(priceBrand.unitPrice))) {
        await session.abortTransaction();
        return res.status(404).json({
          ok: false,
          message: `No valid price found for model: ${item.brandModel} ${inches}"`,
          mensaje: `No se encontró un precio válido para el modelo: ${item.brandModel} ${inches}"`,
          data: null,
        });
      }

      const suitCalc = await CalcSuitCases(
        weightLB,
        quantity,
        Number(priceBrand.unitPrice),
        maintenance,
      );

      const numericFields = [
        suitCalc.totalFreight,
        suitCalc.totalRate,
        suitCalc.totalCostVersat,
        suitCalc.totalUnitPrice,
        suitCalc.totalUtility,
      ];

      if (numericFields.some((value) => !Number.isFinite(Number(value)))) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Calculation returned invalid numbers",
          mensaje: "El cálculo devolvió números inválidos",
          data: {
            item,
            suitCalc,
          },
        });
      }

      processedSuitCases.push({
        brandModel: item.brandModel,
        inches: item.inches,
        modelDescription: item.modelDescription,
        weightLB: Number(suitCalc.weightLB),
        quantity: Number(suitCalc.quantity),
        totalFreight: Number(suitCalc.totalFreight),
        totalRate: Number(suitCalc.totalRate),
        totalCostVersat: Number(suitCalc.totalCostVersat),
        totalUnitPrice: Number(suitCalc.totalUnitPrice),
        totalUtility: Number(suitCalc.totalUtility),
      });
    }

    let suitCases;

    const existingSuitCase = await SuitcasesModel.findOne({
      motherGuide: data.motherGuide,
    }).session(session);

    if (existingSuitCase) {
      existingSuitCase.suitCases.push(...processedSuitCases);
      suitCases = await existingSuitCase.save({ session });
    } else {
      const payloadSuit: ISuitCases = {
        clientName: data.clientName,
        motherGuide: data.motherGuide,
        dateArrive: data.dateArrive,
        suitCases: processedSuitCases,
        status: "Not invoiced",
        isDelete: false,
      };

      const created = await SuitcasesModel.create([payloadSuit], { session });
      suitCases = created[0];
    }

    // Reducir inventario SOLO después de guardar la valija
    for (const item of data.items) {
      const quantity = Number(item.quantity);

      const filter = {
        brandTV: item.brandModel,
        inchs: Number(item.inches),
        model: item.modelDescription,
        client: data.clientName,
        quantity: { $gte: quantity },
      } as any;

      const inventoryUpdated = await InventoryModel.findOneAndUpdate(
        filter,
        {
          $inc: { quantity: -quantity },
        },
        {
          new: true,
          session,
        },
      );

      if (!inventoryUpdated) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Insufficient inventory or inventory not found",
          mensaje: "Inventario insuficiente o no encontrado",
          data: item,
        });
      }
    }

    await session.commitTransaction();

    return res.status(existingSuitCase ? 200 : 201).json({
      ok: true,
      message: existingSuitCase ? "Updated successfully" : "Saved successfully",
      mensaje: existingSuitCase ? "Actualizado correctamente" : "Guardado correctamente",
      data: suitCases,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error, "Si soy yo el problema");

    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  } finally {
    session.endSession();
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
