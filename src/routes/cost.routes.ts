import { validatJWT } from '../middlewares/token';
import * as costController from './../controllers/Cost.controller';
import express = require('express');

const costRouter = express.Router();

costRouter.post(
  '/',
  validatJWT,
  costController.newUpdateCost
)

costRouter.get(
  '/',
  validatJWT,
  costController.getCost
)

costRouter.patch(
  '/',
  validatJWT,
  costController.updatePatchCost
)

costRouter.delete(
  '/',
  validatJWT,
  costController.deleteCost
)

export default costRouter;