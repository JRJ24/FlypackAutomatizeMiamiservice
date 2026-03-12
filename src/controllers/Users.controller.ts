import { Request, Response } from "express";

const GetUsers = async (req: Request, res: Response) => {
  try {
    console.log("Hola si estoy funcionando");

    return res.status(200).json({
      ok: true,
      message: "hola",
      mensaje: "hello",
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

const createUser = async (req: Request, res: Response) => {
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

const updatePutUser = async (req: Request, res: Response) => {
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

const deleteUser = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

export { GetUsers, updatePutUser, createUser, updatePassword, updateEmail, deleteUser };
