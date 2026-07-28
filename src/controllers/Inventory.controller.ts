import { Request, Response } from "express";
import InventoryModel from "../models/Inventory.model";
import InventoryMovementModel from "../models/InventoryMovement.model";
import { normalizeMiamiInvoiceNumber } from "../helpers/miamiInvoiceNumber";
import { normalizeClientName, withDecryptedClientFields } from "../helpers/clientName";

const serializeInventory = (inventory: any) => withDecryptedClientFields(inventory);

const createInventory = async (req: Request, res: Response) => {
  try {
    // 1. Extraemos quantity del resto de los datos
    const { quantity, miamiInvoiceNumber, ...otherData } = req.body;
    const quantityNumber = Number(quantity);
    const normalizedMiamiInvoiceNumber = normalizeMiamiInvoiceNumber(miamiInvoiceNumber);
    const normalizedClient = normalizeClientName(otherData.client);

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid quantity",
        mensaje: "Cantidad invalida",
        data: null,
      });
    }

    if (!normalizedClient) {
      return res.status(400).json({
        ok: false,
        message: "Invalid client",
        mensaje: "Cliente invalido",
        data: null,
      });
    }

    const modelUpper = otherData.model.toUpperCase();
    const inventoryIdentity = {
      brandTV: otherData.brandTV,
      inchs: otherData.inchs,
      model: modelUpper,
      isDisabled: false,
    };
    const matchingInventories = await InventoryModel.find(inventoryIdentity);
    const previousInventory = matchingInventories.find(
      (inventory) => normalizeClientName(inventory.client) === normalizedClient,
    );
    const previousQuantity = Number(previousInventory?.quantity || 0);

    const inventoryPayload = {
      ...otherData,
      client: normalizedClient,
      model: modelUpper,
      ...(normalizedMiamiInvoiceNumber
        ? { lastMiamiInvoiceNumber: normalizedMiamiInvoiceNumber }
        : {}),
    };

    const inventory = previousInventory
      ? await InventoryModel.findByIdAndUpdate(
          previousInventory._id,
          {
            $inc: { quantity: quantityNumber },
            $set: inventoryPayload,
          },
          { new: true },
        )
      : await InventoryModel.create({
          ...inventoryPayload,
          quantity: quantityNumber,
        });

    if (!inventory) {
      return res.status(400).json({
        ok: false,
        message: "Inventory not saved",
        mensaje: "Inventario no guardado",
        data: null,
      });
    }

    await InventoryMovementModel.create({
      inventoryId: inventory._id,
      type: "ENTRY",
      quantity: quantityNumber,
      previousQuantity,
      resultingQuantity: Number(inventory.quantity),
      miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
      referenceType: normalizedMiamiInvoiceNumber ? "MIAMI_INVOICE" : "MANUAL_ENTRY",
      referenceId: normalizedMiamiInvoiceNumber,
      createdBy: (req as any).user?._id,
    });

    return res.status(201).json({
      ok: true,
      message: "Inventario procesado",
      data: serializeInventory(inventory),
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

    const normalizedClient = normalizeClientName(client);
    const allInventory = await InventoryModel.find({ isDisabled: false });
    const inventory = allInventory
      .filter((item) => normalizeClientName(item.client) === normalizedClient)
      .map(serializeInventory);
    const totalItems = inventory.length;
    const paginatedInventory = inventory.slice(skip, skip + limit);

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
      data: paginatedInventory,
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
    const inventory = await InventoryModel.find({ isDisabled: false }).select("client");

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
      data: inventory.map(serializeInventory),
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
    const normalizedClient = normalizeClientName(clientName);

    if (!clientName || !brandTV || !inches) {
      return res.status(400).json({ ok: false, mensaje: "Faltan datos" });
    }

    // CAMBIO: Usar .find() para traer todos los modelos que coincidan
    const items = await InventoryModel.find({
      brandTV: brandTV,
      inchs: inches,
      isDisabled: false,
      quantity: { $gt: 0 } // Opcional: solo traer los que tienen stock
    }).select({ brandTV: 1, quantity: 1, model: 1, client: 1 });

    const clientItems = items
      .filter((item) => normalizeClientName(item.client) === normalizedClient)
      .map(serializeInventory);

    if (!clientItems || clientItems.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "No hay stock disponible", data: [] });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Modelos encontrados",
      data: clientItems, // Ahora enviamos un Array
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: "Error de servidor" });
  }
};
const UpdateQtyInventory = async (req: Request, res: Response) => {
  try {
    const { _id, miamiInvoiceNumber, ...data } = req.body;
    const normalizedMiamiInvoiceNumber = normalizeMiamiInvoiceNumber(miamiInvoiceNumber);

    if (!_id || !data) {
      return res.status(400).json({
        ok: false,
        message: "Error",
        mensaje: "Error",
        data: null,
      });
    }

    if (data.quantity !== undefined) {
      const quantityNumber = Number(data.quantity);

      if (!Number.isFinite(quantityNumber) || quantityNumber < 0) {
        return res.status(400).json({
          ok: false,
          message: "Invalid quantity",
          mensaje: "Cantidad invalida",
          data: null,
        });
      }

      data.quantity = quantityNumber;
    }

    const previousInventory = await InventoryModel.findById(_id);

    if (!previousInventory) {
      return res.status(400).json({
        ok: false,
        message: "NO update",
        mensaje: "No actualizado",
        data: null,
      });
    }

    if (normalizedMiamiInvoiceNumber) {
      data.lastMiamiInvoiceNumber = normalizedMiamiInvoiceNumber;
    }

    if (data.client) {
      data.client = normalizeClientName(data.client);
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

    if (data.quantity !== undefined) {
      await InventoryMovementModel.create({
        inventoryId: inventory._id,
        type: "ADJUSTMENT",
        quantity: Number(inventory.quantity) - Number(previousInventory.quantity),
        previousQuantity: Number(previousInventory.quantity),
        resultingQuantity: Number(inventory.quantity),
        miamiInvoiceNumber: normalizedMiamiInvoiceNumber,
        referenceType: "MANUAL_ADJUSTMENT",
        referenceId: normalizedMiamiInvoiceNumber,
        createdBy: (req as any).user?._id,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "The inventory",
      mensaje: "El inventario",
      data: serializeInventory(inventory),
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
      data: serializeInventory(inventory),
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

const getInventoryMovements = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;

    const movements = await InventoryMovementModel.find({ inventoryId: _id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      ok: true,
      message: "Inventory movements",
      mensaje: "Movimientos de inventario",
      data: movements,
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
  getInventoryMovements,
};
