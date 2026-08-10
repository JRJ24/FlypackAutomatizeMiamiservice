import { Request, Response } from "express";
import { randomUUID } from "crypto";
import type { ClientSession } from "mongoose";
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
import InvoicesModel from "../models/Invoices.model";
import { normalizeMiamiInvoiceNumber } from "../helpers/miamiInvoiceNumber";
import { normalizeClientName, withDecryptedClientFields } from "../helpers/clientName";
import { getClientCodeForName } from "../helpers/clientIdentity";
import { findInventoryItemForClient } from "../helpers/inventoryLink";
import { syncInvoicesForPacking } from "../helpers/syncInvoices";

const serializePallet = (pallet: any) => withDecryptedClientFields(pallet);

type ApiResponse = {
  statusCode: number;
  body: Record<string, any>;
};

const jsonResponse = (statusCode: number, body: Record<string, any>): ApiResponse => ({
  statusCode,
  body,
});

const withSession = <T extends { session: (session: ClientSession) => T }>(
  query: T,
  session?: ClientSession,
) => (session ? query.session(session) : query);

const sessionOptions = (session?: ClientSession) =>
  session ? { session } : undefined;

const abortIfActive = async (session?: ClientSession) => {
  if (!session?.inTransaction()) return;

  try {
    await session.abortTransaction();
  } catch (error) {
    console.error("[PALLET TRANSACTION ABORT ERROR]", {
      message: (error as any).message,
      name: (error as any).name,
      code: (error as any).code,
    });
  }
};

const isTransactionUnsupportedError = (error: any) => {
  const message = String(error?.message || "");
  const codeName = String(error?.codeName || "");

  return (
    message.includes("Transaction numbers are only allowed") ||
    message.includes("Transactions are not supported") ||
    message.includes("replica set member or mongos") ||
    codeName === "IllegalOperation"
  );
};

const handleCreatePalletError = (res: Response, error: any, body: unknown) => {
  console.error("[CREATE PALLET ERROR]", {
    message: error?.message,
    name: error?.name,
    code: error?.code,
    stack: error?.stack,
    body,
  });

  if (error?.code === 11000) {
    return res.status(409).json({
      ok: false,
      message: "Duplicate pallet",
      mensaje: "Ya existe un pallet con esos datos",
      fields: error.keyValue,
    });
  }

  return res.status(500).json({
    ok: false,
    message: "Error internal server",
    mensaje: "Error interno del servidor",
    data: null,
  });
};

const rollbackInventoryUpdates = async (
  updates: { inventoryId: any; quantity: number }[],
) => {
  for (const update of [...updates].reverse()) {
    await InventoryModel.findOneAndUpdate(
      { _id: update.inventoryId, isDisabled: false },
      { $inc: { quantity: update.quantity } },
      { runValidators: true },
    );
  }
};

const cleanupSavedPallet = async (
  savedPalletId: any,
  packingId: string,
  wasExistingGuide: boolean,
) => {
  if (!savedPalletId) return;

  if (wasExistingGuide) {
    await PalletsModel.findByIdAndUpdate(
      savedPalletId,
      { $pull: { pallet: { packingId } } },
      { runValidators: true },
    );
    return;
  }

  await PalletsModel.findByIdAndDelete(savedPalletId);
};

const getStatusAfterAppendingPacking = (status: string, isMotherGuideEmpty: boolean) => {
  if (isMotherGuideEmpty || status === "Pending guidance") return "Pending guidance";
  if (status === "Invoiced" || status === "Partially invoiced") return "Partially invoiced";
  return "Not invoiced";
};

const getArrivalStatusAfterAppendingPacking = (arrivalStatus?: string) => {
  if (arrivalStatus === "ARRIVED" || arrivalStatus === "DELIVERED" || arrivalStatus === "PARTIAL_ARRIVED") {
    return "PARTIAL_ARRIVED";
  }

  return "IN_TRANSIT";
};

const toNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const getPackingArrivalStatus = (packing: any) => {
  const items = Array.isArray(packing?.pallets) ? packing.pallets : [];
  const totalQuantity = items.reduce(
    (total: number, item: any) => total + toNumber(item.quantityUnit),
    0,
  );
  const arrivedQuantity = items.reduce(
    (total: number, item: any) => total + toNumber(item.arrivedQuantity),
    0,
  );

  if (totalQuantity <= 0 || arrivedQuantity <= 0) return "IN_TRANSIT";
  if (arrivedQuantity >= totalQuantity) return "ARRIVED";
  return "PARTIAL_ARRIVED";
};

