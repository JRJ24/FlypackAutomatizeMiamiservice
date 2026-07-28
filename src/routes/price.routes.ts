import { validatJWT } from '../middlewares/token';
import { authorize, ROLE_GROUPS } from '../middlewares/authorize';
import * as priceController from './../controllers/Price.controller';
import express = require('express');

const priceRouter = express.Router();

priceRouter.post(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  priceController.newPrice
)

priceRouter.get(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  priceController.getPrice
)

priceRouter.get(
  '/model',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  priceController.getPriceModel
)


priceRouter.put(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  priceController.updatePrice
)

priceRouter.delete(
  '/:_id',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  priceController.deletePrice
)

export default priceRouter;
