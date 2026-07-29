import { Request, Response } from "express";
import InventoryModel from "../models/Inventory.model";
import PalletsModel from "../models/Pallets.model";
import SuitcasesModel from "../models/Suitcases.model";
import InvoicesModel from "../models/Invoices.model";
import {
  getRequestClientIdentity,
  matchesClientIdentity,
} from "../helpers/clientIdentity";

const sum = (values: number[]) =>
  values.reduce((total, value) => total + Number(value || 0), 0);

const getInvoicesForShipment = (
  invoices: Record<string, any>[],
  type: "PALLETS" | "LUGGAGES",
  motherGuide: string,
) => invoices.filter(
  (invoice) =>
    String(invoice.type || "").toUpperCase() === type &&
    String(invoice.motherGuide || "") === String(motherGuide || ""),
);

const getOverview = async (req: Request, res: Response) => {
  try {
    const identity = getRequestClientIdentity((req as any).user);

    if (!identity.clientName) {
      return res.status(400).json({
        ok: false,
        message: "Client identity not found",
        mensaje: "Identidad del cliente no encontrada",
        data: null,
      });
    }

    const [inventoryDocs, palletDocs, suitcaseDocs, invoiceDocs] = await Promise.all([
      InventoryModel.find({ isDisabled: false, quantity: { $gt: 0 } }).lean(),
      PalletsModel.find({ isDelete: false, isActive: true }).lean(),
      SuitcasesModel.find({ isDelete: false }).lean(),
      InvoicesModel.find().sort({ date: -1, _id: -1 }).lean(),
    ]);

    const inventory = inventoryDocs
      .filter((item) => matchesClientIdentity(item, "client", identity))
      .map((item) => ({
        id: String(item._id),
        brandTV: item.brandTV,
        inches: item.inchs,
        model: item.model,
        quantity: Number(item.quantity || 0),
        miamiInvoiceNumber: item.lastMiamiInvoiceNumber,
        status: "IN_MIAMI",
      }));

    const invoices = invoiceDocs
      .filter((invoice) => matchesClientIdentity(invoice, "client", identity))
      .map((invoice) => ({
        id: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        motherGuide: invoice.motherGuide,
        type: invoice.type,
        date: invoice.date,
        status: invoice.status,
        items: invoice.items || [],
        totalTVs: invoice.totalTVs,
      }));

    const filteredPallets = palletDocs.filter((pallet) =>
      matchesClientIdentity(pallet, "clientName", identity),
    );
    const filteredSuitcases = suitcaseDocs.filter((suitcase) =>
      matchesClientIdentity(suitcase, "clientName", identity),
    );

    const palletShipments = filteredPallets.map((pallet) => {
      const items = (pallet.pallet || []).flatMap((container: any) =>
        (container.pallets || []).map((item: any) => ({
          brandTV: item.model,
          inches: item.inchs,
          model: item.descriptionModel,
          quantity: Number(item.quantityUnit || 0),
        })),
      );
      const shipmentInvoices = getInvoicesForShipment(invoices, "PALLETS", pallet.motherGuide);

      return {
        id: String(pallet._id),
        type: "PALLETS",
        label: "Pallets",
        date: pallet.date,
        motherGuide: pallet.motherGuide,
        miamiInvoiceNumber: pallet.miamiInvoiceNumber,
        packingStatus: pallet.status,
        arrivalStatus: pallet.arrivalStatus || "IN_TRANSIT",
        arrivedAt: pallet.arrivedAt,
        deliveredAt: pallet.deliveredAt,
        invoiceNumber: shipmentInvoices.length === 1
          ? shipmentInvoices[0].invoiceNumber
          : shipmentInvoices.length > 1
            ? `${shipmentInvoices.length} invoices`
            : undefined,
        invoiceStatus: shipmentInvoices[0]?.status,
        totalTVs: sum(items.map((item: any) => item.quantity)),
        items,
      };
    });

    const suitcaseShipments = filteredSuitcases.map((suitcase) => {
      const items = (suitcase.suitCases || []).map((item: any) => ({
        brandTV: item.brandModel,
        inches: item.inches,
        model: item.modelDescription,
        quantity: Number(item.quantity || 0),
      }));
      const shipmentInvoices = getInvoicesForShipment(invoices, "LUGGAGES", suitcase.motherGuide);

      return {
        id: String(suitcase._id),
        type: "LUGGAGES",
        label: "Suitcases",
        date: suitcase.dateArrive,
        motherGuide: suitcase.motherGuide,
        miamiInvoiceNumber: suitcase.miamiInvoiceNumber,
        packingStatus: suitcase.status,
        arrivalStatus: suitcase.arrivalStatus || "IN_TRANSIT",
        arrivedAt: suitcase.arrivedAt,
        deliveredAt: suitcase.deliveredAt,
        invoiceNumber: shipmentInvoices.length === 1
          ? shipmentInvoices[0].invoiceNumber
          : shipmentInvoices.length > 1
            ? `${shipmentInvoices.length} invoices`
            : undefined,
        invoiceStatus: shipmentInvoices[0]?.status,
        totalTVs: sum(items.map((item: any) => item.quantity)),
        items,
      };
    });

    const shipments = [...palletShipments, ...suitcaseShipments].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")),
    );
    const inMiami = sum(inventory.map((item) => item.quantity));
    const inPacking = sum(shipments.map((shipment) => shipment.totalTVs));
    const invoiced = sum(
      invoices.map((invoice) => {
        if (Array.isArray(invoice.items) && invoice.items.length > 0) {
          return sum(invoice.items.map((item: any) => item.quantity));
        }

        return Number(invoice.totalTVs || 0);
      }),
    );
    const arrived = sum(
      shipments
        .filter((shipment) => ["ARRIVED", "DELIVERED"].includes(shipment.arrivalStatus))
        .map((shipment) => shipment.totalTVs),
    );

    return res.status(200).json({
      ok: true,
      message: "Client overview",
      mensaje: "Resumen del cliente",
      data: {
        client: identity,
        summary: {
          inMiami,
          inPacking,
          invoiced,
          arrived,
          invoices: invoices.length,
        },
        inventory,
        shipments,
        invoices,
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

export { getOverview };
