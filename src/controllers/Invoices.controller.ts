import { Request, Response } from "express";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import InvoicesModel from "../models/Invoices.model";
import { normalizeClientName, withDecryptedClientFields } from "../helpers/clientName";
import { getClientCodeForName } from "../helpers/clientIdentity";
import PalletsModel from "../models/Pallets.model";
import SuitcasesModel from "../models/Suitcases.model";
import { syncInvoiceFinances, syncInvoicesForPacking } from "../helpers/syncInvoices";

const serializeInvoice = (invoice: any) => withDecryptedClientFields(invoice);

const includesText = (value: unknown, search: string) =>
  String(value || "").toLowerCase().includes(search.toLowerCase());

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

const buildPalletInvoiceData = (
  invoiceLines: { packing: any; line: any; quantity: number }[],
  costTransport: number,
) => {
  const quantityByPacking = new Map<string, number>();
  const packingById = new Map<string, any>();
  const items: any[] = [];
  let totalSale = 0;
  let totalTVs = 0;

  for (const invoiceLine of invoiceLines) {
    const quantity = toNumber(invoiceLine.quantity);

    if (quantity <= 0) continue;

    const unitPrice = toNumber(invoiceLine.line.unitPrice);
    const lineTotalSale = roundMoney(unitPrice * quantity);
    const packingId = invoiceLine.packing.packingId;
    const lineId = invoiceLine.line.lineId;

    packingById.set(packingId, invoiceLine.packing);
    quantityByPacking.set(
      packingId,
      (quantityByPacking.get(packingId) || 0) + quantity,
    );
    totalSale += lineTotalSale;
    totalTVs += quantity;

    items.push({
      packingId,
      lineId,
      packingDescription: invoiceLine.packing.palletDescription,
      brandTV: invoiceLine.line.model,
      inches: invoiceLine.line.inchs,
      model: invoiceLine.line.descriptionModel,
      quantity,
      unitPrice,
      totalSale: lineTotalSale,
    });
  }

  let totalFreight = 0;
  let totalRate = 0;
  let totalADM = 0;
  let totalService = 0;
  let totalCosts = 0;

  for (const [packingId, invoicedQuantity] of quantityByPacking.entries()) {
    const packing = packingById.get(packingId);
    const packingQuantity = (packing?.pallets || []).reduce(
      (total: number, item: any) => total + toNumber(item.quantityUnit),
      0,
    );
    const ratio = packingQuantity > 0 ? invoicedQuantity / packingQuantity : 0;

    totalFreight += toNumber(packing?.calcPallet?.totalFreight) * ratio;
    totalRate += toNumber(packing?.calcPallet?.totalRate) * ratio;
    totalADM += toNumber(packing?.calcPallet?.ADM) * ratio;
    totalService += toNumber(packing?.calcPallet?.caribeTrans) * ratio;
    totalCosts += toNumber(packing?.calcPallet?.totalCost) * ratio;
  }

  totalSale = roundMoney(totalSale);
  totalFreight = roundMoney(totalFreight);
  totalRate = roundMoney(totalRate);
  totalADM = roundMoney(totalADM);
  totalService = roundMoney(totalService);
  totalCosts = roundMoney(totalCosts);

  const totalSaleNoTransport = roundMoney(totalSale + costTransport);

  return {
    totalPallets: String(quantityByPacking.size),
    totalTVs: String(totalTVs),
    totalFreight,
    totalRate,
    totalADM,
    totalService,
    totalCosts,
    totalSale,
    totalUtility: roundMoney(totalSaleNoTransport - totalCosts),
    totalSaleNoTransport,
    costTransport,
    invoiceScope: "PARTIAL",
    items,
  };
};

const getCurrentPalletInvoiceLines = (palletDoc: any) => (palletDoc.pallet || []).flatMap(
  (packing: any) => (packing.pallets || [])
    .map((line: any) => ({
      packing,
      line,
      quantity: toNumber(line.invoicedQuantity),
    }))
    .filter((invoiceLine: any) => invoiceLine.quantity > 0),
);

const findPalletForInvoice = async (clientName: string, motherGuide: string, session?: any) => {
  const request = PalletsModel.find({ motherGuide, isDelete: false, isActive: true });
  if (session) request.session(session);

  const normalizedClient = normalizeClientName(clientName);
  const candidates = await request;

  return candidates.find((pallet) => normalizeClientName(pallet.clientName) === normalizedClient) || null;
};

