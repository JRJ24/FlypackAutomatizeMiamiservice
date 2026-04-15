import { Request, Response } from "express";
import PalletsModel from "../models/Pallets.model";
import MaintenanceCostModel from "../models/MaintenanceCost.model";
import { CalcCost } from "../helpers/calcCost";
import { IPalletNew, IPalletsMain } from "../interfaces/IPalletsmodel";

const getPallets = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const createPallets = async (req: Request, res: Response) => {
  try {
    const data: IPalletNew = req.body;

    if (!data || !data.pallet) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const { pallets, calcPallet } = data.pallet;

    const weightLB = calcPallet.weightLB;

    const totalPrice = pallets.reduce((acc, item) => {
      return acc + (item.totalUnitPrice || 0);
    }, 0);

    const maintenance = await MaintenanceCostModel.findOne();

    if (!maintenance) {
      return res.status(404).json({
        ok: false,
        message: "Maintenance cost not found",
        mensaje: "Costo de mantenimiento no encontrado",
        data: null,
      });
    }

    const palletCalc = CalcCost(totalPrice, maintenance, weightLB);

    const newPallet = {
      clientName: data.clientName,
      date: data.date,
      motherGuide: data.motherGuide,
      pallet: {
        palletDescription: data.pallet.palletDescription,
        pallets: data.pallet.pallets,
        calcPallet: {
          ...palletCalc,
        },
      },
    };

    const saved = await PalletsModel.create(newPallet);

    if (!saved) {
      return res.status(400).json({
        ok: false,
        message: "No saved",
        mensaje: "No guardado",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Saved",
      mensaje: "Guardado",
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const updatePallets = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const deletePallets = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

export { getPallets, createPallets, updatePallets, deletePallets };
