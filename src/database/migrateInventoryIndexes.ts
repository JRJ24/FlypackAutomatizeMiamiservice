import mongoose from "mongoose";
import { config } from "../config/env";
import InventoryModel from "../models/Inventory.model";

const legacyInventoryIndexKey = {
  client: 1,
  brandTV: 1,
  inchs: 1,
  model: 1,
};

const inventoryIndexKey = {
  client: 1,
  brandTV: 1,
  inchs: 1,
  model: 1,
  lastMiamiInvoiceNumber: 1,
};

const keysMatch = (left: Record<string, any>, right: Record<string, any>) =>
  JSON.stringify(left) === JSON.stringify(right);

const migrateInventoryIndexes = async () => {
  await mongoose.connect(config.mongodbUri);

  try {
    const indexes = await InventoryModel.collection.indexes();
    const legacyIndexes = indexes.filter((index) =>
      Boolean(index.unique) && keysMatch(index.key, legacyInventoryIndexKey),
    );

    for (const index of legacyIndexes) {
      if (!index.name) continue;
      await InventoryModel.collection.dropIndex(index.name);
      console.log(`[inventory-indexes] Dropped legacy index: ${index.name}`);
    }

    await InventoryModel.collection.createIndex(inventoryIndexKey, {
      unique: true,
      partialFilterExpression: { isDisabled: false },
      name: "client_1_brandTV_1_inchs_1_model_1_lastMiamiInvoiceNumber_1",
    });

    console.log("[inventory-indexes] Current index ensured");
  } finally {
    await mongoose.disconnect();
  }
};

migrateInventoryIndexes().catch((error) => {
  console.error("[inventory-indexes] Migration failed", error);
  process.exit(1);
});
