import type { ClientSession } from "mongoose";
import InvoicesModel from "../models/Invoices.model";
import AccountsReceivableModel from "../models/Finanzes/AccountsReceivable.model";
import AccountsCXCModel from "../models/Finanzes/AccountsCXC.model";
import { normalizeClientName } from "./clientName";

type PackingInvoiceType = "PALLETS" | "LUGGAGES";

interface SyncPackingOptions {
  type: PackingInvoiceType;
  currentDoc?: any | null;
  previousClientName?: string;
  previousMotherGuide?: string;
  session?: ClientSession;
}

const toNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const withSession = <T extends { session: (session: ClientSession) => T }>(
  query: T,
  session?: ClientSession,
) => (session ? query.session(session) : query);

const getInvoiceTotal = (invoice: any) => {
  const totalWithTransport = toNumber(invoice?.totalSaleNoTransport);
  return totalWithTransport > 0 ? totalWithTransport : toNumber(invoice?.totalSale);
};

const getReceivableStatus = (amount: number, invoiceTotal: number) => {
  if (amount <= 0) return "PAID";
  if (amount < invoiceTotal) return "PARTIALLY_PAID";
  return "PENDING";
};

const getInvoiceStatus = (amount: number, invoiceTotal: number) => {
  if (amount <= 0) return "PAID";
  if (amount < invoiceTotal) return "OWES";
  return "NO PAID";
};

const adjustClientCXC = async (
  clientName: string,
  amountDelta: number,
  session?: ClientSession,
) => {
  const normalizedClient = normalizeClientName(clientName);
  const roundedDelta = roundMoney(amountDelta);

  if (!normalizedClient || Math.abs(roundedDelta) < 0.01) return;

  const account = await withSession(
    AccountsCXCModel.findOne({ clientName: normalizedClient }),
    session,
  );
  const nextAmount = roundMoney(Math.max(toNumber(account?.totalAmount) + roundedDelta, 0));

  if (account) {
    account.totalAmount = nextAmount;
    account.isActive = nextAmount > 0;
    account.lastUpdate = new Date();
    await account.save(session ? { session } : undefined);
    return;
  }

  if (nextAmount <= 0) return;

  await AccountsCXCModel.create(
    [
      {
        clientName: normalizedClient,
        totalAmount: nextAmount,
        isActive: true,
        lastUpdate: new Date(),
      },
    ],
    session ? { session, ordered: true } : undefined,
  );
};

export const syncInvoiceFinances = async (
  invoice: any,
  nextInvoiceTotal: number,
  nextClientName: string,
  nextMotherGuide: string,
  session?: ClientSession,
) => {
  const invoiceNumber = invoice?.invoiceNumber;
  const normalizedNextClient = normalizeClientName(nextClientName);
  const roundedNextTotal = roundMoney(Math.max(nextInvoiceTotal, 0));

  if (!invoiceNumber || !normalizedNextClient) {
    return {
      status: getInvoiceStatus(roundedNextTotal, roundedNextTotal),
      totalPaid: 0,
    };
  }

  const oldInvoiceTotal = roundMoney(getInvoiceTotal(invoice));
  const receivable = await withSession(
    AccountsReceivableModel.findOne({ invoiceNumber }),
    session,
  );
  const previousClient = normalizeClientName(receivable?.clientName || invoice.client || normalizedNextClient);
  const previousOutstanding = receivable ? roundMoney(toNumber(receivable.amount)) : 0;
  const paidAmount = receivable
    ? roundMoney(Math.max(toNumber(invoice.totalPaid), oldInvoiceTotal - previousOutstanding, 0))
    : roundMoney(Math.max(toNumber(invoice.totalPaid), 0));
  const nextOutstanding = roundMoney(Math.max(roundedNextTotal - paidAmount, 0));
  const nextTotalPaid = roundMoney(Math.min(paidAmount, roundedNextTotal));

  if (receivable) {
    receivable.clientName = normalizedNextClient;
    receivable.motherGuide = nextMotherGuide;
    receivable.amount = nextOutstanding;
    receivable.status = getReceivableStatus(nextOutstanding, roundedNextTotal);
    await receivable.save(session ? { session } : undefined);
  } else {
    await AccountsReceivableModel.create(
      [
        {
          clientName: normalizedNextClient,
          motherGuide: nextMotherGuide,
          amount: nextOutstanding,
          invoiceNumber,
          status: getReceivableStatus(nextOutstanding, roundedNextTotal),
        },
      ],
      session ? { session, ordered: true } : undefined,
    );
  }

  if (previousClient && previousClient !== normalizedNextClient) {
    await adjustClientCXC(previousClient, -previousOutstanding, session);
    await adjustClientCXC(normalizedNextClient, nextOutstanding, session);
  } else {
    await adjustClientCXC(
      normalizedNextClient,
      roundMoney(nextOutstanding - previousOutstanding),
      session,
    );
  }

  return {
    status: getInvoiceStatus(nextOutstanding, roundedNextTotal),
    totalPaid: nextTotalPaid,
  };
};

