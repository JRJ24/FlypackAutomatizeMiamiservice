import AccountsAvailableModel from "./../models/Finanzes/AccountsAvailable.model";
import AccountsCXCModel from "./../models/Finanzes/AccountsCXC.model";
import AccountsReceivableModel from "./../models/Finanzes/AccountsReceivable.model";
import { Request, Response } from "express";
import mongoose from "mongoose";

const managementAccounts = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
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

    const updateCXC = await AccountsReceivableModel.findOneAndUpdate(
      { invoiceNumber: data.invoiceNumber, amount: { $gte: data.amount } },
      { $inc: { amount: -data.amount } },
      { new: true, session },
    );

    if (!updateCXC) {
      throw new Error("Insufficient balance or invoice not found");
    }

    await AccountsAvailableModel.findOneAndUpdate(
      { bankAccountName: data.bankAccountName },
      { $inc: { amount: data.amount } },
      { session },
    );

    await AccountsCXCModel.findOneAndUpdate(
      { clientName: data.clientName },
      { $inc: { totalAmount: -data.amount } },
      { upsert: true, session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      ok: true,
      message: "Updated finances",
      mensaje: "Finanzas actualizadas",
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  } finally {
    session.endSession();
  }
};
const createAccounts = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide, amount, ...rest } = req.body;

    if (!clientName || amount === undefined) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre de cliente y monto son obligatorios",
        message: "Customer name and amount are required",
      });
    }

    const newReceivable = await AccountsReceivableModel.create({
      clientName,
      motherGuide,
      amount,
      ...rest,
    });

    const updatedTotal = await AccountsCXCModel.findOneAndUpdate(
      { clientName: clientName },
      {
        $inc: { totalAmount: amount },
        $set: { lastUpdate: new Date() },
      },
      { upsert: true, new: true },
    );

    if (!updatedTotal) {
      throw new Error("The cumulative total could not be updated");
    }

    return res.status(201).json({
      ok: true,
      message: "Account created and total successfully updated",
      mensaje: "Cuenta creada y total actualizado correctamente",
      data: newReceivable,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
    });
  }
};
const deleteAccounts = async (req: Request, res: Response) => {
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

export { managementAccounts, createAccounts, deleteAccounts };
