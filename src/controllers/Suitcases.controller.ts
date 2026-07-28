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
import InventoryMovementModel from "../models/InventoryMovement.model";
import { normalizeMiamiInvoiceNumber } from "../helpers/miamiInvoiceNumber";
import { normalizeClientName, withDecryptedClientFields } from "../helpers/clientName";
import { getClientCodeForName } from "../helpers/clientIdentity";
import { findInventoryItemForClient } from "../helpers/inventoryLink";

const serializeSuitcase = (suitcase: any) => withDecryptedClientFields(suitcase);

const includesText = (value: unknown, search: string) =>
  String(value || "").toLowerCase().includes(search.toLowerCase());

const matchesMiamiRef = (value: unknown, search: string) => {
  if (!search) return true;

  const normalizedSearch = normalizeMiamiInvoiceNumber(search) || search;

  return includesText(value, normalizedSearch) || includesText(value, search);
};

const findSuitcaseByClientAndGuide = async (clientName: string, motherGuide: string) => {
  const normalizedClient = normalizeClientName(clientName);
  const candidates = await SuitcasesModel.find({
    motherGuide,
    isDelete: false,
  }).lean();

  return candidates.find(
    (suitcase) => normalizeClientName(suitcase.clientName) === normalizedClient,
  ) || null;
};

