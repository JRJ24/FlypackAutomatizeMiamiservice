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

const UpdateKgValMaintenance = async (req: Request, res: Response) => {
  try {
    const { _id, kgVal } = req.body;

    const maintenance = await MaintenanceCostModel.findById(
      _id,
      {
        kgVal: kgVal,
      },
      { returnDocument: "after" },
    );

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

const UpdateADMMaintenance = async (req: Request, res: Response) => {
  try {
    const { _id, ADM } = req.body;

    const maintenance = await MaintenanceCostModel.findById(
      _id,
      {
        ADM: ADM,
      },
      { returnDocument: "after" },
    );

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

const UpdateDollarCostMaintenance = async (req: Request, res: Response) => {
  try {
    const { _id, dollarCost } = req.body;

    const maintenance = await MaintenanceCostModel.findById(
      _id,
      {
        dollarCost: dollarCost,
      },
      { returnDocument: "after" },
    );

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

const UpdateCustomDutyValMaintenance = async (req: Request, res: Response) => {
  try {
    const { _id, customDutyVal } = req.body;

    const maintenance = await MaintenanceCostModel.findById(
      _id,
      {
        customDutyVal: customDutyVal,
      },
      { returnDocument: "after" },
    );

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

const UpdateRateMaintenance = async (req: Request, res: Response) => {
  try {
    const { _id, rate } = req.body;

    const maintenance = await MaintenanceCostModel.findById(
      _id,
      {
        rate: rate,
      },
      { returnDocument: "after" },
    );

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
  UpdateKgValMaintenance,
  UpdateADMMaintenance,
  UpdateRateMaintenance,
  UpdateCustomDutyValMaintenance,
  UpdateDollarCostMaintenance,
};
