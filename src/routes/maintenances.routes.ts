import { validatJWT } from '../middlewares/token';
import { authorize, ROLE_GROUPS } from '../middlewares/authorize';
import * as maintenancesController from './../controllers/Maintenances.controller';
const express = require('express');

const maintenanceRouter = express.Router();

maintenanceRouter.get(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  maintenancesController.getMaintenance
)

maintenanceRouter.patch(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  maintenancesController.UpdateMaintenances
)


export default maintenanceRouter;
