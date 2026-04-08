import { Request, Response } from "express";
import ProcessModel from "../models/Process.model";

const createProcess = async (req: Request, res: Response) => {
  try {
    const { ...data } = req.body;

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: "NO FOUND",
        mensaje: "No encontrados",
        data: null,
      });
    }

    const create = await ProcessModel.create(data);

    if (!create) {
      return res.status(404).json({
        ok: false,
        message: "NO FOUND",
        mensaje: "No encontrados",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "PROCESS",
      mensaje: "PROCESS",
      data: create,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null,
    });
  }
};

const getProcess = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;
    const query = {
      isDelete: false,
      isActive: true,
    };
    const [process, totalItems] = await Promise.all([
      ProcessModel.find(query).skip(skip).limit(limit),
      ProcessModel.countDocuments(),
    ]);

    if (process.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "NO FOUND",
        mensaje: "No encontrados",
        data: null,
      });
    }

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      ok: true,
      message: "process found",
      mensaje: "Procesos encontrados",
      data: process,
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
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null,
    });
  }
};

const getProcessNoLimit = async (req: Request, res: Response) => {
  try {
    const query = {
      isDelete: false,
      isActive: true,
    };
    const [process, totalItems] = await Promise.all([
      ProcessModel.find(query),
      ProcessModel.countDocuments(),
    ]);

    if (!process) {
      return res.status(404).json({
        ok: false,
        message: "NO FOUND",
        mensaje: "No encontrados",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "process found",
      mensaje: "Procesos encontrados",
      data: process,
      pagination: {
        totalItems: totalItems,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null,
    });
  }
};

const updateProcess = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null,
    });
  }
};

const deleteProcess = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;

    if (!_id) {
      return res.status(400).json({
        ok: false,
        message: "NO VALID",
        mensaje: "NO VALIDO",
        data: null,
      });
    }

    const deleted = await ProcessModel.findByIdAndUpdate(
      _id,
      { isDelete: true, isActive: false },
      { new: true },
    );

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        message: "NO DELETED",
        mensaje: "NO ELIMINADO",
        data: null,
      });
    }

    return res.status(400).json({
      ok: true,
      message: "Deleted",
      mensaje: "Eliminado",
      data: "Deleted",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null,
    });
  }
};

export {
  createProcess,
  getProcess,
  getProcessNoLimit,
  updateProcess,
  deleteProcess,
};