const refreshPalletStatuses = (palletDoc: any) => {
  const packings = Array.isArray(palletDoc?.pallet) ? palletDoc.pallet : [];

  for (const packing of packings) {
    packing.arrivalStatus = getPackingArrivalStatus(packing);
    if (packing.arrivalStatus !== "IN_TRANSIT" && !packing.arrivedAt) {
      packing.arrivedAt = new Date();
    }
  }

  const allItems = packings.flatMap((packing: any) => packing.pallets || []);
  const hasItems = allItems.length > 0;
  const hasAnyArrived = allItems.some((item: any) => toNumber(item.arrivedQuantity) > 0);
  const allArrived = hasItems && allItems.every(
    (item: any) => toNumber(item.arrivedQuantity) >= toNumber(item.quantityUnit),
  );
  const hasAnyInvoiced = allItems.some((item: any) => toNumber(item.invoicedQuantity) > 0);
  const allInvoiced = hasItems && allItems.every(
    (item: any) => toNumber(item.invoicedQuantity) >= toNumber(item.quantityUnit),
  );

  if (palletDoc.arrivalStatus !== "DELIVERED") {
    palletDoc.arrivalStatus = allArrived
      ? "ARRIVED"
      : hasAnyArrived
        ? "PARTIAL_ARRIVED"
        : "IN_TRANSIT";
  }

  if (allInvoiced) {
    palletDoc.status = "Invoiced";
  } else if (hasAnyInvoiced) {
    palletDoc.status = "Partially invoiced";
  } else if (palletDoc.status !== "Pending guidance") {
    palletDoc.status = "Not invoiced";
  }
};

const ensurePalletTrackingIds = (palletDoc: any) => {
  let changed = false;

  for (const packing of palletDoc.pallet || []) {
    if (!packing.packingId) {
      packing.packingId = randomUUID();
      changed = true;
    }

    for (const item of packing.pallets || []) {
      if (!item.lineId) {
        item.lineId = randomUUID();
        changed = true;
      }

      if (item.arrivedQuantity === undefined || item.arrivedQuantity === null) {
        item.arrivedQuantity = 0;
        changed = true;
      }

      if (item.invoicedQuantity === undefined || item.invoicedQuantity === null) {
        item.invoicedQuantity = 0;
        changed = true;
      }
    }
  }

  return changed;
};

const findPackingForUpdate = (palletDoc: any, update: any) => {
  if (update.packingId) {
    const packing = palletDoc.pallet.find((group: any) => group.packingId === update.packingId);

    if (packing) return packing;
  }

  const packingIndex = Number(update.packingIndex);

  if (Number.isInteger(packingIndex) && packingIndex >= 0) {
    return palletDoc.pallet[packingIndex] || null;
  }

  return null;
};

const findLineForUpdate = (packing: any, update: any) => {
  if (update.lineId) {
    const item = packing?.pallets?.find((line: any) => line.lineId === update.lineId);

    if (item) return item;
  }

  const itemIndex = Number(update.itemIndex);

  if (Number.isInteger(itemIndex) && itemIndex >= 0) {
    return packing?.pallets?.[itemIndex] || null;
  }

  return null;
};

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

