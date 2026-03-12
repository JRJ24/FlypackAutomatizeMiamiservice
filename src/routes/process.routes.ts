import * as Process from '@/../../src/controllers/Process.controller'
import multer from 'multer'
const { check } = require("express-validator");
import { validatJWT, deleteJWT, generateJWT } from '@/../../src/middlewares/token';
import express = require('express');

const processRouter: express.Router = express.Router();

processRouter.get(
  '/get',
  validatJWT,
  Process.getProcess,
)

processRouter.get(
  '/delete',
  validatJWT,
  deleteJWT,
  Process.deleteProcess
)

processRouter.post(
  '/',
  generateJWT,
  Process.createProcess,
)

processRouter.put(
  '/',
  validatJWT,
  Process.updateProcess
)

export default processRouter;