import { Request, Response } from "express";
import SuitCases from "@/models/Suitcases.model";
import { ISuitCases, ISuitClientSend } from "@/interfaces/ISuitcasesmodel";
import PriceModel from "@/models/PriceModel";
import InventoryModel from "@/models/Inventory.model";

const createSuitCases = async (req: Request, res: Response) => {
  try {
    const data: ISuitClientSend = req.body;

    if (!data || data.suitCases.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "ERROR BAD REQUEST",
        mensaje: "SOLICITUD INCORRECTA",
        data: null,
      });
    }
    const suitCasesEnriched: ISuitCases[] = [];
    const isSpecial: boolean = data.clientName === "Daniel" ? true : false;

    for (const suits of data.suitCases) {
      const priceInfo = await PriceModel.findOne({
        model: suits.modelBrand,
        inches: suits.inches,
        isSpecial: isSpecial,
      });

      const inventoryInfo = await InventoryModel.findOne({
        brandTV: suits.modelBrand,
        inchs: suits.inches,
        client: data.clientName,
      });

      if(!inventoryInfo){
        return res.status(404).json({
          ok: false,
          message: "NO INVENTORY FOR THIS CLIENT",
          mensaje: "No hay inventario para este cliente",
          data: null
        })
      }

      const unitPrice = priceInfo ? priceInfo.unitPrice : 0;

      if (inventoryInfo?.quantity) {
        const restInventoryStock = inventoryInfo?.quantity - suits.quantity;

        const UpdateQtyInventory = await InventoryModel.findByIdAndUpdate(
          inventoryInfo._id,
          { quantity: restInventoryStock },
          { returnDocument: "after" },
        );

        if (!UpdateQtyInventory) {
          return res.status(400).json({
            ok: false,
            message: "The inventory has not decreased",
            mensaje: "No ha disminuido el inventario",
            data: null,
          });
        }
      }

      // suitCasesEnriched.push({
      //   modelBrand: suits.modelBrand,
      //   weightLb: suits.weightLb,
      //   inches: Number(suits.inches),
      //   quantity: suits.quantity,
      //   freight: suits.weightLb * 36.7525,
      //   rate: suits.weightLb * 6.83,
      //   costVersat: 
      // })
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL SERVER",
      mensaje: "ERROR INTERNO DEL SERVIDOR",
      data: null,
    });
  }
};

const getSuitCases = async (req: Request, res: Response) => {
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

const updateSuitCases = async (req: Request, res: Response) => {
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

const deletedSuitCases = async (req: Request, res: Response) => {
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
