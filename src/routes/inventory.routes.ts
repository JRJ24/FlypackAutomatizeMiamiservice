import { validatJWT } from '../middlewares/token';
import { authorize, ROLE_GROUPS } from '../middlewares/authorize';
import * as InventoryController from './../controllers/Inventory.controller';
import express = require('express');

const inventoryRouter = express.Router();

inventoryRouter.post(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.createInventory
)

inventoryRouter.get(
  '/client',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.getInventoryClient,
)

inventoryRouter.get(
  '/:_id/movements',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.getInventoryMovements,
)

inventoryRouter.get(
  '/:client',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.getInventory,
)

inventoryRouter.post(
  '/quantity',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.getQuantityOfClient,
)

inventoryRouter.patch(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.UpdateQtyInventory
)

inventoryRouter.delete(
  '/:_id',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  InventoryController.deleteInventory
)

export default inventoryRouter;
