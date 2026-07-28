import { Request, Response } from "express";
import InvoicesModel from "../models/Invoices.model";
import { normalizeClientName, withDecryptedClientFields } from "../helpers/clientName";

const serializeInvoice = (invoice: any) => withDecryptedClientFields(invoice);

const includesText = (value: unknown, search: string) =>
  String(value || "").toLowerCase().includes(search.toLowerCase());

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

    if (data.client) {
      data.client = normalizeClientName(data.client);
    }


    data.totalSaleNoTransport = Number(data.totalSale) + Number(data.costTransport); 

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
      data: serializeInvoice(invoice),
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
  getInvoices,
  getInvoicesByMotherGuide,
  getInvoicesByMotherGuideAndClient,
  getInvoicesForClient,
  searchInvoices,
};
