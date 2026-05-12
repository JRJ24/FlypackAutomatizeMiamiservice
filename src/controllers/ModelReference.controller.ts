import modelReferenceModel from "./../models/modelReference.model";
import { Request, Response } from "express";

const createNewModelReference = async (req: Request, res: Response) => {
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

    const newModelReference = await modelReferenceModel.create(data);

    if (!newModelReference) {
      return res.status(404).json({
        ok: false,
        message: "No data created",
        mensaje: "No data creada",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "W",
      mensaje: "W",
      data: newModelReference,
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

const getModelName = async (req: Request, res: Response) => {
  try {
    const modelName = await modelReferenceModel
      .find({ isActive: true })
      .select({ modelName: 1 });

    if (!modelName || modelName.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No data founded",
        mensaje: "No data encontrada",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "W",
      mensaje: "W",
      data: modelName,
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

export { createNewModelReference, getModelName };
