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


palletRouter.get(
  '/getTotal',
  validatJWT,
  palletsController.getPalletsDataProcess
)

palletRouter.get(
  '/motherGuide/:motherGuide',
  validatJWT,
  palletsController.getPalletsByMotherGuide
)

palletRouter.get(
  '/client/:clientName/:motherGuide',
  validatJWT,
  palletsController.getPalletsByClient
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