import { Request, Response } from "express";
import UsersModel from "../models/Users.model";
import { hashPassword } from "../helpers/hashpassword";
import { Types } from "mongoose";
const crypto = require("crypto");

const GetUsers = async (req: Request, res: Response) => {
  try {
    const users = await UsersModel.find({ isDelete: false });

    if (!users || users.length < 1) {
      return res.status(404).json({
        ok: false,
        message: "No users",
        mensaje: "No usuarios",
        data: [],
      });
    }
    return res.status(200).json({
      ok: true,
      message: "hola",
      mensaje: "hello",
      data: users,
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

const createUser = async (req: Request, res: Response) => {
  try {
    const { ...data } = req.body;
    console.log(data, "hola");
    if (data.password) {
      data.password = await hashPassword(data.password);
      data.mustchangePassword = false;
    } else {
      const passwordGenerated = crypto.randomBytes(6).toString("hex");
      data.password = await hashPassword(passwordGenerated);
      data.mustchangePassword = true;
    }

    const newUser = await UsersModel.create(data);

    if (!newUser) {
      return res.status(404).json({
        ok: false,
        message: "No User create",
        mensaje: "No user creada",
      });
    }

    return res.status(201).json({
      ok: true,
      message: "User created",
      mensaje: "User creado",
      data: newUser,
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

const updatePutUser = async (req: Request, res: Response) => {
  try {
    const { _id, ...data } = req.body;

    if (!Types.ObjectId.isValid(_id) || !data) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const update = await UsersModel.findByIdAndUpdate(_id, data, { new: true });

    if (!update) {
      return res.status(404).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Update",
      mensaje: "Actualizado",
      data: update,
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

const updatePassword = async (req: Request, res: Response) => {
  try {
    const { ...data } = req.body;
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const updateEmail = async (req: Request, res: Response) => {
  try {
    const { ...data } = req.body;
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const disableUser = async (req: Request, res: Response) => {
  try {
    const { _id } = req.body;

    console.log(_id);

    if (!_id) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const disabled = await UsersModel.findByIdAndUpdate(
      _id,
      [{ $set: { isActive: { $not: "$isActive" } } }],
      { new: true, updatePipeline: true },
    );

    if (!disabled) {
      return res.status(404).json({
        ok: false,
        message: "No update",
        mensaje: "No actualizado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Disabled",
      mensaje: "Deshabilitado",
      data: disabled,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const deletedUser = async (req: Request, res: Response) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const deleted = await UsersModel.findByIdAndUpdate(
      _id,
      { isDelete: true },
      { new: true },
    );

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        message: "No update",
        mensaje: "No actualizado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Deleted",
      mensaje: "Eliminado",
      data: deleted,
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
  GetUsers,
  updatePutUser,
  createUser,
  updatePassword,
  updateEmail,
  disableUser,
  deletedUser,
};