const findSuitcaseForInvoice = async (clientName: string, motherGuide: string, session?: any) => {
  const request = SuitcasesModel.find({ motherGuide, isDelete: false });
  if (session) request.session(session);

  const normalizedClient = normalizeClientName(clientName);
  const candidates = await request;

  return candidates.find((suitcase) => normalizeClientName(suitcase.clientName) === normalizedClient) || null;
};

const updatePackingTransportCost = async (invoice: any, costTransport: number, session?: any) => {
  if (invoice.type === "PALLETS") {
    const palletDoc = await findPalletForInvoice(invoice.client, invoice.motherGuide, session);

    if (!palletDoc) return null;

    palletDoc.costTransport = costTransport;
    await palletDoc.save(session ? { session } : undefined);
    return palletDoc;
  }

  if (invoice.type === "LUGGAGES") {
    const suitDoc = await findSuitcaseForInvoice(invoice.client, invoice.motherGuide, session);

    if (!suitDoc) return null;

    suitDoc.costTransport = costTransport;
    await suitDoc.save(session ? { session } : undefined);
    return suitDoc;
  }

  return null;
};

const getInvoices = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = String(req.query.search || "").trim();
    const skip = (page - 1) * limit;

    const invoices = (await InvoicesModel.find().sort({ date: -1, _id: -1 }))
      .map(serializeInvoice)
      .filter((invoice) => {
        if (!search) return true;

        return (
          includesText(invoice.client, search) ||
          includesText(invoice.motherGuide, search) ||
          includesText(invoice.invoiceNumber, search) ||
          includesText(invoice.type, search) ||
          includesText(invoice.status, search)
        );
      });

    const totalItems = invoices.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return res.status(200).json({
      ok: true,
      message: "Invoices",
      mensaje: "Facturas",
      data: invoices.slice(skip, skip + limit),
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

const updateInvoice = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const invoiceNumber = String(req.params.invoiceNumber || req.body.invoiceNumber || "").trim();
    const hasCostTransport = req.body.costTransport !== undefined;

    if (!invoiceNumber || !hasCostTransport) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid invoice update data",
        mensaje: "Datos de actualizacion de factura invalidos",
        data: null,
      });
    }

    const costTransport = Number(req.body.costTransport);

    if (!Number.isFinite(costTransport) || costTransport < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid transport cost",
        mensaje: "Costo de transporte invalido",
        data: null,
      });
    }

    const invoice = await InvoicesModel.findOne({ invoiceNumber }).session(session);

    if (!invoice) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "Invoice not found",
        mensaje: "Factura no encontrada",
        data: null,
      });
    }

    const packingDoc = await updatePackingTransportCost(
      invoice,
      roundMoney(costTransport),
      session,
    );

    if ((invoice.type === "PALLETS" || invoice.type === "LUGGAGES") && !packingDoc) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "Packing list not found for invoice",
        mensaje: "Packing list no encontrado para la factura",
        data: null,
      });
    }

    if (packingDoc) {
      await syncInvoicesForPacking({
        type: invoice.type as "PALLETS" | "LUGGAGES",
        currentDoc: packingDoc,
        previousClientName: invoice.client,
        previousMotherGuide: invoice.motherGuide,
        session,
      });

      const syncedInvoice = await InvoicesModel.findOne({ invoiceNumber }).session(session);

      if (syncedInvoice) {
        const nextInvoiceTotal = roundMoney(
          toNumber(syncedInvoice.totalSale) + toNumber(syncedInvoice.costTransport),
        );
        const nextUtility = roundMoney(nextInvoiceTotal - toNumber(syncedInvoice.totalCosts));

        if (
          roundMoney(toNumber(syncedInvoice.totalSaleNoTransport)) !== nextInvoiceTotal ||
          roundMoney(toNumber(syncedInvoice.totalUtility)) !== nextUtility
        ) {
          syncedInvoice.totalSaleNoTransport = nextInvoiceTotal;
          syncedInvoice.totalUtility = nextUtility;

          const financeState = await syncInvoiceFinances(
            syncedInvoice,
            nextInvoiceTotal,
            syncedInvoice.client,
            syncedInvoice.motherGuide,
            session,
          );

          syncedInvoice.status = financeState.status;
          syncedInvoice.totalPaid = financeState.totalPaid;
          await syncedInvoice.save({ session });
        }
      }
    } else {
      invoice.costTransport = roundMoney(costTransport);
      invoice.totalSaleNoTransport = roundMoney(toNumber(invoice.totalSale) + invoice.costTransport);
      invoice.totalUtility = roundMoney(invoice.totalSaleNoTransport - toNumber(invoice.totalCosts));

      const financeState = await syncInvoiceFinances(
        invoice,
        invoice.totalSaleNoTransport,
        invoice.client,
        invoice.motherGuide,
        session,
      );

      invoice.status = financeState.status;
      invoice.totalPaid = financeState.totalPaid;
      await invoice.save({ session });
    }

    const updatedInvoice = await InvoicesModel.findOne({ invoiceNumber }).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      ok: true,
      message: "Invoice updated",
      mensaje: "Factura actualizada",
      data: updatedInvoice ? serializeInvoice(updatedInvoice) : null,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[UPDATE INVOICE ERROR]", {
      message: (error as any).message,
      name: (error as any).name,
      code: (error as any).code,
      stack: (error as any).stack,
      body: req.body,
    });

    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  } finally {
    await session.endSession();
  }
};

