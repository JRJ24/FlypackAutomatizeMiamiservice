import { Request, Response } from "express";


const createProcess = async(req: Request, res: Response) => {
  try{

  }catch(error){
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null
    })
  }
}

const getProcess = async(req: Request, res: Response) => {
  try{

  }catch(error){
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null
    })
  }
}

const updateProcess = async(req: Request, res: Response) => {
  try{

  }catch(error){
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null
    })
  }
}

const deleteProcess = async(req: Request, res: Response) => {
  try{

  }catch(error){
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      message: "ERROR INTERNAL SERVER",
      data: null
    })
  }
}

export { createProcess, getProcess, updateProcess, deleteProcess }