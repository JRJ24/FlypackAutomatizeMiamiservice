import { Request, Response } from "express";
import MaintenanceCostModel from "../models/MaintenanceCost.model";

const getMaintenance = async (req: Request, res: Response) => {
  try {
    const maintenance = await MaintenanceCostModel.find();

    if (!maintenance) {
      return res.status(404).json({
        ok: false,
        message: "No found",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Y",
      mensaje: "Y",
      data: maintenance,
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

const UpdateMaintenances = async (req: Request, res: Response) => {
  try {
    const { _id, ...data } = req.body;

    const maintenance = await MaintenanceCostModel.findByIdAndUpdate(_id, data, {
      returnDocument: "after",
    });

    if (!maintenance) {
      return res.status(404).json({
        ok: false,
        message: "No update",
        mensaje: "No actualizado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Y",
      mensaje: "Y",
      data: maintenance,
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
  getMaintenance,
  UpdateMaintenances,
};
