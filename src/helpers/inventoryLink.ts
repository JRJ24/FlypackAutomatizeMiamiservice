import { isValidObjectId, type ClientSession } from "mongoose";
import InventoryModel from "../models/Inventory.model";
import { normalizeClientName } from "./clientName";
import { normalizeMiamiInvoiceNumber } from "./miamiInvoiceNumber";

interface FindInventoryItemParams {
  inventoryId?: string;
  clientName: string;
  brandTV: string;
  inchs: string | number;
  model: string;
  miamiInvoiceNumber?: string;
  minQuantity?: number;
  session?: ClientSession;
}

const findInventoryItemForClient = async ({
  inventoryId,
  clientName,
  brandTV,
  inchs,
  model,
  miamiInvoiceNumber,
  minQuantity,
  session,
}: FindInventoryItemParams) => {
  const normalizedClientName = normalizeClientName(clientName);
  const normalizedBrandTV = String(brandTV || "").trim();
  const normalizedInchs = String(inchs || "").trim();
  const normalizedModel = String(model || "").trim().toUpperCase();
  const normalizedMiamiInvoiceNumber = normalizeMiamiInvoiceNumber(miamiInvoiceNumber);

  if (inventoryId) {
    if (!isValidObjectId(inventoryId)) return null;

    const byIdQuery: Record<string, any> = {
      _id: inventoryId,
      isDisabled: false,
    };

    if (minQuantity !== undefined) {
      byIdQuery.quantity = { $gte: minQuantity };
    }

    const byIdRequest = InventoryModel.findOne(byIdQuery);

    if (session) byIdRequest.session(session);

    const inventory = await byIdRequest;

    if (!inventory) return null;

    const matchesIdentity =
      normalizeClientName(inventory.client) === normalizedClientName &&
      String(inventory.brandTV || "").trim() === normalizedBrandTV &&
      String(inventory.inchs || "").trim() === normalizedInchs &&
      String(inventory.model || "").trim().toUpperCase() === normalizedModel;

    if (!matchesIdentity) return null;

    if (
      miamiInvoiceNumber !== undefined &&
      normalizedMiamiInvoiceNumber !== inventory.lastMiamiInvoiceNumber
    ) {
      return null;
    }

    return inventory;
  }

  const query: Record<string, any> = {
    brandTV: normalizedBrandTV,
    inchs: normalizedInchs,
    model: normalizedModel,
    isDisabled: false,
  };

  if (miamiInvoiceNumber !== undefined) {
    query.lastMiamiInvoiceNumber = normalizedMiamiInvoiceNumber || { $exists: false };
  }

  if (minQuantity !== undefined) {
    query.quantity = { $gte: minQuantity };
  }

  const request = InventoryModel.find(query);

  if (session) request.session(session);

  const candidates = await request;

  return candidates.find(
    (inventory) => normalizeClientName(inventory.client) === normalizedClientName,
  ) || null;
};

export { findInventoryItemForClient };
