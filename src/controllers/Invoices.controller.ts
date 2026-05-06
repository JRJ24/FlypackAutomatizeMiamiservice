import { Request, Response } from "express";
import InvoicesModel from "../models/Invoices.model";

const createInvoices = async (req: Request, res: Response) => {
  try {
    const { ...data } = req.body;

    if (!data) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const invoice = await InvoicesModel.create(data);

    if (!invoice) {
      return res.status(400).json({
        ok: false,
        message: "No invoices",
        mensaje: "No invoices",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Invoices",
      mensaje: "Invoices",
      data: invoice,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
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
      data: invoicesMG,
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

    const invoicesMGCL = await InvoicesModel.find({
      motherGuide: motherGuide,
      client: client,
    });

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
      data: invoicesMGCL,
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
      data: results,
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

const paidInvoice = (req: Request, res: Response) => {
  try {
    
  } catch (error) {
    
  }
}

export {
  createInvoices,
  getInvoicesByMotherGuide,
  getInvoicesByMotherGuideAndClient,
  getInvoicesForClient,
};