const getInvoiceTransportCost = async (type: "PALLETS" | "LUGGAGES", clientName: string, motherGuide: string) => {
  const normalizedClient = normalizeClientName(clientName);
  const invoices = await InvoicesModel.find({ motherGuide, type }).sort({ date: -1, _id: -1 });
  const invoice = invoices.find((item) => normalizeClientName(item.client) === normalizedClient);

  return invoice?.costTransport;
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
          clientCode: { $first: "$clientCode" },
          arrivalStatus: { $first: "$arrivalStatus" },
          arrivedAt: { $first: "$arrivedAt" },
          deliveredAt: { $first: "$deliveredAt" },
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
          clientCode: { $first: "$clientCode" },
          arrivalStatus: { $first: "$arrivalStatus" },
          arrivedAt: { $first: "$arrivedAt" },
          deliveredAt: { $first: "$deliveredAt" },
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

    const invoiceTransportCost = await getInvoiceTransportCost(
      "PALLETS",
      String(clientName),
      String(motherGuide),
    );
    const costTransport = toNumber(palletDoc.costTransport ?? invoiceTransportCost);

    return res.status(200).json({
      ok: true,
      message: "success",
      mensaje: "Datos agrupados con éxito",
      data: {
        ...results[0],
        costTransport,
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

const createPalletsWithSession = async (
  req: Request,
  session?: ClientSession,
): Promise<ApiResponse> => {
  const appliedInventoryUpdates: { inventoryId: any; quantity: number }[] = [];
  let savedPalletId: any;
  let savedPackingId = "";
  let wasExistingGuide = false;

  try {
    const data: IPalletNew = req.body;
    const clientName = normalizeClientName(data?.clientName);

    if (!data || !data.pallet || !clientName) {
      return jsonResponse(400, {
        ok: false,
        message: "No data",
        mensaje: "No hay datos",
        data: null,
      });
    }

    const clientCode = await getClientCodeForName(clientName);
    const normalizedMiamiInvoiceNumber = normalizeMiamiInvoiceNumber(
      data?.miamiInvoiceNumber,
    );
    const hasCostTransport = data.costTransport !== undefined;
    const costTransport = hasCostTransport ? Number(data.costTransport) : undefined;

    const { pallets, calcPallet } = data.pallet;
    const weightLB = Number(calcPallet?.weightLB);

    if (!Array.isArray(pallets) || pallets.length === 0 || !Number.isFinite(weightLB) || weightLB <= 0) {
      return jsonResponse(400, {
        ok: false,
        message: "Invalid packing list data",
        mensaje: "Datos de packing list invalidos",
        data: null,
      });
    }

    if (costTransport !== undefined && (!Number.isFinite(costTransport) || costTransport < 0)) {
      return jsonResponse(400, {
        ok: false,
        message: "Invalid transport cost",
        mensaje: "Costo de transporte invalido",
        data: null,
      });
    }

    const motherGuideValue = data.motherGuide?.trim();
    const isMotherGuideEmpty = !motherGuideValue;
    const isSpecial = clientName === "Daniel";
    const preparedItems: {
      item: any;
      inventoryKey: string;
      quantityUnit: number;
      unitPrice: number;
      totalUnitPrice: number;
    }[] = [];
    const inventoryReservations = new Map<
      string,
      { inventoryItem: any; totalQuantity: number }
    >();
    let globalTotalPrice = 0;

    for (const item of pallets) {
      const quantityUnit = Number(item.quantityUnit);

      if (
        !item.model ||
        !item.inchs ||
        !item.descriptionModel ||
        !Number.isFinite(quantityUnit) ||
        quantityUnit <= 0
      ) {
        return jsonResponse(400, {
          ok: false,
          message: "Invalid inventory item",
          mensaje: "Item de inventario invalido",
          data: item,
        });
      }

      const pricesInfo = await withSession(
        PriceModel.findOne({
          model: item.model,
          inches: item.inchs,
          isSpecial,
        }),
        session,
      );

      const unitPrice = pricesInfo ? pricesInfo.unitPrice : 0;
      const totalUnitPrice = unitPrice * quantityUnit;

      const inventoryItem = await findInventoryItemForClient({
        inventoryId: item.inventoryId,
        clientName,
        brandTV: item.model,
        inchs: item.inchs,
        model: item.descriptionModel,
        minQuantity: quantityUnit,
        session,
      });

      if (!inventoryItem) {
        return jsonResponse(409, {
          ok: false,
          message: "Insufficient inventory or inventory not found",
          mensaje: "Inventario insuficiente o no encontrado",
          data: item,
        });
      }

      const inventoryKey = String(inventoryItem._id);
      const currentReservation = inventoryReservations.get(inventoryKey);
      const nextReservedQuantity =
        (currentReservation?.totalQuantity || 0) + quantityUnit;

      if (Number(inventoryItem.quantity) < nextReservedQuantity) {
        return jsonResponse(409, {
          ok: false,
          message: "Insufficient inventory or inventory not found",
          mensaje: "Inventario insuficiente o no encontrado",
          data: item,
        });
      }

      inventoryReservations.set(inventoryKey, {
        inventoryItem,
        totalQuantity: nextReservedQuantity,
      });

      preparedItems.push({
        item,
        inventoryKey,
        quantityUnit,
        unitPrice,
        totalUnitPrice,
      });

      globalTotalPrice += totalUnitPrice;
    }

    const maintenance = await withSession(MaintenanceCostModel.findOne(), session);

    if (!maintenance) {
      return jsonResponse(404, {
        ok: false,
        message: "Maintenance cost not found",
        mensaje: "Costo de mantenimiento no encontrado",
        data: null,
      });
    }

    const palletCalc = await CalcCost(weightLB, maintenance, globalTotalPrice);

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
    const allGuidesSameMother = (
      await withSession(PalletsModel.find(queryToCount), session)
    ).filter((guide) => normalizeClientName(guide.clientName) === clientName);

    const currentPalletCount = allGuidesSameMother.reduce((total, guide) => {
      const guidePalletsCount =
        guide.pallet && Array.isArray(guide.pallet) ? guide.pallet.length : 0;
      return total + guidePalletsCount;
    }, 0);

    const palletDescription = `PACKING LIST PLT#${currentPalletCount + 1} (${weightLB} LBS)`;
    const generatedMotherGuide = isMotherGuideEmpty
      ? `No Guide - ${currentPalletCount + 1}`
      : motherGuideValue;
    const existingGuide = allGuidesSameMother.find(
      (guide) => guide.motherGuide === generatedMotherGuide,
    );

    const updatedInventoryById = new Map<string, any>();

    for (const [inventoryKey, reservation] of inventoryReservations) {
      const updatedInventory = await InventoryModel.findOneAndUpdate(
        {
          _id: reservation.inventoryItem._id,
          isDisabled: false,
          quantity: { $gte: reservation.totalQuantity },
        },
        { $inc: { quantity: -reservation.totalQuantity } },
        {
          returnDocument: "after",
          runValidators: true,
          ...sessionOptions(session),
        },
      );

      if (!updatedInventory) {
        if (!session) await rollbackInventoryUpdates(appliedInventoryUpdates);

        return jsonResponse(409, {
          ok: false,
          message: "Insufficient inventory or inventory not found",
          mensaje: "Inventario insuficiente o no encontrado",
          data: reservation.inventoryItem,
        });
      }

      updatedInventoryById.set(inventoryKey, updatedInventory);
      appliedInventoryUpdates.push({
        inventoryId: updatedInventory._id,
        quantity: reservation.totalQuantity,
      });
    }

    const runningQuantityByInventory = new Map<string, number>();
    const enrichedPallets: IPalletsDetails[] = [];
    const inventoryExits: {
      inventoryId: any;
      quantity: number;
      previousQuantity: number;
      resultingQuantity: number;
    }[] = [];

    for (const preparedItem of preparedItems) {
      const updatedInventory = updatedInventoryById.get(preparedItem.inventoryKey);
      const reservation = inventoryReservations.get(preparedItem.inventoryKey);
      const previousQuantity = runningQuantityByInventory.has(preparedItem.inventoryKey)
        ? Number(runningQuantityByInventory.get(preparedItem.inventoryKey))
        : Number(updatedInventory.quantity) + Number(reservation?.totalQuantity || 0);
      const resultingQuantity = previousQuantity - preparedItem.quantityUnit;

      runningQuantityByInventory.set(preparedItem.inventoryKey, resultingQuantity);

      inventoryExits.push({
        inventoryId: updatedInventory._id,
        quantity: preparedItem.quantityUnit,
        previousQuantity,
        resultingQuantity,
      });

      enrichedPallets.push({
        lineId: randomUUID(),
        inventoryId: String(updatedInventory._id),
        inventoryMiamiInvoiceNumber: updatedInventory.lastMiamiInvoiceNumber,
        model: preparedItem.item.model,
        inchs: preparedItem.item.inchs,
        descriptionModel: preparedItem.item.descriptionModel,
        quantityUnit: preparedItem.quantityUnit,
        arrivedQuantity: 0,
        invoicedQuantity: 0,
        unitPrice: preparedItem.unitPrice,
        totalUnitPrice: preparedItem.totalUnitPrice,
      });
    }

    const newPalletSingle = {
      packingId: randomUUID(),
      palletDescription,
      arrivalStatus: "IN_TRANSIT",
      pallets: enrichedPallets,
      calcPallet: palletCalc,
    };

    savedPackingId = newPalletSingle.packingId;
    wasExistingGuide = Boolean(existingGuide);

    const saved = existingGuide
      ? await PalletsModel.findByIdAndUpdate(
          existingGuide._id,
          {
            $set: {
              clientName,
              status: getStatusAfterAppendingPacking(
                existingGuide.status,
                isMotherGuideEmpty,
              ),
              arrivalStatus: getArrivalStatusAfterAppendingPacking(
                existingGuide.arrivalStatus,
              ),
              ...(clientCode ? { clientCode } : {}),
              ...(normalizedMiamiInvoiceNumber
                ? { miamiInvoiceNumber: normalizedMiamiInvoiceNumber }
                : {}),
              ...(costTransport !== undefined
                ? { costTransport }
                : {}),
            },
            $push: { pallet: newPalletSingle },
          },
          {
            returnDocument: "after",
            runValidators: true,
            ...sessionOptions(session),
          },
        )
      : (
          await PalletsModel.create(
            [
              {
                date: data.date,
                motherGuide: generatedMotherGuide,
                clientName,
                clientCode,
                costTransport: costTransport ?? 0,
                miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
                isActive: true,
                isDelete: false,
                status: isMotherGuideEmpty ? "Pending guidance" : "Not invoiced",
                pallet: [newPalletSingle],
              },
            ],
            sessionOptions(session),
          )
        )[0];

    if (!saved) {
      if (!session) await rollbackInventoryUpdates(appliedInventoryUpdates);

      return jsonResponse(400, {
        ok: false,
        message: "Not saved",
        mensaje: "No guardado",
        data: null,
      });
    }

    savedPalletId = saved._id;

    const movementDocs = inventoryExits.map((movement) => ({
      ...movement,
      type: "EXIT",
      miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
      referenceType: "PALLET",
      referenceId: String(saved._id),
      createdBy: (req as any).user?._id,
    }));

    if (session) {
      await InventoryMovementModel.create(movementDocs, { session, ordered: true });
    } else {
      await InventoryMovementModel.create(movementDocs, { ordered: true });
    }

    await syncInvoicesForPacking({
      type: "PALLETS",
      currentDoc: saved,
      session,
    });

    return jsonResponse(201, {
      ok: true,
      message: "Saved",
      mensaje: "Guardado correctamente",
      data: serializePallet(saved),
    });
  } catch (error) {
    if (!session) {
      if (savedPalletId && savedPackingId) {
        try {
          await cleanupSavedPallet(savedPalletId, savedPackingId, wasExistingGuide);
        } catch (rollbackError) {
          console.error("[CREATE PALLET CLEANUP ERROR]", {
            message: (rollbackError as any).message,
            name: (rollbackError as any).name,
            code: (rollbackError as any).code,
          });
        }
      }

      if (appliedInventoryUpdates.length > 0) {
        try {
          await rollbackInventoryUpdates(appliedInventoryUpdates);
        } catch (rollbackError) {
          console.error("[CREATE PALLET ROLLBACK ERROR]", {
            message: (rollbackError as any).message,
            name: (rollbackError as any).name,
            code: (rollbackError as any).code,
          });
        }
      }
    }

    throw error;
  }
};

const createPallets = async (req: Request, res: Response) => {
  let session: ClientSession | undefined;

  try {
    session = await PalletsModel.startSession();
    session.startTransaction();

    const result = await createPalletsWithSession(req, session);

    if (result.statusCode >= 400) {
      await abortIfActive(session);
    } else {
      await session.commitTransaction();
    }

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    await abortIfActive(session);

    if (isTransactionUnsupportedError(error)) {
      console.warn("[CREATE PALLET TRANSACTION FALLBACK] Retrying without transaction", {
        message: (error as any).message,
        name: (error as any).name,
        code: (error as any).code,
      });

      try {
        const result = await createPalletsWithSession(req);
        return res.status(result.statusCode).json(result.body);
      } catch (fallbackError) {
        return handleCreatePalletError(res, fallbackError, req.body);
      }
    }

    return handleCreatePalletError(res, error, req.body);
  } finally {
    session?.endSession();
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
      {
        status: status,
        clientName: normalizeClientName(clientName),
        clientCode: await getClientCodeForName(clientName),
      },
      { returnDocument: "after", runValidators: true },
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
          inventoryId: item.inventoryId ? String(item.inventoryId) : undefined,
          clientName: normalizedClient,
          brandTV: item.model,
          inchs: item.inchs,
          model: item.descriptionModel,
          miamiInvoiceNumber: item.inventoryMiamiInvoiceNumber,
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

        const restoredInventory = await InventoryModel.findOneAndUpdate(
          { _id: inventoryItem._id, isDisabled: false },
          { $inc: { quantity: quantityUnit } },
          { returnDocument: "after", runValidators: true, session },
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
      { returnDocument: "after", runValidators: true, session },
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

    await syncInvoicesForPacking({
      type: "PALLETS",
      currentDoc: deletedPallet,
      previousClientName: normalizedClient,
      previousMotherGuide: palletDoc.motherGuide,
      session,
    });

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
        inventoryId: itemDeleted.inventoryId ? String(itemDeleted.inventoryId) : undefined,
        clientName: normalizeClientName(docPallet.clientName),
        brandTV: itemDeleted.model,
        model: itemDeleted.descriptionModel,
        inchs: itemDeleted.inchs,
        miamiInvoiceNumber: itemDeleted.inventoryMiamiInvoiceNumber,
      });

      const restoreInv = inventoryItem
        ? await InventoryModel.findOneAndUpdate(
            { _id: inventoryItem._id, isDisabled: false },
            { $inc: { quantity: itemDeleted.quantityUnit } },
            { returnDocument: "after", runValidators: true },
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
      refreshPalletStatuses(docPallet);
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

      await syncInvoicesForPacking({
        type: "PALLETS",
        currentDoc: docPallet,
        previousClientName: docPallet.clientName,
        previousMotherGuide: docPallet.motherGuide,
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

const updatePalletItems = async (req: Request, res: Response) => {
  const session = await PalletsModel.startSession();

  try {
    session.startTransaction();

    const { _id, items, costTransport } = req.body;
    const hasCostTransport = costTransport !== undefined;
    const role = (req as any).user?.role;
    const canUpdateLineDetails = ["FLYPACKADMIN", "FLYPACKJDG", "FLYPACKMIAMI"].includes(role);
    const canUseRequestedUnitPrice = role === "FLYPACKADMIN" || role === "FLYPACKJDG";
    const canUpdateTransportCost = role === "FLYPACKADMIN" || role === "FLYPACKJDG";

    if (!_id || ((!Array.isArray(items) || items.length === 0) && !hasCostTransport)) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid pallet item update data",
        mensaje: "Datos de actualizacion de pallet invalidos",
        data: null,
      });
    }

    const nextCostTransport = hasCostTransport ? Number(costTransport) : undefined;

    if (
      nextCostTransport !== undefined &&
      (!Number.isFinite(nextCostTransport) || nextCostTransport < 0)
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid transport cost",
        mensaje: "Costo de transporte invalido",
        data: null,
      });
    }

    if (nextCostTransport !== undefined && !canUpdateTransportCost) {
      await session.abortTransaction();
      return res.status(403).json({
        ok: false,
        message: "Only Admin/JDG can update transport cost",
        mensaje: "Solo Admin/JDG pueden actualizar el costo de transporte",
        data: null,
      });
    }

    const palletDoc = await PalletsModel.findById(_id).session(session);

    if (!palletDoc || palletDoc.isDelete) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "Pallet not found",
        mensaje: "Pallet no encontrado",
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

    ensurePalletTrackingIds(palletDoc);

    const normalizedClient = normalizeClientName(palletDoc.clientName);
    const affectedPackings = new Set<any>();
    const inventoryMovements: any[] = [];
    let shouldSyncInvoices = nextCostTransport !== undefined;

    if (nextCostTransport !== undefined) {
      palletDoc.costTransport = roundMoney(nextCostTransport);
    }

    for (const itemUpdate of Array.isArray(items) ? items : []) {
      const packing = findPackingForUpdate(palletDoc, itemUpdate);
      const line = findLineForUpdate(packing, itemUpdate);

      if (!packing || !line) {
        await session.abortTransaction();
        return res.status(404).json({
          ok: false,
          message: "Packing item not found",
          mensaje: "Item de packing no encontrado",
          data: itemUpdate,
        });
      }

      const oldQuantity = toNumber(line.quantityUnit);
      const nextQuantity = Number(itemUpdate.quantityUnit ?? line.quantityUnit);
      const hasWeightLB = itemUpdate.weightLB !== undefined;
      const nextWeightLB = hasWeightLB
        ? Number(itemUpdate.weightLB)
        : toNumber(packing.calcPallet?.weightLB);
      const requestedModel = typeof itemUpdate.model === "string" && itemUpdate.model.trim()
        ? itemUpdate.model.trim()
        : undefined;
      const requestedInchs = typeof itemUpdate.inchs === "string" && itemUpdate.inchs.trim()
        ? itemUpdate.inchs.trim()
        : undefined;
      const requestedDescriptionModel = typeof itemUpdate.descriptionModel === "string"
        ? itemUpdate.descriptionModel.trim()
        : undefined;
      const restrictedLineDetailsChanged = !canUpdateLineDetails && (
        (requestedModel !== undefined && requestedModel !== String(line.model || "")) ||
        (requestedInchs !== undefined && requestedInchs !== String(line.inchs || "")) ||
        (requestedDescriptionModel !== undefined && requestedDescriptionModel !== String(line.descriptionModel || ""))
      );

      if (restrictedLineDetailsChanged) {
        await session.abortTransaction();
        return res.status(403).json({
          ok: false,
          message: "Only operations can update pallet line details",
          mensaje: "Solo operaciones pueden actualizar detalles de lineas del pallet",
          data: itemUpdate,
        });
      }

      const nextModel = canUpdateLineDetails ? (requestedModel ?? line.model) : line.model;
      const nextInchs = canUpdateLineDetails ? (requestedInchs ?? line.inchs) : line.inchs;
      const nextDescriptionModel = canUpdateLineDetails
        ? (requestedDescriptionModel ?? line.descriptionModel)
        : line.descriptionModel;
      let nextUnitPrice = toNumber(line.unitPrice);

      if (canUpdateLineDetails) {
        const priceInfo = await PriceModel.findOne({
          model: nextModel,
          inches: nextInchs,
          isSpecial: normalizedClient === "Daniel",
        }).session(session);
        nextUnitPrice = priceInfo && Number.isFinite(Number(priceInfo.unitPrice))
          ? Number(priceInfo.unitPrice)
          : canUseRequestedUnitPrice
            ? Number(itemUpdate.unitPrice ?? line.unitPrice)
            : toNumber(line.unitPrice);
      }

      if (
        !Number.isFinite(nextQuantity) ||
        nextQuantity <= 0 ||
        !Number.isFinite(nextWeightLB) ||
        nextWeightLB <= 0 ||
        !Number.isFinite(nextUnitPrice) ||
        nextUnitPrice < 0
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          ok: false,
          message: "Invalid pallet item values",
          mensaje: "Valores de item de pallet invalidos",
          data: itemUpdate,
        });
      }

      const quantityDelta = nextQuantity - oldQuantity;
      const inventoryIdentityChanged =
        String(nextModel) !== String(line.model) ||
        String(nextInchs) !== String(line.inchs) ||
        String(nextDescriptionModel) !== String(line.descriptionModel);
      const unitPriceChanged = roundMoney(nextUnitPrice) !== roundMoney(toNumber(line.unitPrice));
      const weightChanged = roundMoney(nextWeightLB) !== roundMoney(toNumber(packing.calcPallet?.weightLB));

      if (inventoryIdentityChanged || unitPriceChanged || weightChanged) {
        shouldSyncInvoices = true;
      }

      if (inventoryIdentityChanged) {
        const oldInventoryItem = await findInventoryItemForClient({
          inventoryId: line.inventoryId ? String(line.inventoryId) : undefined,
          clientName: normalizedClient,
          brandTV: line.model,
          model: line.descriptionModel,
          inchs: line.inchs,
          miamiInvoiceNumber: line.inventoryMiamiInvoiceNumber,
          session,
        });

        if (!oldInventoryItem) {
          await session.abortTransaction();
          return res.status(400).json({
            ok: false,
            message: "Original inventory item not found",
            mensaje: "Item original de inventario no encontrado",
            data: itemUpdate,
          });
        }

        const restoredInventory = await InventoryModel.findOneAndUpdate(
          { _id: oldInventoryItem._id, isDisabled: false },
          { $inc: { quantity: oldQuantity } },
          { returnDocument: "after", runValidators: true, session },
        );

        if (!restoredInventory) {
          await session.abortTransaction();
          return res.status(400).json({
            ok: false,
            message: "Original inventory could not be restored",
            mensaje: "No se pudo restaurar inventario original",
            data: itemUpdate,
          });
        }

        inventoryMovements.push({
          inventoryId: restoredInventory._id,
          type: "ADJUSTMENT",
          quantity: oldQuantity,
          previousQuantity: Number(restoredInventory.quantity) - oldQuantity,
          resultingQuantity: Number(restoredInventory.quantity),
          miamiInvoiceNumber: palletDoc.miamiInvoiceNumber,
          referenceType: "PALLET_ITEM_UPDATE_RESTORE",
          referenceId: String(palletDoc._id),
          createdBy: (req as any).user?._id,
        });

        const nextInventoryItem = await findInventoryItemForClient({
          clientName: normalizedClient,
          brandTV: nextModel,
          model: nextDescriptionModel,
          inchs: nextInchs,
          minQuantity: nextQuantity,
          session,
        });

        if (!nextInventoryItem) {
          await session.abortTransaction();
          return res.status(409).json({
            ok: false,
            message: "Insufficient inventory for updated item",
            mensaje: "Inventario insuficiente para el item actualizado",
            data: itemUpdate,
          });
        }

        const updatedNextInventory = await InventoryModel.findOneAndUpdate(
          {
            _id: nextInventoryItem._id,
            isDisabled: false,
            quantity: { $gte: nextQuantity },
          },
          { $inc: { quantity: -nextQuantity } },
          { returnDocument: "after", runValidators: true, session },
        );

        if (!updatedNextInventory) {
          await session.abortTransaction();
          return res.status(409).json({
            ok: false,
            message: "Insufficient inventory for updated item",
            mensaje: "Inventario insuficiente para el item actualizado",
            data: itemUpdate,
          });
        }

        line.inventoryId = String(updatedNextInventory._id);
        line.inventoryMiamiInvoiceNumber = updatedNextInventory.lastMiamiInvoiceNumber;

        inventoryMovements.push({
          inventoryId: updatedNextInventory._id,
          type: "ADJUSTMENT",
          quantity: nextQuantity,
          previousQuantity: Number(updatedNextInventory.quantity) + nextQuantity,
          resultingQuantity: Number(updatedNextInventory.quantity),
          miamiInvoiceNumber: palletDoc.miamiInvoiceNumber,
          referenceType: "PALLET_ITEM_UPDATE_EXIT",
          referenceId: String(palletDoc._id),
          createdBy: (req as any).user?._id,
        });
      } else if (quantityDelta !== 0) {
        const inventoryItem = await findInventoryItemForClient({
          inventoryId: line.inventoryId ? String(line.inventoryId) : undefined,
          clientName: normalizedClient,
          brandTV: line.model,
          model: line.descriptionModel,
          inchs: line.inchs,
          miamiInvoiceNumber: line.inventoryMiamiInvoiceNumber,
          session,
        });

        if (!inventoryItem) {
          await session.abortTransaction();
          return res.status(400).json({
            ok: false,
            message: "Inventory item not found",
            mensaje: "Item de inventario no encontrado",
            data: itemUpdate,
          });
        }

        if (quantityDelta > 0 && Number(inventoryItem.quantity) < quantityDelta) {
          await session.abortTransaction();
          return res.status(409).json({
            ok: false,
            message: "Insufficient inventory",
            mensaje: "Inventario insuficiente",
            data: itemUpdate,
          });
        }

        const updatedInventory = await InventoryModel.findOneAndUpdate(
          { _id: inventoryItem._id, isDisabled: false },
          { $inc: { quantity: -quantityDelta } },
          { returnDocument: "after", runValidators: true, session },
        );

        if (!updatedInventory) {
          await session.abortTransaction();
          return res.status(400).json({
            ok: false,
            message: "Inventory could not be updated",
            mensaje: "No se pudo actualizar inventario",
            data: itemUpdate,
          });
        }

        inventoryMovements.push({
          inventoryId: updatedInventory._id,
          type: "ADJUSTMENT",
          quantity: Math.abs(quantityDelta),
          previousQuantity: Number(updatedInventory.quantity) + quantityDelta,
          resultingQuantity: Number(updatedInventory.quantity),
          miamiInvoiceNumber: palletDoc.miamiInvoiceNumber,
          referenceType: "PALLET_ITEM_UPDATE",
          referenceId: String(palletDoc._id),
          createdBy: (req as any).user?._id,
        });
      }

      line.model = nextModel;
      line.inchs = nextInchs;
      line.descriptionModel = nextDescriptionModel;
      line.quantityUnit = nextQuantity;
      line.unitPrice = nextUnitPrice;
      line.totalUnitPrice = roundMoney(nextUnitPrice * nextQuantity);
      if (hasWeightLB) {
        packing.calcPallet.weightLB = nextWeightLB;
      }
      affectedPackings.add(packing);
    }

    for (const packing of affectedPackings) {
      const totalPrice = (packing.pallets || []).reduce(
        (total: number, item: any) => total + toNumber(item.totalUnitPrice),
        0,
      );
      const weightLB = toNumber(packing.calcPallet?.weightLB);

      packing.calcPallet = await CalcCost(weightLB, maintenance, totalPrice);
      packing.palletDescription = String(packing.palletDescription || "").replace(
        /\([^)]*LBS\)/i,
        `(${weightLB} LBS)`,
      );
    }

    refreshPalletStatuses(palletDoc);
    palletDoc.markModified("pallet");

    if (inventoryMovements.length > 0) {
      await InventoryMovementModel.create(inventoryMovements, { session });
    }

    const savedPallet = await palletDoc.save({ session });

    if (shouldSyncInvoices) {
      await syncInvoicesForPacking({
        type: "PALLETS",
        currentDoc: savedPallet,
        previousClientName: palletDoc.clientName,
        previousMotherGuide: palletDoc.motherGuide,
        session,
      });
    }

    await session.commitTransaction();

    return res.status(200).json({
      ok: true,
      message: "Pallet items updated",
      mensaje: "Items de pallet actualizados",
      data: serializePallet(savedPallet),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[PALLET ITEM UPDATE ERROR]", {
      message: (error as any).message,
      name: (error as any).name,
      code: (error as any).code,
      stack: (error as any).stack,
      body: req.body,
    });

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

const updateGuide = async (req: Request, res: Response) => {
  try {
    const { _id, motherGuide } = req.body;

    if (!motherGuide && !_id) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    const palletBeforeUpdate = await PalletsModel.findById(_id);
    const nextStatus = palletBeforeUpdate?.status === "Pending guidance"
      ? "Not invoiced"
      : palletBeforeUpdate?.status || "Not invoiced";

    const update = await PalletsModel.findByIdAndUpdate(
      _id,
      { motherGuide: motherGuide, status: nextStatus },
      { returnDocument: "after", runValidators: true },
    );

    if (!update) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    await syncInvoicesForPacking({
      type: "PALLETS",
      currentDoc: update,
      previousClientName: palletBeforeUpdate?.clientName,
      previousMotherGuide: palletBeforeUpdate?.motherGuide,
    });

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

const updatePalletArrivalStatus = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide, arrivalStatus } = req.body;
    const validStatuses = ["IN_TRANSIT", "PARTIAL_ARRIVED", "ARRIVED", "DELIVERED"];

    if (!clientName || !motherGuide || !validStatuses.includes(arrivalStatus)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid arrival status data",
        mensaje: "Datos de llegada invalidos",
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

    const update: Record<string, any> = { arrivalStatus };

    if (arrivalStatus === "ARRIVED") {
      update.arrivedAt = new Date();
    }

    if (arrivalStatus === "DELIVERED") {
      update.deliveredAt = new Date();
      update.arrivedAt = palletDoc.arrivedAt || new Date();
    }

    const updatedPallet = await PalletsModel.findByIdAndUpdate(
      palletDoc._id,
      update,
      { returnDocument: "after", runValidators: true },
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
      message: "Arrival status updated",
      mensaje: "Estado de llegada actualizado",
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

const updatePalletPartialArrival = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide, items } = req.body;

    if (!clientName || !motherGuide || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid partial arrival data",
        mensaje: "Datos de llegada parcial invalidos",
        data: null,
      });
    }

    const normalizedClient = normalizeClientName(clientName);
    const palletDoc = (await PalletsModel.find({
      motherGuide,
      isDelete: false,
      isActive: true,
    })).find((doc) => normalizeClientName(doc.clientName) === normalizedClient);

    if (!palletDoc) {
      return res.status(404).json({
        ok: false,
        message: "Pallet not found",
        mensaje: "Pallet no encontrado",
        data: null,
      });
    }

    ensurePalletTrackingIds(palletDoc);
    let shouldSyncInvoices = false;

    for (const update of items) {
      const hasArrivedQuantity = update.arrivedQuantity !== undefined;
      const hasInvoicedQuantity = update.invoicedQuantity !== undefined;
      const arrivedQuantity = hasArrivedQuantity ? Number(update.arrivedQuantity) : undefined;
      const invoicedQuantity = hasInvoicedQuantity ? Number(update.invoicedQuantity) : undefined;

      if (
        (!hasArrivedQuantity && !hasInvoicedQuantity) ||
        (hasArrivedQuantity && (!Number.isFinite(arrivedQuantity) || Number(arrivedQuantity) < 0)) ||
        (hasInvoicedQuantity && (!Number.isFinite(invoicedQuantity) || Number(invoicedQuantity) < 0))
      ) {
        return res.status(400).json({
          ok: false,
          message: "Invalid received/invoiced item",
          mensaje: "Item recibido/facturado invalido",
          data: update,
        });
      }

      const packing = findPackingForUpdate(palletDoc, update);
      const item = findLineForUpdate(packing, update);

      if (!packing || !item) {
        return res.status(404).json({
          ok: false,
          message: "Packing item not found",
          mensaje: "Item de packing no encontrado",
          data: update,
        });
      }

      if (hasArrivedQuantity) {
        item.arrivedQuantity = arrivedQuantity;
      }

      if (hasInvoicedQuantity) {
        if (toNumber(item.invoicedQuantity) !== Number(invoicedQuantity)) {
          shouldSyncInvoices = true;
        }

        item.invoicedQuantity = invoicedQuantity;
      }
    }

    refreshPalletStatuses(palletDoc);
    palletDoc.markModified("pallet");
    await palletDoc.save();

    if (shouldSyncInvoices) {
      await syncInvoicesForPacking({
        type: "PALLETS",
        currentDoc: palletDoc,
        previousClientName: clientName,
        previousMotherGuide: motherGuide,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Partial arrival updated",
      mensaje: "Llegada parcial actualizada",
      data: serializePallet(palletDoc),
    });
  } catch (error) {
    console.error("[PALLET PARTIAL ARRIVAL ERROR]", {
      message: (error as any).message,
      name: (error as any).name,
      code: (error as any).code,
      stack: (error as any).stack,
      body: req.body,
    });

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
  updatePalletItems,
  updateGuide,
  updatePalletArrivalStatus,
  updatePalletPartialArrival,
};
