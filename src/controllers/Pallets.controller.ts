import { Request, Response } from "express";
import PalletsModel from "../models/Pallets.model";
import MaintenanceCostModel from "../models/MaintenanceCost.model";
import { CalcCost } from "../helpers/calcCost";
import { IPalletNew, IPalletsMain } from "../interfaces/IPalletsmodel";

// No modified
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

// Importants
const getPalletsByMotherGuide = async (req: Request, res: Response) => {
  try {
    const { motherGuide } = req.params;

    if (!motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No mother guide",
        mensaje: "No guia madre",
        data: null,
      });
    }

    const pallets = await PalletsModel.aggregate([
      {
        $match: {
          motherGuide: motherGuide,
          isDelete: false,
          isActive: true,
        },
      },
      {
        $group: {
          _id: { $trim: { input: "$clientName" } },
          clientName: { $first: "$clientName" },
          date: { $first: "$date" },
          motherGuide: { $first: "$motherGuide" },
          status: { $first: "$status" },
          totalPalletsCount: { $sum: { $size: "$pallet.pallets" } },
          totalWeightLB: { $sum: "$pallet.calcPallet.weightLB" },
        },
      },
      { $sort: { clientName: 1 } },
    ]);

    if (!pallets) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Pallets by Mother Guide",
      mensaje: "Pallets con la guia madre",
      data: pallets,
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

const getPalletsByClient = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide } = req.params;
    console.log(clientName, " - ", motherGuide);
    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No mother guide and not id",
        mensaje: "No guia madre y no id",
        data: null,
      });
    }

    const client = String(clientName);

    let query = {
      clientName: { $regex: new RegExp(`^${client.trim()}$`, "i") },
      motherGuide: motherGuide,
    };

    const pallets = await PalletsModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            clientName: "$clientName",
            motherGuide: "$motherGuide",
          },
          allPallets: {
            $push: {
              description: "$pallet.palletDescription",
              items: "$pallet.pallets",
              status: "$status",
            },
          },

          totalPalletsCount: { $sum: 1 },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
    ]);

    if (!pallets || pallets.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Pallets by _id",
      mensaje: "Pallets con la _id",
      data: pallets,
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

    const count = await PalletsModel.countDocuments({
      motherGuide: data.motherGuide,
    });
    const { pallets, calcPallet } = data.pallet;

    const weightLB = calcPallet.weightLB;

    console.log(weightLB);
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

    const palletCalc = await CalcCost(weightLB, maintenance, totalPrice);
    const palletDescription = `PACKING LIST PLT#${count + 1} (${weightLB} LBS)`;
    const newPallet = {
      clientName: data.clientName,
      date: data.date,
      motherGuide: data.motherGuide,
      pallet: {
        palletDescription: palletDescription,
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

// No modified
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

export {
  getPallets,
  createPallets,
  updatePallets,
  deletePallets,
  getPalletsByMotherGuide,
  getPalletsByClient,
};
