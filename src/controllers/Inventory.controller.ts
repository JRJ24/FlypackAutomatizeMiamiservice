import { Request, Response } from "express";
import InventoryModel from "../models/Inventory.model";

const createInventory = async (req: Request, res: Response) => {
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

    const inventory = await InventoryModel.create(data);

    if (!inventory) {
      return res.status(400).json({
        ok: false,
        message: "NO CREATED",
        mensaje: "No CREADO",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Saved in the inventory",
      mensaje: "Guardado en el inventario",
      data: inventory,
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

const getInventory = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const client = req.params.client as string;
    const skip = (page - 1) * limit;

    const [inventory, totalItems] = await Promise.all([
      InventoryModel.find({ client: client, isDisabled: false })
        .skip(skip)
        .limit(limit),
      InventoryModel.countDocuments({ isDisabled: false }),
    ]);

    if (!inventory) {
      return res.status(400).json({
        ok: false,
        message: "NO FOUNDED",
        mensaje: "No ENCONTRADOS",
        data: null,
      });
    }

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(201).json({
      ok: true,
      message: "The inventory",
      mensaje: "El inventario",
      data: inventory,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
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

const getInventoryClient = async (req: Request, res: Response) => {
  try {
    const [inventory, totalItems] = await Promise.all([
      InventoryModel.find({ isDisabled: false }).select("client"),
      InventoryModel.countDocuments({ isDisabled: false }),
    ]);

    if (!inventory) {
      return res.status(400).json({
        ok: false,
        message: "NO FOUNDED",
        mensaje: "No ENCONTRADOS",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "The inventory",
      mensaje: "El inventario",
      data: inventory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const getQuantityOfClient = async (req: Request, res: Response) => {
  try {
    const { clientName, brandTV, inches } = req.body;

    if (!clientName || !brandTV || !inches) {
      return res.status(400).json({
        ok: false,
        message: "NO Data available",
        mensaje: "No data disponible",
        data: null,
      });
    }

    const quantityAvailable = await InventoryModel.findOne({
      client: clientName,
      brandTV: brandTV,
      inchs: inches
    }).select({ quantity: 1, model: 1 });

    if (!quantityAvailable) {
      return res.status(400).json({
        ok: false,
        message: "NO have stock",
        mensaje: "No tiene stock",
        data: 0,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Quantity",
      mensaje: "Cantidad",
      data: quantityAvailable,
    });
  } catch (error) {
    return res.status(500).json({
      ok: true,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};
const UpdateQtyInventory = async (req: Request, res: Response) => {
  try {
    const { _id, ...data } = req.body;

    if (!_id || !data) {
      return res.status(400).json({
        ok: false,
        message: "Error",
        mensaje: "Error",
        data: null,
      });
    }

    const inventory = await InventoryModel.findByIdAndUpdate(
      _id,
      data,
      { new: true },
    );

    if (!inventory) {
      return res.status(400).json({
        ok: false,
        message: "NO update",
        mensaje: "No actualizado",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "The inventory",
      mensaje: "El inventario",
      data: inventory,
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

const deleteInventory = async (req: Request, res: Response) => {
  try {
    const { _id } = req.body;

    const inventory = await InventoryModel.findByIdAndUpdate(_id, {
      isDisabled: true,
    });

    if (!inventory) {
      return res.status(400).json({
        ok: false,
        message: "NO delete",
        mensaje: "No eliminado",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "The inventory",
      mensaje: "El inventario",
      data: inventory,
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

export {
  createInventory,
  getInventory,
  UpdateQtyInventory,
  deleteInventory,
  getInventoryClient,
  getQuantityOfClient
};