const createSuitCases = async (req: Request, res: Response) => {
  const session = await SuitcasesModel.startSession();

  try {
    session.startTransaction();

    const data: ISuitCasesClientSend = req.body;
    const clientName = normalizeClientName(data?.clientName);
    const clientCode = await getClientCodeForName(clientName);
    const normalizedMiamiInvoiceNumber = normalizeMiamiInvoiceNumber(
      data.miamiInvoiceNumber,
    );

    if (!clientName || !data?.items || !Array.isArray(data.items) || data.items.length === 0) {
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

      const isSpecial = clientName === "Daniel";

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

    const existingSuitCase = (await SuitcasesModel.find({
      motherGuide: data.motherGuide,
      isDelete: false,
    }).session(session)).find(
      (suitcase) => normalizeClientName(suitcase.clientName) === clientName,
    );

    if (existingSuitCase) {
      existingSuitCase.clientName = clientName;
      if (clientCode) {
        existingSuitCase.clientCode = clientCode;
      }
      if (normalizedMiamiInvoiceNumber) {
        existingSuitCase.miamiInvoiceNumber = normalizedMiamiInvoiceNumber;
      }
      existingSuitCase.suitCases.push(...processedSuitCases);
      suitCases = await existingSuitCase.save({ session });
    } else {
      const payloadSuit: ISuitCases = {
        clientName,
        clientCode,
        motherGuide: data.motherGuide,
        miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
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

      const inventoryItem = await findInventoryItemForClient({
        clientName,
        brandTV: item.brandModel,
        inchs: item.inches,
        model: item.modelDescription,
        minQuantity: quantity,
        session,
      });

      if (!inventoryItem) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Insufficient inventory or inventory not found",
          mensaje: "Inventario insuficiente o no encontrado",
          data: item,
        });
      }

      const inventoryUpdated = await InventoryModel.findByIdAndUpdate(
        inventoryItem._id,
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

      await InventoryMovementModel.create(
        [
          {
            inventoryId: inventoryUpdated._id,
            type: "EXIT",
            quantity,
            previousQuantity: Number(inventoryUpdated.quantity) + quantity,
            resultingQuantity: Number(inventoryUpdated.quantity),
            miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
            referenceType: "SUITCASE",
            referenceId: String(suitCases._id),
            createdBy: (req as any).user?._id,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();

    return res.status(existingSuitCase ? 200 : 201).json({
      ok: true,
      message: existingSuitCase ? "Updated successfully" : "Saved successfully",
      mensaje: existingSuitCase ? "Actualizado correctamente" : "Guardado correctamente",
      data: serializeSuitcase(suitCases),
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
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const skip = (page - 1) * limit;
    const clientName = normalizeClientName(req.query.clientName || req.query.client);
    const motherGuide = String(req.query.motherGuide || "").trim();
    const miamiInvoiceNumber = String(req.query.miamiInvoiceNumber || req.query.ref || "").trim();

    const getSuitCases = (await SuitcasesModel.find({
      isDelete: false,
    }).sort({ dateArrive: -1, _id: -1 }))
      .map(serializeSuitcase)
      .filter((suitcase) => {
        if (clientName && !includesText(normalizeClientName(suitcase.clientName), clientName)) {
          return false;
        }

        if (motherGuide && !includesText(suitcase.motherGuide, motherGuide)) {
          return false;
        }

        if (!matchesMiamiRef(suitcase.miamiInvoiceNumber, miamiInvoiceNumber)) {
          return false;
        }

        return true;
      });

    if (!getSuitCases || getSuitCases.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No suitcases found",
        mensaje: "No se encontraron maletas",
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
        },
      });
    }

    const totalItems = getSuitCases.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return res.status(200).json({
      ok: true,
      message: "Sucess",
      mensaje: "Sucess",
      data: getSuitCases.slice(skip, skip + limit),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
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
      data: getSuitCases.map(serializeSuitcase),
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

    const getSuitCases = await findSuitcaseByClientAndGuide(String(clientName), String(motherGuide));

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
      data: serializeSuitcase(getSuitCases),
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

    const suitDoc = await findSuitcaseByClientAndGuide(String(clientName), String(motherGuide));

    if (!suitDoc) {
      return res.status(404).json({
        ok: false,
        message: "No se encontraron registros",
        data: null,
      });
    }

    const result = await SuitcasesModel.aggregate([
      // 1. Filtramos por el cliente y la guía
      {
        $match: {
          _id: suitDoc._id,
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
    return res.status(501).json({
      ok: false,
      message: "Not implemented",
      mensaje: "No implementado",
      data: null,
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

    const suitDoc = await findSuitcaseByClientAndGuide(clientName, motherGuide);

    if (!suitDoc) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    const updatedPallet = await SuitcasesModel.findByIdAndUpdate(
      suitDoc._id,
      {
        status: status,
        clientName: normalizeClientName(clientName),
        clientCode: await getClientCodeForName(clientName),
      },
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
      data: serializeSuitcase(updatedPallet),
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
  const session = await SuitcasesModel.startSession();

  try {
    session.startTransaction();

    const { _id } = req.params;

    if (!_id) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "No Data",
        mensaje: "No data",
        data: null,
      });
    }

    const suitDoc = await SuitcasesModel.findById(_id).session(session);

    if (!suitDoc || suitDoc.isDelete) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "No Data",
        mensaje: "No data",
        data: null,
      });
    }

    const clientName = normalizeClientName(suitDoc.clientName);
    const restoreMovements: any[] = [];

    for (const item of suitDoc.suitCases || []) {
      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      const inventoryItem = await findInventoryItemForClient({
        clientName,
        brandTV: item.brandModel,
        model: item.modelDescription,
        inchs: item.inches,
        session,
      });

      if (!inventoryItem) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "No restore inventory",
          mensaje: "No inventario restaurado",
          data: item,
        });
      }

      const restoredInventory = await InventoryModel.findByIdAndUpdate(
        inventoryItem._id,
        { $inc: { quantity } },
        { new: true, session },
      );

      if (!restoredInventory) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "No restore inventory",
          mensaje: "No inventario restaurado",
          data: item,
        });
      }

      restoreMovements.push({
        inventoryId: restoredInventory._id,
        type: "ADJUSTMENT",
        quantity,
        previousQuantity: Number(restoredInventory.quantity) - quantity,
        resultingQuantity: Number(restoredInventory.quantity),
        miamiInvoiceNumber: suitDoc.miamiInvoiceNumber,
        referenceType: "SUITCASE_DELETE",
        referenceId: String(suitDoc._id),
        createdBy: (req as any).user?._id,
      });
    }

    const deleteSuit = await SuitcasesModel.findByIdAndUpdate(
      _id,
      {
        isDelete: true,
        clientName,
      },
      { new: true, session },
    );

    if (!deleteSuit) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "No Data",
        mensaje: "No data",
        data: null,
      });
    }

    if (restoreMovements.length > 0) {
      await InventoryMovementModel.create(restoreMovements, { session });
    }

    await session.commitTransaction();

    return res.status(200).json({
      ok: true,
      message: "The suit is delete",
      mensaje: "La valija fue eliminada",
      data: serializeSuitcase(deleteSuit),
    });
  } catch (error) {
    await session.abortTransaction();
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

      const inventoryItem = await findInventoryItemForClient({
        clientName: normalizeClientName(docSuitcases.clientName),
        brandTV: itemDeleted.brandModel,
        model: itemDeleted.modelDescription,
        inchs: itemDeleted.inches,
      });

      const restoreInv = inventoryItem
        ? await InventoryModel.findByIdAndUpdate(
            inventoryItem._id,
            { $inc: { quantity: itemDeleted.quantity } },
            { new: true },
          )
        : null;

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

      await InventoryMovementModel.create({
        inventoryId: restoreInv._id,
        type: "ADJUSTMENT",
        quantity: itemDeleted.quantity,
        previousQuantity: Number(restoreInv.quantity) - Number(itemDeleted.quantity),
        resultingQuantity: Number(restoreInv.quantity),
        miamiInvoiceNumber: docSuitcases.miamiInvoiceNumber,
        referenceType: "SUITCASE_ITEM_DELETE",
        referenceId: String(docSuitcases._id),
        createdBy: (req as any).user?._id,
      });

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

const updateSuitcaseArrivalStatus = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide, arrivalStatus } = req.body;
    const validStatuses = ["IN_TRANSIT", "ARRIVED", "DELIVERED"];

    if (!clientName || !motherGuide || !validStatuses.includes(arrivalStatus)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid arrival status data",
        mensaje: "Datos de llegada invalidos",
        data: null,
      });
    }

    const suitDoc = await findSuitcaseByClientAndGuide(clientName, motherGuide);

    if (!suitDoc) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    const update: Record<string, any> = { arrivalStatus };

    if (arrivalStatus === "ARRIVED") {
      update.arrivedAt = new Date();
    }

    if (arrivalStatus === "DELIVERED") {
      update.deliveredAt = new Date();
      update.arrivedAt = suitDoc.arrivedAt || new Date();
    }

    const updatedSuitcase = await SuitcasesModel.findByIdAndUpdate(
      suitDoc._id,
      update,
      { new: true },
    );

    if (!updatedSuitcase) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Arrival status updated",
      mensaje: "Estado de llegada actualizado",
      data: serializeSuitcase(updatedSuitcase),
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
  updateSuitcaseArrivalStatus,
};
