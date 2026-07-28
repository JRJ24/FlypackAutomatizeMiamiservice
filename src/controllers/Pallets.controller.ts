import { Request, Response } from "express";
import PalletsModel from "../models/Pallets.model";
import MaintenanceCostModel from "../models/MaintenanceCost.model";
import { CalcCost } from "../helpers/calcCost";
import {
  IPalletNew,
  IPalletsDetails,
  IPalletsMain,
} from "../interfaces/IPalletsmodel";
import PriceModel from "../models/PriceModel";
import InventoryModel from "../models/Inventory.model";
import InventoryMovementModel from "../models/InventoryMovement.model";
import { normalizeMiamiInvoiceNumber } from "../helpers/miamiInvoiceNumber";
import { normalizeClientName, withDecryptedClientFields } from "../helpers/clientName";
import { findInventoryItemForClient } from "../helpers/inventoryLink";

const serializePallet = (pallet: any) => withDecryptedClientFields(pallet);

const includesText = (value: unknown, search: string) =>
  String(value || "").toLowerCase().includes(search.toLowerCase());

const matchesMiamiRef = (value: unknown, search: string) => {
  if (!search) return true;

  const normalizedSearch = normalizeMiamiInvoiceNumber(search) || search;

  return includesText(value, normalizedSearch) || includesText(value, search);
};

const findPalletByClientAndGuide = async (clientName: string, motherGuide: string) => {
  const normalizedClient = normalizeClientName(clientName);
  const candidates = await PalletsModel.find({
    motherGuide,
    isDelete: false,
  }).lean();

  return candidates.find(
    (pallet) => normalizeClientName(pallet.clientName) === normalizedClient,
  ) || null;
};

