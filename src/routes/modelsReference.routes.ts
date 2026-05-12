
import { validatJWT } from './../middlewares/token';
import * as modelReferenceController from './../controllers/ModelReference.controller';
import express = require('express');

const modelReferenceRouter = express.Router();

modelReferenceRouter.post(
  '/',
  validatJWT,
  modelReferenceController.createNewModelReference
)

modelReferenceRouter.get(
  '/',
  validatJWT,
  modelReferenceController.getModelName
)


export default modelReferenceRouter