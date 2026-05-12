import { validatJWT } from "./../middlewares/token";
import * as FinancesController from "./../controllers/Finanzes.controller";
import express = require("express");
const financesRouter = express.Router();

financesRouter.put("/", validatJWT, FinancesController.managementAccounts);

financesRouter.post("/", validatJWT, FinancesController.createAccounts);

financesRouter.delete("/:_id", validatJWT, FinancesController.deleteAccounts);

financesRouter.get(
  "/getBanks1",
  validatJWT,
  FinancesController.getBanksAvailable,
);

financesRouter.get(
  "/getAccountsCXC1",
  validatJWT,
  FinancesController.getAccountsCXC,
);

financesRouter.get(
  "/getTotal",
  validatJWT,
  FinancesController.getTotal
)

financesRouter.patch(
  "/amountBanks",
  validatJWT,
  FinancesController.updateAmountBank
)


export default financesRouter;