const createInvoices = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { ...data } = req.body;

    if (!data) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    if (data.client) {
      data.client = normalizeClientName(data.client);
      data.clientCode = await getClientCodeForName(data.client);
    }

    data.costTransport = Number.isFinite(Number(data.costTransport))
      ? Number(data.costTransport)
      : 0;
    data.totalSale = toNumber(data.totalSale);
    data.totalCosts = toNumber(data.totalCosts);
    data.totalSaleNoTransport = roundMoney(data.totalSale + data.costTransport);
    data.totalUtility = roundMoney(data.totalSaleNoTransport - data.totalCosts);
    data.date = data.date || new Date().toISOString();

    const createdInvoices = await InvoicesModel.create([data], { session });
    const invoice = createdInvoices[0];

    if (!invoice) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "No invoices",
        mensaje: "No invoices",
        data: null,
      });
    }

    await updatePackingTransportCost(invoice, data.costTransport, session);

    const financeState = await syncInvoiceFinances(
      invoice,
      data.totalSaleNoTransport,
      data.client,
      data.motherGuide,
      session,
    );

    invoice.status = financeState.status;
    invoice.totalPaid = financeState.totalPaid;
    await invoice.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      ok: true,
      message: "Invoices",
      mensaje: "Invoices",
      data: serializeInvoice(invoice),
    });
  } catch (error) {
    await session.abortTransaction();
    console.log(error);
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  } finally {
    await session.endSession();
  }
};

