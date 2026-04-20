import { validatJWT } from '../middlewares/token';
import * as maintenancesController from './../controllers/Maintenances.controller';
const express = require('express');

const maintenanceRouter = express.Router();

maintenanceRouter.get(
  '/',
  validatJWT,
  maintenancesController.getMaintenance
)

maintenanceRouter.patch(
  '/ADM',
  validatJWT,
  maintenancesController.UpdateADMMaintenance
)

maintenanceRouter.patch(
  '/kgV',
  validatJWT,
  maintenancesController.UpdateKgValMaintenance
)

maintenanceRouter.patch(
  '/dollar',
  validatJWT,
  maintenancesController.UpdateDollarCostMaintenance
)

maintenanceRouter.patch(
  '/rate',
  validatJWT,
  maintenancesController.UpdateRateMaintenance
)

maintenanceRouter.patch(
  '/custom',
  validatJWT,
  maintenancesController.UpdateCustomDutyValMaintenance
)


export default maintenanceRouter;