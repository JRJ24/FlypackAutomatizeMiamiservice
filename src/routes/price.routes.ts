import { validatJWT } from '../middlewares/token';
import * as priceController from './../controllers/Price.controller';
import express = require('express');

const priceRouter = express.Router();

priceRouter.post(
  '/',
  validatJWT,
  priceController.newPrice
)

priceRouter.get(
  '/',
  validatJWT,
  priceController.getPrice
)

priceRouter.put(
  '/',
  validatJWT,
  priceController.updatePrice
)

priceRouter.delete(
  '/',
  validatJWT,
  priceController.deletePrice
)

export default priceRouter;