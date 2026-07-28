import { validatJWT } from "./../middlewares/token";
import { authorize, ROLE_GROUPS } from "../middlewares/authorize";
import * as FinancesController from "./../controllers/Finanzes.controller";
import express = require("express");
const financesRouter = express.Router();

financesRouter.put("/", validatJWT, authorize(...ROLE_GROUPS.admin), FinancesController.managementAccounts);

financesRouter.post("/", validatJWT, authorize(...ROLE_GROUPS.admin), FinancesController.createAccounts);

financesRouter.delete("/:_id", validatJWT, authorize(...ROLE_GROUPS.admin), FinancesController.deleteAccounts);

financesRouter.get(
  "/getBanks1",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  FinancesController.getBanksAvailable,
);

financesRouter.get(
  "/getAccountsCXC1",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  FinancesController.getAccountsCXC,
);

financesRouter.get(
  "/getTotal",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  FinancesController.getTotal
)

financesRouter.patch(
  "/amountBanks",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  FinancesController.updateAmountBank
)

financesRouter.post(
  "/debit",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  FinancesController.debitAccount
)

financesRouter.get(
  "/getDebit",
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  FinancesController.getDebitAccount
)

export default financesRouter;
