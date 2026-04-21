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
  '/',
  validatJWT,
  maintenancesController.UpdateMaintenances
)


export default maintenanceRouter;