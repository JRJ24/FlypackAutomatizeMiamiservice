import { validatJWT } from "./../middlewares/token";
import * as suitCasesController from "./../controllers/Suitcases.controller";
const express = require("express");

const suitCaseRouter = express.Router();

suitCaseRouter.post("/", validatJWT, suitCasesController.createSuitCases);

suitCaseRouter.get("/get", validatJWT, suitCasesController.getSuitCases);

suitCaseRouter.get(
  "/get2/:motherGuide",
  validatJWT,
  suitCasesController.getSuitCasesByMotherGuide,
);
suitCaseRouter.get(
  "/get3/:clientName/:motherGuide",
  validatJWT,
  suitCasesController.getClientNameAndMotherGuide,
);
suitCaseRouter.get(
  "/get4/:clientName/:motherGuide",
  validatJWT,
  suitCasesController.getTotalSuits,
);

suitCaseRouter.put("/", validatJWT, suitCasesController.updateSuitCases);

suitCaseRouter.delete("/", validatJWT, suitCasesController.deleteSuitCases);

suitCaseRouter.patch(
  "/billing",
  validatJWT,
  suitCasesController.updateSuitInvoices,
);
export default suitCaseRouter;
