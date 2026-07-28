import type { ClientSession } from "mongoose";
import InventoryModel from "../models/Inventory.model";
import { normalizeClientName } from "./clientName";

interface FindInventoryItemParams {
  clientName: string;
  brandTV: string;
  inchs: string | number;
  model: string;
  minQuantity?: number;
  session?: ClientSession;
}

const findInventoryItemForClient = async ({
  clientName,
  brandTV,
  inchs,
  model,
  minQuantity,
  session,
}: FindInventoryItemParams) => {
  const query: Record<string, any> = {
    brandTV,
    inchs: String(inchs),
    model,
    isDisabled: false,
  };

  if (minQuantity !== undefined) {
    query.quantity = { $gte: minQuantity };
  }

  const request = InventoryModel.find(query);

  if (session) request.session(session);

  const normalizedClientName = normalizeClientName(clientName);
  const candidates = await request;

  return candidates.find(
    (inventory) => normalizeClientName(inventory.client) === normalizedClientName,
  ) || null;
};

export { findInventoryItemForClient };