// No modified
const getPallets = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const clientName = normalizeClientName(req.query.clientName || req.query.client);
    const motherGuide = String(req.query.motherGuide || "").trim();
    const miamiInvoiceNumber = String(req.query.miamiInvoiceNumber || req.query.ref || "").trim();
    const pending = req.query.pending;
    const isPending = pending === "on" || pending === "true";
    const skip = (page - 1) * limit;

    const result = await PalletsModel.aggregate([
      {
        $match: {
          isDelete: false,
          isActive: true,
        },
      },
      { $unwind: "$pallet" },
      {
        $group: {
          _id: {
            clientName: { $trim: { input: "$clientName" } },
            motherGuide: "$motherGuide",
          },

          clientName: { $first: "$clientName" },
          date: { $first: "$date" },
          motherGuide: { $first: "$motherGuide" },
          miamiInvoiceNumber: { $first: "$miamiInvoiceNumber" },
          status: { $first: "$status" },

          totalPalletsCount: { $sum: 1 },
          totalWeightLB: { $sum: "$pallet.calcPallet.weightLB" },
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
    ]);

    const pallets = result
      .map(serializePallet)
      .filter((pallet) => {
        if (clientName && !includesText(normalizeClientName(pallet.clientName), clientName)) {
          return false;
        }

        if (motherGuide && !includesText(pallet.motherGuide, motherGuide)) {
          return false;
        }

        if (!matchesMiamiRef(pallet.miamiInvoiceNumber, miamiInvoiceNumber)) {
          return false;
        }

        if (isPending) {
          return pallet.status === "Pending guidance" || String(pallet.motherGuide || "").startsWith("No Guide - ");
        }

        return true;
      });
    const totalItems = pallets.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return res.status(200).json({
      ok: true,
      message: "Pallets found",
      mensaje: "Pallets encontrados",
      data: pallets.slice(skip, skip + limit),
      pagination: {
        currentPage: page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
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

// Importants
const getPalletsByMotherGuide = async (req: Request, res: Response) => {
  try {
    const { motherGuide } = req.params;
    const pending = req.query.pending;

    const isPending = pending === "on" || pending === "true";

    if (!isPending && !motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No mother guide",
        mensaje: "No guia madre",
        data: null,
      });
    }

    const matchStage = isPending
      ? {
          isDelete: false,
          isActive: true,
          status: "Pending guidance",
          motherGuide: { $regex: /^No Guide - / },
        }
      : {
          motherGuide: motherGuide,
          isDelete: false,
          isActive: true,
        };

    const pallets = await PalletsModel.aggregate([
      {
        $match: matchStage,
      },
      // 1. Descomponemos el array de grupos (PLT#1, PLT#2...)
      { $unwind: "$pallet" },
      {
        $group: {
          _id: { $trim: { input: "$clientName" } },
          clientName: { $first: "$clientName" },
          date: { $first: "$date" },
          motherGuide: { $first: "$motherGuide" },
          miamiInvoiceNumber: { $first: "$miamiInvoiceNumber" },
          status: { $first: "$status" },

          totalPalletsCount: { $sum: 1 },

          totalWeightLB: { $sum: "$pallet.calcPallet.weightLB" },
        },
      },
      { $sort: { clientName: 1 } },
    ]);

    if (!pallets) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Pallets by Mother Guide",
      mensaje: "Pallets con la guia madre",
      data: pallets.map(serializePallet),
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

const getPalletsByClient = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide } = req.params;

    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre del cliente y guía madre son obligatorios",
        data: null,
      });
    }

    const palletDoc = await findPalletByClientAndGuide(String(clientName), String(motherGuide));

    if (!palletDoc) {
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontró el despacho para este cliente y guía",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Datos obtenidos con éxito",
      data: serializePallet(palletDoc),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const getPalletsDataProcess = async (req: Request, res: Response) => {
  try {
    const clientName = req.query.client;
    const motherGuide = req.query.motherGuide;

    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        mensaje: "El nombre del cliente y la guía madre son obligatorios",
      });
    }

    const maintenance = await MaintenanceCostModel.findOne();
    const rate = maintenance?.rate;
    const palletDoc = await findPalletByClientAndGuide(String(clientName), String(motherGuide));

    if (!palletDoc) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    const results = await PalletsModel.aggregate([
      {
        $match: {
          _id: palletDoc._id,
        },
      },
      { $unwind: "$pallet" },
      {
        $lookup: {
          from: "maintenances",
          pipeline: [{ $match: { name: "rate" } }],
          as: "maintenances",
        },
      },
      {
        $group: {
          _id: "$_id",
          totalPallets: { $sum: 1 },
          totalTVs: { $sum: { $sum: "$pallet.pallets.quantityUnit" } },
          tempSumFreight: { $sum: "$pallet.calcPallet.costLbUS" }, // <-- Se llama tempSumFreight
          totalRate: { $sum: "$pallet.calcPallet.totalRate" },
          totalADM: { $sum: "$pallet.calcPallet.ADM" },
          totalService: { $sum: "$pallet.calcPallet.caribeTrans" },
          totalSale: { $sum: "$pallet.calcPallet.totalPrice" },
          totalUtility: { $sum: "$pallet.calcPallet.utility" },
        },
      },
      {
        $project: {
          _id: 0,
          totalPallets: 1,
          totalTVs: 1,
          // Usamos los nombres exactos del $group
          totalFreight: {
            $round: [{ $multiply: ["$tempSumFreight", rate] }, 2],
          },
          totalRate: { $round: ["$totalRate", 2] },
          totalADM: { $round: ["$totalADM", 2] },
          totalService: { $round: ["$totalService", 2] },
          totalSale: { $round: ["$totalSale", 2] },
          totalUtility: { $round: ["$totalUtility", 2] },
          debugTasa: "$rate",
          debugSuma: "$tempSumFreight",
        },
      },
      {
        // Agregamos los costos al final para que totalFreight ya exista y no sea null
        $addFields: {
          totalCosts: {
            $round: [
              {
                $add: [
                  "$totalFreight",
                  "$totalRate",
                  "$totalADM",
                  "$totalService",
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    if (results.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "success",
      mensaje: "Datos agrupados con éxito",
      data: results[0],
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

const createPallets = async (req: Request, res: Response) => {
  const session = await PalletsModel.startSession();

  try {
    session.startTransaction();

    const data: IPalletNew = req.body;
    const clientName = normalizeClientName(data?.clientName);
    const normalizedMiamiInvoiceNumber = normalizeMiamiInvoiceNumber(
      data.miamiInvoiceNumber,
    );

    if (!data || !data.pallet || !clientName) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No hay datos",
        data: null,
      });
    }

    const { pallets, calcPallet } = data.pallet;
    const weightLB = Number(calcPallet.weightLB);

    if (!Array.isArray(pallets) || pallets.length === 0 || !Number.isFinite(weightLB) || weightLB <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid packing list data",
        mensaje: "Datos de packing list invalidos",
        data: null,
      });
    }

    const motherGuideValue = data.motherGuide?.trim();
    const isMotherGuideEmpty = !motherGuideValue;

    // 1. Buscar precios unitarios en la BD y calcular totales por ítem
    let globalTotalPrice = 0;
    const enrichedPallets: IPalletsDetails[] = [];
    const inventoryExits: {
      inventoryId: any;
      quantity: number;
      previousQuantity: number;
      resultingQuantity: number;
    }[] = [];

    const isSpecial: boolean = clientName === "Daniel" ? true : false;

    for (const item of pallets) {
      const quantityUnit = Number(item.quantityUnit);

      if (
        !item.model ||
        !item.inchs ||
        !item.descriptionModel ||
        !Number.isFinite(quantityUnit) ||
        quantityUnit <= 0
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Invalid inventory item",
          mensaje: "Item de inventario invalido",
          data: item,
        });
      }

      // Reemplaza "ProductsModel" con el modelo real donde guardas los precios
      const pricesInfo = await PriceModel.findOne({
        model: item.model,
        inches: item.inchs,
        isSpecial: isSpecial,
      }).session(session);

      // Si no encuentra el producto, asignamos 0 o el valor por defecto que prefieras
      const unitPrice = pricesInfo ? pricesInfo.unitPrice : 0;
      const totalUnitPrice = unitPrice * quantityUnit;

      const inventoryItem = await findInventoryItemForClient({
        clientName,
        brandTV: item.model,
        inchs: item.inchs,
        model: item.descriptionModel,
        minQuantity: quantityUnit,
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

      const UpdateQtyInventory = await InventoryModel.findByIdAndUpdate(
        inventoryItem._id,
        { $inc: { quantity: -quantityUnit } },
        { new: true, session },
      );

      if (!UpdateQtyInventory) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Insufficient inventory or inventory not found",
          mensaje: "Inventario insuficiente o no encontrado",
          data: item,
        });
      }

      inventoryExits.push({
        inventoryId: UpdateQtyInventory._id,
        quantity: quantityUnit,
        previousQuantity: Number(UpdateQtyInventory.quantity) + quantityUnit,
        resultingQuantity: Number(UpdateQtyInventory.quantity),
      });

      globalTotalPrice += totalUnitPrice;

      enrichedPallets.push({
        model: item.model,
        inchs: item.inchs,
        descriptionModel: item.descriptionModel,
        quantityUnit,
        unitPrice: unitPrice,
        totalUnitPrice: totalUnitPrice,
      });
    }

    // 2. Traer costo de mantenimiento
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

    const palletCalc = await CalcCost(weightLB, maintenance, globalTotalPrice);

    // const existingGuide = await PalletsModel.findOne({
    //   motherGuide: data.motherGuide,
    //   clientName: data.clientName,
    // });

    const queryToCount = isMotherGuideEmpty
      ? {
          status: "Pending guidance",
          isActive: true,
          isDelete: false,
        }
      : {
          motherGuide: motherGuideValue,
          isActive: true,
          isDelete: false,
        };
    const allGuidesSameMother = (await PalletsModel.find(queryToCount).session(session))
      .filter((guide) => normalizeClientName(guide.clientName) === clientName);

    const currentPalletCount = allGuidesSameMother.reduce((total, guide) => {
      const guidePalletsCount =
        guide.pallet && Array.isArray(guide.pallet) ? guide.pallet.length : 0;
      return total + guidePalletsCount;
    }, 0);

    const palletDescription = `PACKING LIST PLT#${currentPalletCount + 1} (${weightLB} LBS)`;

    const newPalletSingle = {
      palletDescription: palletDescription,
      pallets: enrichedPallets,
      calcPallet: palletCalc,
    };

    const generatedMotherGuide = isMotherGuideEmpty
      ? `No Guide - ${currentPalletCount + 1}`
      : motherGuideValue;

    const existingGuide = allGuidesSameMother.find(
      (guide) => guide.motherGuide === generatedMotherGuide,
    );

    const saved = existingGuide
      ? await PalletsModel.findByIdAndUpdate(
          existingGuide._id,
          {
            $set: {
              clientName,
              ...(normalizedMiamiInvoiceNumber
                ? { miamiInvoiceNumber: normalizedMiamiInvoiceNumber }
                : {}),
            },
            $push: { pallet: newPalletSingle },
          },
          { new: true, session },
        )
      : (await PalletsModel.create(
          [
            {
              date: data.date,
              motherGuide: generatedMotherGuide,
              clientName,
              miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
              isActive: true,
              isDelete: false,
              status: isMotherGuideEmpty ? "Pending guidance" : "Not invoiced",
              pallet: [newPalletSingle],
            },
          ],
          { session },
        ))[0];

    if (!saved) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Not saved",
        mensaje: "No guardado",
        data: null,
      });
    }

    await InventoryMovementModel.create(
      inventoryExits.map((movement) => ({
        ...movement,
        type: "EXIT",
        miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
        referenceType: "PALLET",
        referenceId: String(saved._id),
        createdBy: (req as any).user?._id,
      })),
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      ok: true,
      message: "Saved",
      mensaje: "Guardado correctamente",
      data: serializePallet(saved),
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  } finally {
    session.endSession();
  }
};

