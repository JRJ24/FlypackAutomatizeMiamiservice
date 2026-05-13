import { validatJWT } from '../middlewares/token';
import * as InventoryController from './../controllers/Inventory.controller';
import express = require('express');

const inventoryRouter = express.Router();

inventoryRouter.post(
  '/',
  // validatJWT,
  InventoryController.createInventory
)

inventoryRouter.get(
  '/client',
  validatJWT,
  InventoryController.getInventoryClient,
)

inventoryRouter.get(
  '/:client',
  validatJWT,
  InventoryController.getInventory,
)

inventoryRouter.post(
  '/quantity',
  validatJWT,
  InventoryController.getQuantityOfClient,
)

inventoryRouter.patch(
  '/',
  validatJWT,
  InventoryController.UpdateQtyInventory
)

inventoryRouter.delete(
  '/:_id',
  validatJWT,
  InventoryController.deleteInventory
)

export default inventoryRouter;