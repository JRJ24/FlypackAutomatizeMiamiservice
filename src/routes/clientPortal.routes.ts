import express = require("express");
import { validatJWT } from "../middlewares/token";
import { authorize, ROLES } from "../middlewares/authorize";
import * as ClientPortalController from "../controllers/ClientPortal.controller";

const clientPortalRouter = express.Router();

clientPortalRouter.get(
  "/overview",
  validatJWT,
  authorize(ROLES.CLIENT),
  ClientPortalController.getOverview,
);

export default clientPortalRouter;
