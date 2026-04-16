import { validatJWT } from '../middlewares/token';
import * as InventoryController from './../controllers/Inventory.controller';
import express = require('express');

const inventoryRouter = express.Router();

inventoryRouter.post(
  '/',
  validatJWT,
  InventoryController.createInventory
)

inventoryRouter.get(
  '/',
  validatJWT,
  InventoryController.getInventory,
)

inventoryRouter.patch(
  '/',
  validatJWT,
  InventoryController.UpdateQtyInventory
)

inventoryRouter.delete(
  '/',
  validatJWT,
  InventoryController.deleteInventory
)

export default inventoryRouter;