import { validatJWT } from "./../middlewares/token";
import * as FinancesController from "./../controllers/Finanzes.controller";
import express = require("express");
const financesRouter = express.Router();

financesRouter.put("/", validatJWT, FinancesController.managementAccounts);

financesRouter.post("/", validatJWT, FinancesController.createAccounts);

financesRouter.delete("/:_id", validatJWT, FinancesController.deleteAccounts);

export default financesRouter;