const createPartialPalletInvoice = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { client, motherGuide, costTransport = 0, items, invoiceMode } = req.body;
    const normalizedClient = normalizeClientName(client);
    const clientCode = await getClientCodeForName(normalizedClient);
    const transportCost = Number(costTransport || 0);
    const role = (req as any).user?.role;
    const canUpdateTransportCost = role === "FLYPACKADMIN" || role === "FLYPACKJDG";
    const normalizedInvoiceMode = String(invoiceMode || "").toUpperCase();

    if (
      !normalizedClient ||
      !motherGuide ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !Number.isFinite(transportCost) ||
      transportCost < 0
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid partial invoice data",
        mensaje: "Datos de factura parcial invalidos",
        data: null,
      });
    }

    const palletDoc = (await PalletsModel.find({
      motherGuide,
      isDelete: false,
      isActive: true,
    }).session(session)).find(
      (pallet) => normalizeClientName(pallet.clientName) === normalizedClient,
    );

    if (!palletDoc) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "Pallet not found",
        mensaje: "Pallet no encontrado",
        data: null,
      });
    }

    const existingPalletInvoices = await InvoicesModel.find({
      motherGuide,
      type: "PALLETS",
    })
      .sort({ date: -1, _id: -1 })
      .session(session);
    const existingPalletInvoice = existingPalletInvoices.find(
      (invoice) => normalizeClientName(invoice.client) === normalizedClient,
    );

    if (
      existingPalletInvoice &&
      normalizedInvoiceMode !== "CREATE_NEW" &&
      normalizedInvoiceMode !== "OVERWRITE_EXISTING"
    ) {
      await session.abortTransaction();
      return res.status(409).json({
        ok: false,
        code: "PALLET_INVOICE_EXISTS",
        message: "A related invoice already exists",
        mensaje: "Ya existe una factura relacionada para este cliente y guia madre",
        data: serializeInvoice(existingPalletInvoice),
      });
    }

    if (normalizedInvoiceMode === "OVERWRITE_EXISTING" && !existingPalletInvoice) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        message: "Related invoice not found",
        mensaje: "No se encontro una factura relacionada para este cliente y guia madre",
        data: null,
      });
    }

    const currentTransportCost = roundMoney(toNumber(
      palletDoc.costTransport ?? existingPalletInvoice?.costTransport ?? 0,
    ));
    const effectiveTransportCost = canUpdateTransportCost
      ? roundMoney(transportCost)
      : currentTransportCost;

    if (!canUpdateTransportCost && roundMoney(transportCost) !== effectiveTransportCost) {
      await session.abortTransaction();
      return res.status(403).json({
        ok: false,
        message: "Only Admin/JDG can update transport cost",
        mensaje: "Solo Admin/JDG pueden actualizar el costo de transporte",
        data: null,
      });
    }

    ensurePalletTrackingIds(palletDoc);

    const selectedItems = items.map((item: any) => ({
      packingId: String(item.packingId || ""),
      lineId: String(item.lineId || ""),
      packingIndex: item.packingIndex,
      itemIndex: item.itemIndex,
      quantity: Number(item.quantity),
    }));

    if (
      selectedItems.some(
        (item: any) => !Number.isFinite(item.quantity) || item.quantity <= 0,
      )
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        message: "Invalid invoice items",
        mensaje: "Items de factura invalidos",
        data: items,
      });
    }

    const selectedInvoiceLines: { packing: any; line: any; quantity: number }[] = [];

    for (const selected of selectedItems) {
      const packing = findPackingForUpdate(palletDoc, selected);
      const line = findLineForUpdate(packing, selected);

      if (!packing || !line) {
        await session.abortTransaction();
        return res.status(404).json({
          ok: false,
          message: "Packing item not found",
          mensaje: "Item de packing no encontrado",
          data: selected,
        });
      }

      const invoicedQuantity = toNumber(line.invoicedQuantity);

      line.invoicedQuantity = invoicedQuantity + selected.quantity;
      selectedInvoiceLines.push({
        packing,
        line,
        quantity: selected.quantity,
      });
    }

    palletDoc.costTransport = effectiveTransportCost;
    refreshPalletStatuses(palletDoc);
    palletDoc.markModified("pallet");
    await palletDoc.save({ session });

    const calculatedInvoice = buildPalletInvoiceData(
      normalizedInvoiceMode === "OVERWRITE_EXISTING"
        ? getCurrentPalletInvoiceLines(palletDoc)
        : selectedInvoiceLines,
      effectiveTransportCost,
    );

    const invoicePayload = {
      client: normalizedClient,
      clientCode,
      motherGuide,
      date: new Date().toISOString(),
      type: "PALLETS",
      ...calculatedInvoice,
    };

    if (normalizedInvoiceMode === "OVERWRITE_EXISTING" && existingPalletInvoice) {
      const financeState = await syncInvoiceFinances(
        existingPalletInvoice,
        calculatedInvoice.totalSaleNoTransport,
        normalizedClient,
        motherGuide,
        session,
      );

      existingPalletInvoice.set({
        ...invoicePayload,
        date: existingPalletInvoice.date || invoicePayload.date,
        status: financeState.status,
        totalPaid: financeState.totalPaid,
      });

      await existingPalletInvoice.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        ok: true,
        message: "Related pallet invoice updated",
        mensaje: "Factura relacionada de pallet actualizada",
        data: serializeInvoice(existingPalletInvoice),
      });
    }

    const createdInvoices = await InvoicesModel.create([invoicePayload], { session });
    const invoice = createdInvoices[0];

    const financeState = await syncInvoiceFinances(
      invoice,
      calculatedInvoice.totalSaleNoTransport,
      normalizedClient,
      motherGuide,
      session,
    );

    invoice.status = financeState.status;
    invoice.totalPaid = financeState.totalPaid;
    await invoice.save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      ok: true,
      message: "Partial pallet invoice created",
      mensaje: "Factura parcial de pallet creada",
      data: serializeInvoice(invoice),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[PARTIAL PALLET INVOICE ERROR]", {
      message: (error as any).message,
      name: (error as any).name,
      code: (error as any).code,
      stack: (error as any).stack,
      body: req.body,
    });

    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  } finally {
    await session.endSession();
  }
};

