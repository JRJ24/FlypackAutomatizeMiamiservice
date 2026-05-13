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

palletRouter.get(
  '/invoicesBilling',
  validatJWT,
  palletsController.getPalletsBillings
)


palletRouter.patch(
  '/billing',
  validatJWT,
  palletsController.updatePalletsInvoices
)

palletRouter.put(
  '/',
  validatJWT,
  palletsController.deletePallets
)

palletRouter.patch(
  '/itemDeleted',
  validatJWT,
  palletsController.deleteItemsPallets
)

export default palletRouter;