import { validatJWT } from '../middlewares/token';
import * as palletsController from './../controllers/Pallets.controller';
import express = require('express');

const palletRouter = express.Router();

palletRouter.post(
  '/',
  validatJWT,
  palletsController.createPallets
)

palletRouter.get(
  '/',
  validatJWT,
  palletsController.getPallets
)

palletRouter.put(
  '/',
  validatJWT,
  palletsController.updatePallets
)

palletRouter.delete(
  '/',
  validatJWT,
  palletsController.deletePallets
)

export default palletRouter;