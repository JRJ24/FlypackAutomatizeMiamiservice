import { validatJWT } from "../middlewares/token";
import { authorize, ROLE_GROUPS } from "../middlewares/authorize";
import * as palletsController from "./../controllers/Pallets.controller";
import express = require("express");

const palletRouter = express.Router();

palletRouter.post("/", validatJWT, authorize(...ROLE_GROUPS.operations), palletsController.createPallets);

palletRouter.get("/", validatJWT, authorize(...ROLE_GROUPS.operations), palletsController.getPallets);

palletRouter.get(
  "/getTotal",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  palletsController.getPalletsDataProcess,
);

palletRouter.get(
  "/motherGuide/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  palletsController.getPalletsByMotherGuide,
);

palletRouter.get(
  "/client/:clientName/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  palletsController.getPalletsByClient,
);

palletRouter.get(
  "/invoicesBilling",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  palletsController.getPalletsBillings,
);

palletRouter.patch(
  "/billing",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  palletsController.updatePalletsInvoices,
);

palletRouter.patch(
  "/motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  palletsController.updateGuide,
);

palletRouter.patch(
  "/arrival",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  palletsController.updatePalletArrivalStatus,
);

palletRouter.patch(
  "/arrival-items",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  palletsController.updatePalletPartialArrival,
);

palletRouter.put("/", validatJWT, authorize(...ROLE_GROUPS.operations), palletsController.deletePallets);

palletRouter.patch(
  "/itemDeleted",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  palletsController.deleteItemsPallets,
);

palletRouter.patch(
  "/items",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  palletsController.updatePalletItems,
);

export default palletRouter;
