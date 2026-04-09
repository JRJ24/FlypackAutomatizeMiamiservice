import { Request, Response } from "express";
import PalletsModel from "../models/Pallets.model";

const getPallets = async(req: Request, res: Response) => {
  try {
    
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null
    })
  }
}

const createPallets = async(req: Request, res: Response) => {
  try {
    
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null
    })
  }
}

const updatePallets = async(req: Request, res: Response) => {
  try {
    
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null
    })
  }
}

const deletePallets = async(req: Request, res: Response) => {
  try {
    
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null
    })
  }
}

export {
  getPallets,
  createPallets,
  updatePallets,
  deletePallets
}