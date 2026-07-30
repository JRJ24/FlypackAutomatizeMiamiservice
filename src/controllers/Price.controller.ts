import { Request, Response } from "express";
import PriceModel from "../models/PriceModel";
import { normalizeClientName } from "../helpers/clientName";

const newPrice = async (req: Request, res: Response) => {
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

    const price = await PriceModel.create(data);

    if (!price) {
      return res.status(404).json({
        ok: false,
        message: "New price no were Create",
        mensaje: "Nuevo precio no fue creado",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Sucess",
      mensaje: "Exito",
      data: price,
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

const getPrice = async (req: Request, res: Response) => {
  try {
    const get = await PriceModel.find();

    if (!get) {
      return res.status(404).json({
        ok: false,
        message: "New price no were Create",
        mensaje: "Nuevo precio no fue creado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Sucess",
      mensaje: "Exito",
      data: get,
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

const getPriceModel = async (req: Request, res: Response) => {
  try {
    const [models, inches] = await Promise.all([
      PriceModel.distinct("model"),
      PriceModel.distinct("inches"),
    ]);

    if (!models || !inches) {
      return res.status(404).json({
        ok: false,
        message: "New price no were Create",
        mensaje: "Nuevo precio no fue creado",
        data: null,
      });
    }

    const payload = {
      models: models,
      inches: inches,
    };

    return res.status(200).json({
      ok: true,
      message: "Sucess",
      mensaje: "Exito",
      data: payload,
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

const getPriceLookup = async (req: Request, res: Response) => {
  try {
    const model = String(req.query.model || "").trim();
    const inches = String(req.query.inches || "").trim();
    const clientName = normalizeClientName(req.query.clientName || req.query.client);

    if (!model || !inches) {
      return res.status(400).json({
        ok: false,
        message: "Model and inches are required",
        mensaje: "Modelo y pulgadas son requeridos",
        data: null,
      });
    }

    const price = await PriceModel.findOne({
      model,
      inches,
      isSpecial: clientName === "Daniel",
    });

    if (!price) {
      return res.status(404).json({
        ok: false,
        message: "Price not found",
        mensaje: "Precio no encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Price found",
      mensaje: "Precio encontrado",
      data: price,
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

const updatePrice = async (req: Request, res: Response) => {
  try {
    return res.status(501).json({
      ok: false,
      message: "Not implemented",
      mensaje: "No implementado",
      data: null,
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

const deletePrice = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;

    if (!_id) {
      return res.status(400).json({
        ok: false,
        message: "No credentials",
        mensaje: "No credenciales",
        data: null,
      });
    }

    const deleteOne = await PriceModel.deleteOne({ _id: _id });

    if (!deleteOne) {
      return res.status(404).json({
        ok: false,
        message: "No Deleted",
        mensaje: "No elimanado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Deleted",
      mensaje: "Elimanado",
      data: null,
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

export { newPrice, getPrice, updatePrice, deletePrice, getPriceModel, getPriceLookup };
