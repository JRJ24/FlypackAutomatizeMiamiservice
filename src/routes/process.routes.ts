import * as Process from './../controllers/Process.controller'
import multer from 'multer'
const { check } = require("express-validator");
import { validatJWT } from './../middlewares/token';
import express = require('express');

const processRouter: express.Router = express.Router();

processRouter.get(
  '/',
  // validatJWT,
  Process.getProcess,
)

processRouter.get(
  '/nolimit',
  // validatJWT,
  Process.getProcessNoLimit,
)

processRouter.delete(
  '/',
  // validatJWT,
  Process.deleteProcess
)

processRouter.post(
  '/',
  // validatJWT,
  Process.createProcess,
)

processRouter.put(
  '/',
  // validatJWT,
  Process.updateProcess
)

export default processRouter;