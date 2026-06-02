import { Request, Response } from "express";
import InventoryModel from "../models/Inventory.model";

const createInventory = async (req: Request, res: Response) => {
  try {
    // 1. Extraemos quantity del resto de los datos
    const { quantity, ...otherData } = req.body; 

    const modelUpper = otherData.model.toUpperCase();

    const inventory = await InventoryModel.findOneAndUpdate(
      {
        brandTV: otherData.brandTV,
        inchs: otherData.inchs,
        model: modelUpper,
        client: otherData.client,
        // isDisabled: false
      },
      {
        // 2. Usamos $inc solo para la cantidad numérica
        $inc: { quantity: quantity }, 
        // 3. Usamos $set para todo lo demás (que ya NO incluye quantity)
        $set: { ...otherData, model: modelUpper, isDisabled: false } 
      },
      {
        // 4. Solución al Warning de Mongoose: usamos returnDocument
        returnDocument: 'after', 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(201).json({
      ok: true,
      message: "Inventario procesado",
      data: inventory,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error en el servidor" });
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
      InventoryModel.countDocuments({ client: client, isDisabled: false }),
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
      return res.status(400).json({ ok: false, mensaje: "Faltan datos" });
    }

    // CAMBIO: Usar .find() para traer todos los modelos que coincidan
    const items = await InventoryModel.find({
      client: clientName,
      brandTV: brandTV,
      inchs: inches,
      isDisabled: false,
      quantity: { $gt: 0 } // Opcional: solo traer los que tienen stock
    }).select({ brandTV: 1, quantity: 1, model: 1 });

    if (!items || items.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "No hay stock disponible", data: [] });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Modelos encontrados",
      data: items, // Ahora enviamos un Array
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: "Error de servidor" });
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

    const inventory = await InventoryModel.findByIdAndUpdate(_id, data, {
      new: true,
    });

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
    const { _id } = req.params;

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
  getQuantityOfClient,
};