const getPalletsBillings = async (req: Request, res: Response) => {
  try {
    let query = { isDelete: false, status: "Invoiced" };

    const palletsInvoices = await PalletsModel.find(query).lean();

    if (!palletsInvoices || palletsInvoices.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "success",
      mensaje: "Datos obtenidos con éxito",
      data: palletsInvoices.map(serializePallet),
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

// No modified
const updatePalletsInvoices = async (req: Request, res: Response) => {
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

    const palletDoc = await findPalletByClientAndGuide(clientName, motherGuide);

    if (!palletDoc) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    const updatedPallet = await PalletsModel.findByIdAndUpdate(
      palletDoc._id,
      { status: status, clientName: normalizeClientName(clientName) },
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
      data: serializePallet(updatedPallet),
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

const deletePallets = async (req: Request, res: Response) => {
  const session = await PalletsModel.startSession();

  try {
    session.startTransaction();

    const { motherGuide, clientName } = req.body;

    if (!motherGuide || !clientName) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Missing data",
        mensaje: "Faltan datos",
        data: null,
      });
    }

    const palletDoc = await findPalletByClientAndGuide(clientName, motherGuide);

    if (!palletDoc) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    const normalizedClient = normalizeClientName(clientName);
    const restoreMovements: any[] = [];

    for (const disk of palletDoc.pallet || []) {
      for (const item of disk.pallets || []) {
        const quantityUnit = Number(item.quantityUnit);

        if (!Number.isFinite(quantityUnit) || quantityUnit <= 0) continue;

        const inventoryItem = await findInventoryItemForClient({
          clientName: normalizedClient,
          brandTV: item.model,
          inchs: item.inchs,
          model: item.descriptionModel,
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
          { $inc: { quantity: quantityUnit } },
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
          quantity: quantityUnit,
          previousQuantity: Number(restoredInventory.quantity) - quantityUnit,
          resultingQuantity: Number(restoredInventory.quantity),
          miamiInvoiceNumber: palletDoc.miamiInvoiceNumber,
          referenceType: "PALLET_DELETE",
          referenceId: String(palletDoc._id),
          createdBy: (req as any).user?._id,
        });
      }
    }

    const deletedPallet = await PalletsModel.findByIdAndUpdate(
      palletDoc._id,
      { isDelete: true, isActive: false, clientName: normalizedClient },
      { new: true, session },
    );

    if (!deletedPallet) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    if (restoreMovements.length > 0) {
      await InventoryMovementModel.create(restoreMovements, { session });
    }

    await session.commitTransaction();

    return res.status(200).json({
      ok: true,
      message: "Deleted",
      mensaje: "Eliminado correctamente",
      data: serializePallet(deletedPallet),
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  } finally {
    session.endSession();
  }
};

const deleteItemsPallets = async (req: Request, res: Response) => {
  try {
    const { _id, indexPallet, indexItem } = req.body;

    if (!_id || indexItem === undefined || indexPallet === undefined) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const docPallet = await PalletsModel.findById(_id);

    if (!docPallet) {
      return res.status(404).json({
        ok: false,
        message: "Not found",
        mensaje: "No encontrado",
        data: null,
      });
    }

    const palletSingle = docPallet?.pallet[indexPallet];

    if (!palletSingle) {
      return res.status(404).json({
        ok: false,
        message: "Not found disk",
        mensaje: "No encontrado contenedor",
        data: null,
      });
    }

    if (palletSingle && palletSingle.pallets[indexItem]) {
      const itemDeleted = palletSingle.pallets[indexItem];

      if (!itemDeleted) {
        return res.status(404).json({
          ok: false,
          message: "Not found pallet",
          mensaje: "No encontrado pallet",
          data: null,
        });
      }
      const inventoryItem = await findInventoryItemForClient({
        clientName: normalizeClientName(docPallet.clientName),
        brandTV: itemDeleted.model,
        model: itemDeleted.descriptionModel,
        inchs: itemDeleted.inchs,
      });

      const restoreInv = inventoryItem
        ? await InventoryModel.findByIdAndUpdate(
            inventoryItem._id,
            { $inc: { quantity: itemDeleted.quantityUnit } },
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
      palletSingle.pallets.splice(indexItem, 1);

      if (palletSingle.pallets.length === 0) {
        docPallet.pallet.splice(indexPallet, 1);
      }
      await docPallet.save();

      await InventoryMovementModel.create({
        inventoryId: restoreInv._id,
        type: "ADJUSTMENT",
        quantity: itemDeleted.quantityUnit,
        previousQuantity: Number(restoreInv.quantity) - Number(itemDeleted.quantityUnit),
        resultingQuantity: Number(restoreInv.quantity),
        miamiInvoiceNumber: docPallet.miamiInvoiceNumber,
        referenceType: "PALLET_ITEM_DELETE",
        referenceId: String(docPallet._id),
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

const updateGuide = async (req: Request, res: Response) => {
  try {
    const { _id, motherGuide } = req.body;

    console.log(motherGuide);
    console.log(_id);

    if (!motherGuide && !_id) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    const update = await PalletsModel.findByIdAndUpdate(
      _id,
      { motherGuide: motherGuide, status: "Not invoiced" },
      { new: true },
    );

    if (!update) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Update",
      mensaje: "Update",
      data: serializePallet(update),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};
export {
  getPallets,
  createPallets,
  updatePalletsInvoices,
  deletePallets,
  getPalletsByMotherGuide,
  getPalletsByClient,
  getPalletsDataProcess,
  getPalletsBillings,
  deleteItemsPallets,
  updateGuide,
};
