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
    const inventory = await InventoryModel.find({ isDisabled: false });

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
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const UpdateQtyInventory = async (req: Request, res: Response) => {
  try {
    const { _id, newQuantity } = req.body;

    if (!_id || !newQuantity) {
      return res.status(400).json({
        ok: false,
        message: "Error",
        mensaje: "Error",
        data: null,
      });
    }

    const inventory = await InventoryModel.findByIdAndUpdate(
      _id,
      { quantity: newQuantity },
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

    const inventory = await InventoryModel.findByIdAndUpdate(_id, { isDisabled: true });

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
  deleteInventory
}
