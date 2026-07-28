
import { validatJWT } from './../middlewares/token';
import { authorize, ROLE_GROUPS } from '../middlewares/authorize';
import * as modelReferenceController from './../controllers/ModelReference.controller';
import express = require('express');

const modelReferenceRouter = express.Router();

modelReferenceRouter.post(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  modelReferenceController.createNewModelReference
)

modelReferenceRouter.get(
  '/',
  validatJWT,
  authorize(...ROLE_GROUPS.operations),
  modelReferenceController.getModelName
)


export default modelReferenceRouter
