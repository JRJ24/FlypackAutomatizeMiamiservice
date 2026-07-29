import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { config } from "../config/env";
import PalletsModel from "../models/Pallets.model";

const toNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

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

const migratePalletPartialBilling = async () => {
  await mongoose.connect(config.mongodbUri);

  try {
    const pallets = await PalletsModel.find();
    let updatedCount = 0;

    for (const pallet of pallets) {
      let changed = false;
      const isFullyInvoiced = pallet.status === "Invoiced";
      const isArrived = ["ARRIVED", "DELIVERED"].includes(String(pallet.arrivalStatus || ""));

      for (const packing of pallet.pallet || []) {
        if (!packing.packingId) {
          packing.packingId = randomUUID();
          changed = true;
        }

        for (const item of packing.pallets || []) {
          const quantity = toNumber(item.quantityUnit);

          if (!item.lineId) {
            item.lineId = randomUUID();
            changed = true;
          }

          if (item.arrivedQuantity === undefined || item.arrivedQuantity === null) {
            item.arrivedQuantity = isFullyInvoiced || isArrived ? quantity : 0;
            changed = true;
          }

          if (item.invoicedQuantity === undefined || item.invoicedQuantity === null) {
            item.invoicedQuantity = isFullyInvoiced ? quantity : 0;
            changed = true;
          }
        }

        const nextPackingStatus = getPackingArrivalStatus(packing);
        if (!packing.arrivalStatus || packing.arrivalStatus !== nextPackingStatus) {
          packing.arrivalStatus = nextPackingStatus;
          changed = true;
        }

        if (packing.arrivalStatus !== "IN_TRANSIT" && !packing.arrivedAt) {
          packing.arrivedAt = pallet.arrivedAt || new Date();
          changed = true;
        }
      }

      if (changed) {
        await pallet.save();
        updatedCount += 1;
      }
    }

    console.log(`[pallet-partial-billing] Updated pallets: ${updatedCount}`);
  } finally {
    await mongoose.disconnect();
  }
};

migratePalletPartialBilling().catch((error) => {
  console.error("[pallet-partial-billing] Migration failed", error);
  process.exit(1);
});
