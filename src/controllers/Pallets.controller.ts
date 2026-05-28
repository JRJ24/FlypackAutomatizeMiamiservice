import { Request, Response } from "express";
import PalletsModel from "../models/Pallets.model";
import MaintenanceCostModel from "../models/MaintenanceCost.model";
import { CalcCost } from "../helpers/calcCost";
import {
  IPalletNew,
  IPalletsDetails,
  IPalletsMain,
} from "../interfaces/IPalletsmodel";
import PriceModel from "../models/PriceModel";
import InventoryModel from "../models/Inventory.model";

// No modified
const getPallets = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const result = await PalletsModel.aggregate([
      {
        $match: {
          isDelete: false,
          isActive: true,
        },
      },
      { $unwind: "$pallet" },
      {
        $group: {
          _id: {
            clientName: { $trim: { input: "$clientName" } },
            motherGuide: "$motherGuide",
          },

          clientName: { $first: "$clientName" },
          date: { $first: "$date" },
          motherGuide: { $first: "$motherGuide" },
          status: { $first: "$status" },

          totalPalletsCount: { $sum: 1 },
          totalWeightLB: { $sum: "$pallet.calcPallet.weightLB" },
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const pallets = result[0]?.data || [];
    const totalItems = result[0]?.total[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      ok: true,
      message: "Pallets found",
      mensaje: "Pallets encontrados",
      data: pallets,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

// Importants
const getPalletsByMotherGuide = async (req: Request, res: Response) => {
  try {
    const { motherGuide } = req.params;
    const pending = req.query.pending;

    const isPending = pending === "on" || pending === "true";

    if (!isPending && !motherGuide) {
      return res.status(400).json({
        ok: false,
        message: "No mother guide",
        mensaje: "No guia madre",
        data: null,
      });
    }

    const matchStage = isPending
      ? {
          isDelete: false,
          isActive: true,
          status: "Pending guidance",
          motherGuide: { $regex: /^No Guide - / },
        }
      : {
          motherGuide: motherGuide,
          isDelete: false,
          isActive: true,
        };

    const pallets = await PalletsModel.aggregate([
      {
        $match: matchStage,
      },
      // 1. Descomponemos el array de grupos (PLT#1, PLT#2...)
      { $unwind: "$pallet" },
      {
        $group: {
          _id: { $trim: { input: "$clientName" } },
          clientName: { $first: "$clientName" },
          date: { $first: "$date" },
          motherGuide: { $first: "$motherGuide" },
          status: { $first: "$status" },

          totalPalletsCount: { $sum: 1 },

          totalWeightLB: { $sum: "$pallet.calcPallet.weightLB" },
        },
      },
      { $sort: { clientName: 1 } },
    ]);

    if (!pallets) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Pallets by Mother Guide",
      mensaje: "Pallets con la guia madre",
      data: pallets,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const getPalletsByClient = async (req: Request, res: Response) => {
  try {
    const { clientName, motherGuide } = req.params;

    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre del cliente y guía madre son obligatorios",
        data: null,
      });
    }

    const palletDoc = await PalletsModel.findOne({
      clientName: clientName,
      motherGuide: motherGuide,
      isDelete: false,
    }).lean();

    if (!palletDoc) {
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontró el despacho para este cliente y guía",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Datos obtenidos con éxito",
      data: palletDoc,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const getPalletsDataProcess = async (req: Request, res: Response) => {
  try {
    const clientName = req.query.client;
    const motherGuide = req.query.motherGuide;

    if (!clientName || !motherGuide) {
      return res.status(400).json({
        ok: false,
        mensaje: "El nombre del cliente y la guía madre son obligatorios",
      });
    }

    const maintenance = await MaintenanceCostModel.findOne();
    const rate = maintenance?.rate;
    const results = await PalletsModel.aggregate([
      {
        $match: {
          clientName: clientName,
          motherGuide: motherGuide,
          isDelete: false,
        },
      },
      { $unwind: "$pallet" },
      {
        $lookup: {
          from: "maintenances",
          pipeline: [{ $match: { name: "rate" } }],
          as: "maintenances",
        },
      },
      {
        $group: {
          _id: "$_id",
          totalPallets: { $sum: 1 },
          totalTVs: { $sum: { $sum: "$pallet.pallets.quantityUnit" } },
          tempSumFreight: { $sum: "$pallet.calcPallet.costLbUS" }, // <-- Se llama tempSumFreight
          totalRate: { $sum: "$pallet.calcPallet.totalRate" },
          totalADM: { $sum: "$pallet.calcPallet.ADM" },
          totalService: { $sum: "$pallet.calcPallet.caribeTrans" },
          totalSale: { $sum: "$pallet.calcPallet.totalPrice" },
          totalUtility: { $sum: "$pallet.calcPallet.utility" },
        },
      },
      {
        $project: {
          _id: 0,
          totalPallets: 1,
          totalTVs: 1,
          // Usamos los nombres exactos del $group
          totalFreight: {
            $round: [{ $multiply: ["$tempSumFreight", rate] }, 2],
          },
          totalRate: { $round: ["$totalRate", 2] },
          totalADM: { $round: ["$totalADM", 2] },
          totalService: { $round: ["$totalService", 2] },
          totalSale: { $round: ["$totalSale", 2] },
          totalUtility: { $round: ["$totalUtility", 2] },
          debugTasa: "$rate",
          debugSuma: "$tempSumFreight",
        },
      },
      {
        // Agregamos los costos al final para que totalFreight ya exista y no sea null
        $addFields: {
          totalCosts: {
            $round: [
              {
                $add: [
                  "$totalFreight",
                  "$totalRate",
                  "$totalADM",
                  "$totalService",
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    if (results.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "success",
      mensaje: "Datos agrupados con éxito",
      data: results[0],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const createPallets = async (req: Request, res: Response) => {
  try {
    const data: IPalletNew = req.body;

    if (!data || !data.pallet) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No hay datos",
        data: null,
      });
    }

    const { pallets, calcPallet } = data.pallet;
    const weightLB = calcPallet.weightLB;

    const motherGuideValue = data.motherGuide?.trim();
    const isMotherGuideEmpty = !motherGuideValue;

    // 1. Buscar precios unitarios en la BD y calcular totales por ítem
    let globalTotalPrice = 0;
    const enrichedPallets: IPalletsDetails[] = [];

    const isSpecial: boolean = data.clientName === "Daniel" ? true : false;

    for (const item of pallets) {
      // Reemplaza "ProductsModel" con el modelo real donde guardas los precios
      const pricesInfo = await PriceModel.findOne({
        model: item.model,
        inches: item.inchs,
        isSpecial: isSpecial,
      });

      const inventoryInfo = await InventoryModel.findOne({
        brandTV: item.model,
        inchs: item.inchs,
        model: item.descriptionModel,
        client: data.clientName,
        isDisabled: false,
      });

      // Si no encuentra el producto, asignamos 0 o el valor por defecto que prefieras
      const unitPrice = pricesInfo ? pricesInfo.unitPrice : 0;
      const totalUnitPrice = unitPrice * item.quantityUnit;

      if (inventoryInfo?.quantity && inventoryInfo.quantity !== undefined) {
        const restInventoryStock = inventoryInfo?.quantity - item.quantityUnit;

        const UpdateQtyInventory = await InventoryModel.findByIdAndUpdate(
          inventoryInfo._id,
          { quantity: restInventoryStock },
          { new: true },
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

      globalTotalPrice += totalUnitPrice;

      enrichedPallets.push({
        model: item.model,
        inchs: item.inchs,
        descriptionModel: item.descriptionModel,
        quantityUnit: item.quantityUnit,
        unitPrice: unitPrice,
        totalUnitPrice: totalUnitPrice,
      });
    }

    // 2. Traer costo de mantenimiento
    const maintenance = await MaintenanceCostModel.findOne();

    if (!maintenance) {
      return res.status(404).json({
        ok: false,
        message: "Maintenance cost not found",
        mensaje: "Costo de mantenimiento no encontrado",
        data: null,
      });
    }

    const palletCalc = await CalcCost(weightLB, maintenance, globalTotalPrice);

    // const existingGuide = await PalletsModel.findOne({
    //   motherGuide: data.motherGuide,
    //   clientName: data.clientName,
    // });

    const queryToCount = isMotherGuideEmpty
      ? {
          clientName: data.clientName,
          status: "Pending guidance",
          isActive: true,
          isDelete: false,
        }
      : {
          motherGuide: motherGuideValue,
          clientName: data.clientName,
          isActive: true,
          isDelete: false,
        };
    const allGuidesSameMother = await PalletsModel.find(queryToCount);

    const currentPalletCount = allGuidesSameMother.reduce((total, guide) => {
      const guidePalletsCount =
        guide.pallet && Array.isArray(guide.pallet) ? guide.pallet.length : 0;
      return total + guidePalletsCount;
    }, 0);

    const palletDescription = `PACKING LIST PLT#${currentPalletCount + 1} (${weightLB} LBS)`;

    const newPalletSingle = {
      palletDescription: palletDescription,
      pallets: enrichedPallets,
      calcPallet: palletCalc,
    };

    const generatedMotherGuide = isMotherGuideEmpty
      ? `No Guide - ${currentPalletCount + 1}`
      : motherGuideValue;

    const query = {
      motherGuide: generatedMotherGuide,
      clientName: data.clientName,
    };
    const update = {
      $setOnInsert: {
        date: data.date,
        motherGuide: generatedMotherGuide,
        clientName: data.clientName,
        isActive: true,
        isDelete: false,
        status: isMotherGuideEmpty ? "Pending guidance" : "Not invoiced",
      },
      $push: {
        pallet: newPalletSingle,
      },
    };

    const saved = await PalletsModel.findOneAndUpdate(query, update, {
      upsert: true,
      new: true,
    });

    if (!saved) {
      return res.status(400).json({
        ok: false,
        message: "Not saved",
        mensaje: "No guardado",
        data: null,
      });
    }

    return res.status(201).json({
      ok: true,
      message: "Saved",
      mensaje: "Guardado correctamente",
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const getPalletsBillings = async (req: Request, res: Response) => {
  try {
    let query = { isDelete: false, status: "Invoiced" };

    const palletsInvoices = await PalletsModel.find(query).lean();

    if (!palletsInvoices || palletsInvoices.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "success",
      mensaje: "Datos obtenidos con éxito",
      data: palletsInvoices,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

// No modified
const updatePalletsInvoices = async (req: Request, res: Response) => {
  try {
    const { status, motherGuide, clientName } = req.body;

    if (!status || !motherGuide || !clientName) {
      return res.status(400).json({
        ok: false,
        message: "Missing data",
        mensaje: "Faltan datos",
        data: null,
      });
    }

    const updatedPallet = await PalletsModel.findOneAndUpdate(
      { motherGuide: motherGuide, clientName: clientName },
      { status: status },
      { new: true },
    );

    if (!updatedPallet) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Updated",
      mensaje: "Actualizado correctamente",
      data: updatedPallet,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const deletePallets = async (req: Request, res: Response) => {
  try {
    const { motherGuide, clientName } = req.body;
    console.log(motherGuide);
    console.log(clientName);

    if (!motherGuide || !clientName) {
      return res.status(400).json({
        ok: false,
        message: "Missing data",
        mensaje: "Faltan datos",
        data: null,
      });
    }

    const deletedPallet = await PalletsModel.findOneAndUpdate(
      { motherGuide: motherGuide, clientName: clientName },
      { isDelete: true, isActive: false },
      { new: true },
    );

    if (!deletedPallet) {
      return res.status(404).json({
        ok: false,
        message: "No found register",
        mensaje: "No se encontraron registros",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Deleted",
      mensaje: "Eliminado correctamente",
      data: deletedPallet,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const deleteItemsPallets = async (req: Request, res: Response) => {
  try {
    const { _id, indexPallet, indexItem } = req.body;

    if (!_id || indexItem === undefined || indexPallet === undefined) {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    const docPallet = await PalletsModel.findById(_id);

    if (!docPallet) {
      return res.status(404).json({
        ok: false,
        message: "Not found",
        mensaje: "No encontrado",
        data: null,
      });
    }

    const palletSingle = docPallet?.pallet[indexPallet];

    if (!palletSingle) {
      return res.status(404).json({
        ok: false,
        message: "Not found disk",
        mensaje: "No encontrado contenedor",
        data: null,
      });
    }

    if (palletSingle && palletSingle.pallets[indexItem]) {
      const itemDeleted = palletSingle.pallets[indexItem];

      if (!itemDeleted) {
        return res.status(404).json({
          ok: false,
          message: "Not found pallet",
          mensaje: "No encontrado pallet",
          data: null,
        });
      }

      const restoreInv = await InventoryModel.findOneAndUpdate(
        {
          brandTV: itemDeleted.model,
          model: itemDeleted.descriptionModel,
          inchs: itemDeleted.inchs,
        },
        { $inc: { quantity: itemDeleted.quantityUnit } },
        { new: true },
      );

      if (!restoreInv) {
        return res.status(400).json({
          ok: false,
          message: "No restore inventory",
          mensaje: "No inventario restaurado",
          data: null,
        });
      }
      palletSingle.pallets.splice(indexItem, 1);

      if (palletSingle.pallets.length === 0) {
        docPallet.pallet.splice(indexPallet, 1);
      }
      await docPallet.save();

      return res.status(200).json({
        ok: true,
        message: "success",
        mensaje: "Success",
        data: null,
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};

const updateGuide = async (req: Request, res: Response) => {
  try {
    const { _id, motherGuide } = req.body;
    
    console.log(motherGuide)
    console.log(_id)

    if (!motherGuide && !_id) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    const update = await PalletsModel.findByIdAndUpdate(
      _id,
      { motherGuide: motherGuide, status: "Not invoiced" },
      { new: true },
    );

    if (!update) {
      return res.status(404).json({
        ok: false,
        message: "No founded",
        mensaje: "No encontrado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Update",
      mensaje: "Update",
      data: update,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error internal server",
      mensaje: "Error interno del servidor",
      data: null,
    });
  }
};
export {
  getPallets,
  createPallets,
  updatePalletsInvoices,
  deletePallets,
  getPalletsByMotherGuide,
  getPalletsByClient,
  getPalletsDataProcess,
  getPalletsBillings,
  deleteItemsPallets,
  updateGuide
};
