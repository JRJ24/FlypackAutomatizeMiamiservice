import { validatJWT } from "../middlewares/token";
import { authorize, ROLE_GROUPS } from "../middlewares/authorize";
import * as InvoicesController from "./../controllers/Invoices.controller";
import express = require("express");

const invoicesRoutes = express.Router();

invoicesRoutes.post("/", validatJWT, authorize(...ROLE_GROUPS.admin), InvoicesController.createInvoices);

invoicesRoutes.post(
  "/pallets/partial",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  InvoicesController.createPartialPalletInvoice,
);

invoicesRoutes.get("/", validatJWT, authorize(...ROLE_GROUPS.admin), InvoicesController.getInvoices);

invoicesRoutes.get(
  "/get/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  InvoicesController.getInvoicesByMotherGuide,
);

invoicesRoutes.get(
  "/get4/:search",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  InvoicesController.searchInvoices,
);

invoicesRoutes.get(
  "/get2/:motherGuide/:client",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  InvoicesController.getInvoicesByMotherGuideAndClient,
);

invoicesRoutes.get(
  "/get3/:motherGuide/:clientName",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  InvoicesController.getInvoicesForClient,
);

export default invoicesRoutes;
