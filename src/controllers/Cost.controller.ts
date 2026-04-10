import { Request, Response } from "express";
import CostModel from "../models/Cost.model";

const newUpdateCost = async (req: Request, res: Response) => {
  try {
    const { ...data } = req.body;

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: "NO DATA",
        mensaje: "NO DATA",
        data: null,
      });
    }

    let query = { isInvalidate: false };

    const update = await CostModel.findOneAndUpdate(
      query,
      { isInvalidate: true },
      { new: true },
    );

    if (!update) {
      return res.status(400).json({
        ok: false,
        message: "NO UPDATE",
        mensaje: "NO ACTUALIZAMOS",
        data: null,
      });
    }

    const newCost = await CostModel.create(data);

    if (!newCost) {
      return res.status(400).json({
        ok: false,
        message: "NO CREATE",
        mensaje: "NO CREAMOS",
        data: null,
      });
    }

    return res.status(201).json({
      ok: false,
      message: "New Cost added",
      mensaje: "Nuevo costo agregado",
      data: newCost,
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

const getCost = async (req: Request, res: Response) => {
  try {
    let query = { isInvalidate: false };

    const get = await CostModel.findOne(query);

    if (!get) {
      return res.status(404).json({
        ok: false,
        message: "NO FOUND",
        mensaje: "NO ENCONTRAMOS",
        data: null,
      });
    }

    return res.status(201).json({
      ok: false,
      message: "Found",
      mensaje: "Costos encontrados",
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

const updatePatchCost = async (req: Request, res: Response) => {
  try {
    const { freight, customsDuty, ADM, dollar, costLB } = req.body;

    if (!freight && !customsDuty && !ADM && !dollar && !costLB) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    let query = { isInvalidate: false };

    if (freight) {
      const fr = await CostModel.findOneAndUpdate(
        query,
        { freight: freight },
        { new: true },
      );

      if (!fr) {
        return res.status(400).json({
          ok: false,
          message: "No update",
          mensaje: "No actualizado",
          data: null,
        });
      }
    }

    if (customsDuty) {
      const custom = await CostModel.findOneAndUpdate(
        query,
        { customsDuty: customsDuty },
        { new: true },
      );

      if (!custom) {
        return res.status(400).json({
          ok: false,
          message: "No update",
          mensaje: "No actualizado",
          data: null,
        });
      }
    }

    if (ADM) {
      const adm = await CostModel.findOneAndUpdate(
        query,
        { ADM: ADM },
        { new: true },
      );

      if (!adm) {
        return res.status(400).json({
          ok: false,
          message: "No update",
          mensaje: "No actualizado",
          data: null,
        });
      }
    }

    if (dollar) {
      const Dol = await CostModel.findOneAndUpdate(
        query,
        { dollar: dollar },
        { new: true },
      );

      if (!Dol) {
        return res.status(400).json({
          ok: false,
          message: "No update",
          mensaje: "No actualizado",
          data: null,
        });
      }
    }

    if (costLB) {
      const LBcost = await CostModel.findOneAndUpdate(
        query,
        { costLB: costLB },
        { new: true },
      );

      if (!LBcost) {
        return res.status(400).json({
          ok: false,
          message: "No update",
          mensaje: "No actualizado",
          data: null,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      message: "update sucess",
      mensaje: "actualizado con exito",
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

const deleteCost = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

export { updatePatchCost, newUpdateCost, deleteCost, getCost };
