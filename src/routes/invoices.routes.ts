import { validatJWT } from '../middlewares/token';
import * as InvoicesController from './../controllers/Invoices.controller';
import express = require('express');

const invoicesRoutes = express.Router();


invoicesRoutes.post(
  '/',
  validatJWT,
  InvoicesController.createInvoices
)

invoicesRoutes.get(
  '/get/:motherGuide',
  validatJWT,
  InvoicesController.getInvoicesByMotherGuide
)

invoicesRoutes.get(
  '/get2/:motherGuide/:client',
  validatJWT,
  InvoicesController.getInvoicesByMotherGuideAndClient
)

export default invoicesRoutes;