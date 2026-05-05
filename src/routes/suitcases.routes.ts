import { validatJWT } from "./../middlewares/token";
import * as suitCasesController from "./../controllers/Suitcases.controller";
const express = require("express");

const suitCaseRouter = express.Router();

suitCaseRouter.post("/", validatJWT, suitCasesController.createSuitCases);

suitCaseRouter.get("/get", validatJWT, suitCasesController.getSuitCases);

suitCaseRouter.get("/get2/:clientName/:motherGuide", validatJWT, suitCasesController.getSuitCasesByMotherGuide);

suitCaseRouter.put("/", validatJWT, suitCasesController.updateSuitCases);

suitCaseRouter.delete("/", validatJWT, suitCasesController.deleteSuitCases);

export default suitCaseRouter;