import * as Process from './../controllers/Process.controller'
import multer from 'multer'
const { check } = require("express-validator");
import { validatJWT } from './../middlewares/token';
import { authorize, ROLE_GROUPS } from '../middlewares/authorize';
import express = require('express');

const processRouter: express.Router = express.Router();

processRouter.get(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  Process.getProcess,
)

processRouter.get(
  '/nolimit',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  Process.getProcessNoLimit,
)

processRouter.delete(
  '/:_id',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  Process.deleteProcess
)

processRouter.post(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  Process.createProcess,
)

processRouter.put(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.admin),
  Process.updateProcess
)

export default processRouter;