const getInvoicesByMotherGuide = async (req: Request, res: Response) => {
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

    const invoicesMG = await InvoicesModel.find({ motherGuide: motherGuide });

    if (!invoicesMG) {
      return res.status(400).json({
        ok: false,
        message: "No Invoices",
        mensaje: "No Invoices",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Invoices",
      mensaje: "Invoicess",
      data: invoicesMG.map(serializeInvoice),
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

const searchInvoices = async (req: Request, res: Response) => {
  try {
    const { search } = req.params;
    const searchValue = Array.isArray(search) ? search[0] : search;

    if (!searchValue || searchValue.trim() === "") {
      return res.status(400).json({
        ok: false,
        message: "Search term is required",
        mensaje: "El término de búsqueda es requerido",
        data: null,
      });
    }

    const normalizedSearch = searchValue.trim();

    const invoices = await InvoicesModel.find({
      $or: [
        {
          motherGuide: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
        {
          client: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
        {
          invoiceNumber: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
      ],
    }).limit(20);

    if (invoices.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No invoices found",
        mensaje: "No se encontraron facturas",
        data: [],
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Invoices found",
      mensaje: "Facturas encontradas",
      data: invoices.map(serializeInvoice),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      message: "Internal server error",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const getInvoicesByMotherGuideAndClient = async (
  req: Request,
  res: Response,
) => {
  try {
    const { motherGuide, client } = req.params;

    if (!motherGuide || !client) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const normalizedClient = normalizeClientName(client);
    const invoicesMGCL = (await InvoicesModel.find({
      motherGuide: motherGuide,
    })).filter((invoice) => normalizeClientName(invoice.client) === normalizedClient);

    if (!invoicesMGCL) {
      return res.status(400).json({
        ok: false,
        message: "No Invoices",
        mensaje: "No Invoices",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Invoices",
      mensaje: "Invoices",
      data: invoicesMGCL.map(serializeInvoice),
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

const getInvoicesForClient = async (req: Request, res: Response) => {
  try {
    const { motherGuide, clientName } = req.params;
    const invoiceNumber = String(req.query.invoiceNumber || "").trim();

    console.log("Esto llega: ", motherGuide, clientName);

    if (!motherGuide || !clientName) {
      console.log("Entro aqui");
      return res.status(400).json({
        ok: false,
        message: "no data",
        mensaje: "no data",
        data: null,
      });
    }

    if (invoiceNumber) {
      const invoice = await InvoicesModel.findOne({
        motherGuide: String(motherGuide),
        invoiceNumber,
      });

      if (invoice && normalizeClientName(invoice.client) === normalizeClientName(clientName)) {
        const serializedInvoice = serializeInvoice(invoice);
        const items = Array.isArray(serializedInvoice.items) ? serializedInvoice.items : [];

        if (items.length > 0) {
          return res.status(200).json({
            ok: true,
            message: "results",
            mensaje: "resultado",
            data: items.map((item: any) => ({
              clientName: serializedInvoice.client,
              motherGuide: serializedInvoice.motherGuide,
              brandTV: item.brandTV,
              inches: item.inches,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalSale: item.totalSale,
              grandTotal: serializedInvoice.totalSaleNoTransport || serializedInvoice.totalSale,
              statusInvoices: serializedInvoice.invoiceScope === "PARTIAL"
                ? "Partially invoiced"
                : "Invoiced",
            })),
          });
        }
      }
    }

    const results = await InvoicesModel.aggregate([
      {
        $match: {
          motherGuide: String(motherGuide), // Forzamos a String por si acaso
          client: String(clientName),
        },
      },
      {
        $lookup: {
          from: "pallets", // ASEGÚRATE QUE SEA IGUAL A COMPASS
          localField: "motherGuide",
          foreignField: "motherGuide",
          as: "detailsPallets",
        },
      },
      { $unwind: "$detailsPallets" },
      { $unwind: "$detailsPallets.pallet" },
      { $unwind: "$detailsPallets.pallet.pallets" },
      {
        $project: {
          clientName: "$client",
          motherGuide: "$motherGuide",
          brandTV: "$detailsPallets.pallet.pallets.model",
          inches: "$detailsPallets.pallet.pallets.inchs",
          quantity: "$detailsPallets.pallet.pallets.quantityUnit",
          unitPrice: "$detailsPallets.pallet.pallets.unitPrice",
          totalSale: "$detailsPallets.pallet.pallets.totalUnitPrice",
          grandTotal: { $sum: "$detailsPallets.pallet.pallets.totalUnitPrice" },
          statusInvoices: "$detailsPallets.status",
        },
      },
    ]);

    if (!results || results.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No results",
        mensaje: "No resultado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "results",
      mensaje: "resultado",
      data: results.map(serializeInvoice),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No results",
      mensaje: "No resultado",
      data: null,
    });
  }
};

// const paidInvoice = (req: Request, res: Response) => {
//   try {
//   } catch (error) {}
// };

export {
  createInvoices,
  createPartialPalletInvoice,
  getInvoices,
  updateInvoice,
  getInvoicesByMotherGuide,
  getInvoicesByMotherGuideAndClient,
  getInvoicesForClient,
  searchInvoices,
};
