import { validatJWT } from "./../middlewares/token";
import { authorize, ROLE_GROUPS } from "../middlewares/authorize";
import * as suitCasesController from "./../controllers/Suitcases.controller";
const express = require("express");

const suitCaseRouter = express.Router();

suitCaseRouter.post("/", validatJWT, authorize(...ROLE_GROUPS.operations), suitCasesController.createSuitCases);

suitCaseRouter.get("/get", validatJWT, authorize(...ROLE_GROUPS.operations), suitCasesController.getSuitCases);

suitCaseRouter.get(
  "/get2/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  suitCasesController.getSuitCasesByMotherGuide,
);
suitCaseRouter.get(
  "/get3/:clientName/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  suitCasesController.getClientNameAndMotherGuide,
);
suitCaseRouter.get(
  "/get4/:clientName/:motherGuide",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  suitCasesController.getTotalSuits,
);

suitCaseRouter.put("/", validatJWT, authorize(...ROLE_GROUPS.operations), suitCasesController.updateSuitCases);

suitCaseRouter.delete("/:_id", validatJWT, authorize(...ROLE_GROUPS.operations), suitCasesController.deleteSuitCases);

suitCaseRouter.patch(
  "/itemDeleted",
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  suitCasesController.deleteItemsSuitCases,
);

suitCaseRouter.patch(
  "/billing",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  suitCasesController.updateSuitInvoices,
);
export default suitCaseRouter;
