import { validatJWT } from "../middlewares/token";
import { authorize, ROLE_GROUPS } from "../middlewares/authorize";
import * as InvoicesController from "./../controllers/Invoices.controller";
import express = require("express");

const invoicesRoutes = express.Router();

invoicesRoutes.post("/", validatJWT, authorize(...ROLE_GROUPS.admin), InvoicesController.createInvoices);

invoicesRoutes.post(
  "/pallets/partial",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  InvoicesController.createPartialPalletInvoice,
);

invoicesRoutes.get("/", validatJWT, authorize(...ROLE_GROUPS.adminJdg), InvoicesController.getInvoices);

invoicesRoutes.patch(
  "/:invoiceNumber",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  InvoicesController.updateInvoice,
);

invoicesRoutes.get(
  "/get/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  InvoicesController.getInvoicesByMotherGuide,
);

invoicesRoutes.get(
  "/get4/:search",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  InvoicesController.searchInvoices,
);

invoicesRoutes.get(
  "/get2/:motherGuide/:client",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  InvoicesController.getInvoicesByMotherGuideAndClient,
);

invoicesRoutes.get(
  "/get3/:motherGuide/:clientName",
  validatJWT,
  authorize(...ROLE_GROUPS.adminJdg),
  InvoicesController.getInvoicesForClient,
);

export default invoicesRoutes;