const buildPalletLineKey = (packingId?: string, lineId?: string) => `${packingId || ""}:${lineId || ""}`;

const recalculatePalletInvoice = (
  invoice: any,
  palletDoc: any | null,
  useCurrentInvoicedQuantities = false,
) => {
  const costTransport = palletDoc?.isDelete
    ? 0
    : toNumber(palletDoc?.costTransport ?? invoice.costTransport);
  const lineByKey = new Map<string, { packing: any; line: any }>();
  const packings = !palletDoc?.isDelete && Array.isArray(palletDoc?.pallet) ? palletDoc.pallet : [];

  for (const packing of packings) {
    for (const line of packing.pallets || []) {
      lineByKey.set(buildPalletLineKey(packing.packingId, line.lineId), { packing, line });
    }
  }

  const existingItems = Array.isArray(invoice.items) ? invoice.items : [];
  const isPartial = invoice.invoiceScope === "PARTIAL" || (!invoice.invoiceScope && existingItems.length > 0);
  const nextItems: any[] = [];
  const quantityByPacking = new Map<string, number>();
  let totalSale = 0;
  let totalTVs = 0;

  if (isPartial) {
    for (const invoiceItem of existingItems) {
      const current = lineByKey.get(buildPalletLineKey(invoiceItem.packingId, invoiceItem.lineId));
      if (!current) continue;

      const storedInvoicedQuantity = toNumber(current.line.invoicedQuantity);
      const quantity = useCurrentInvoicedQuantities
        ? storedInvoicedQuantity
        : toNumber(invoiceItem.quantity);

      if (quantity <= 0) continue;

      const unitPrice = toNumber(current.line.unitPrice);
      const lineTotalSale = roundMoney(unitPrice * quantity);
      const packingId = current.packing.packingId || invoiceItem.packingId;

      quantityByPacking.set(
        packingId,
        (quantityByPacking.get(packingId) || 0) + quantity,
      );
      totalTVs += quantity;
      totalSale += lineTotalSale;
      nextItems.push({
        packingId,
        lineId: current.line.lineId || invoiceItem.lineId,
        packingDescription: current.packing.palletDescription,
        brandTV: current.line.model,
        inches: current.line.inchs,
        model: current.line.descriptionModel,
        quantity,
        unitPrice,
        totalSale: lineTotalSale,
      });
    }
  } else {
    for (const packing of packings) {
      for (const line of packing.pallets || []) {
        const quantity = toNumber(line.quantityUnit);
        if (quantity <= 0) continue;

        const unitPrice = toNumber(line.unitPrice);
        const lineTotalSale = roundMoney(unitPrice * quantity);
        const packingId = packing.packingId || "";

        quantityByPacking.set(
          packingId,
          (quantityByPacking.get(packingId) || 0) + quantity,
        );
        totalTVs += quantity;
        totalSale += lineTotalSale;
        nextItems.push({
          packingId,
          lineId: line.lineId,
          packingDescription: packing.palletDescription,
          brandTV: line.model,
          inches: line.inchs,
          model: line.descriptionModel,
          quantity,
          unitPrice,
          totalSale: lineTotalSale,
        });
      }
    }
  }

  let totalFreight = 0;
  let totalRate = 0;
  let totalADM = 0;
  let totalService = 0;
  let totalCosts = 0;

  for (const [packingId, invoicedQuantity] of quantityByPacking.entries()) {
    const packing = packings.find((group: any) => group.packingId === packingId);
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

  return {
    totalPallets: String(quantityByPacking.size),
    totalTVs: String(totalTVs),
    totalFreight,
    totalRate,
    totalADM,
    totalService,
    totalCosts,
    totalSale,
    totalUtility: roundMoney(totalSale + costTransport - totalCosts),
    costTransport,
    totalSaleNoTransport: roundMoney(totalSale + costTransport),
    invoiceScope: isPartial ? "PARTIAL" : "FULL",
    items: nextItems,
  };
};

const recalculateSuitcaseInvoice = (invoice: any, suitcaseDoc: any | null) => {
  const costTransport = suitcaseDoc?.isDelete
    ? 0
    : toNumber(suitcaseDoc?.costTransport ?? invoice.costTransport);
  const suitCases = !suitcaseDoc?.isDelete && Array.isArray(suitcaseDoc?.suitCases)
    ? suitcaseDoc.suitCases
    : [];
  const items = suitCases
    .map((item: any) => {
      const quantity = toNumber(item.quantity);
      const unitPrice = quantity > 0 ? roundMoney(toNumber(item.totalUnitPrice) / quantity) : 0;

      return {
        brandTV: item.brandModel,
        inches: item.inches,
        model: item.modelDescription,
        quantity,
        unitPrice,
        totalSale: roundMoney(toNumber(item.totalUnitPrice)),
      };
    })
    .filter((item: any) => item.quantity > 0);
  const totalFreight = roundMoney(suitCases.reduce((total: number, item: any) => total + toNumber(item.totalFreight), 0));
  const totalRate = roundMoney(suitCases.reduce((total: number, item: any) => total + toNumber(item.totalRate), 0));
  const totalCosts = roundMoney(suitCases.reduce((total: number, item: any) => total + toNumber(item.totalCostVersat), 0));
  const totalSale = roundMoney(suitCases.reduce((total: number, item: any) => total + toNumber(item.totalUnitPrice), 0));
  const totalUtility = roundMoney(totalSale + costTransport - totalCosts);
  const totalTVs = items.reduce((total: number, item: any) => total + toNumber(item.quantity), 0);

  return {
    totalPallets: String(suitCases.length),
    totalTVs: String(totalTVs),
    totalFreight,
    totalRate,
    totalADM: 0,
    totalService: 0,
    totalCosts,
    totalSale,
    totalUtility,
    costTransport,
    totalSaleNoTransport: roundMoney(totalSale + costTransport),
    invoiceScope: "FULL",
    items,
  };
};

export const syncInvoicesForPacking = async ({
  type,
  currentDoc,
  previousClientName,
  previousMotherGuide,
  session,
}: SyncPackingOptions) => {
  const previousClient = normalizeClientName(previousClientName || currentDoc?.clientName);
  const previousGuide = previousMotherGuide || currentDoc?.motherGuide;
  const nextClient = normalizeClientName(currentDoc?.clientName || previousClient);
  const nextGuide = currentDoc?.motherGuide || previousGuide;

  if (!previousClient || !previousGuide || !nextClient || !nextGuide) return;

  const invoices = await withSession(
    InvoicesModel.find({
      type,
      motherGuide: { $in: Array.from(new Set([previousGuide, nextGuide])) },
    }),
    session,
  );
  const matchingInvoices = invoices.filter((invoice) => {
    const invoiceClient = normalizeClientName(invoice.client);
    return invoiceClient === previousClient || invoiceClient === nextClient;
  });

  for (const invoice of matchingInvoices) {
    const recalculated = type === "PALLETS"
      ? recalculatePalletInvoice(invoice, currentDoc, matchingInvoices.length === 1)
      : recalculateSuitcaseInvoice(invoice, currentDoc);
    const financeState = await syncInvoiceFinances(
      invoice,
      recalculated.totalSaleNoTransport,
      nextClient,
      nextGuide,
      session,
    );

    invoice.set({
      client: nextClient,
      clientCode: currentDoc?.clientCode || invoice.clientCode,
      motherGuide: nextGuide,
      ...recalculated,
      status: financeState.status,
      totalPaid: financeState.totalPaid,
    });

    await invoice.save(session ? { session } : undefined);
  }
};
