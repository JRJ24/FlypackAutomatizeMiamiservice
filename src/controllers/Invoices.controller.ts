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
      mensaje: "Invoices",
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

const getInvoicesByMotherGuideAndClient = async (req: Request, res: Response) => {
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

    const invoicesMGCL = await InvoicesModel.find({ motherGuide: motherGuide, client: client });

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

export { createInvoices, getInvoicesByMotherGuide, getInvoicesByMotherGuideAndClient };
