import * as authController from "./../controllers/Auth.controller";

import express = require("express");
import { validatJWT } from "../middlewares/token";
import passport from "passport";
import { config } from "../config/env";


// import { validateFields } from "../middlewares/validate_fields";

const authRouter = express.Router();

authRouter.post(
    "/login",
    authController.login
)

authRouter.get(
  "/loginGoogle",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${config.frontendUrl}/login?error=auth_failed` }),
  authController.loginGoogle 
);

// authRouter.get(
//   "/refresh",
//   token.validatJWT,
//   authController.refresh
// )

authRouter.get("/me", validatJWT, authController.me);

authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post("/logout", authController.logout);

authRouter.get("/logout", authController.logout);

authRouter.post("/request-password-reset", authController.FORGOTPASSWORD);

authRouter.post("/change-the-password", authController.RESETPASSWORD);

export default authRouter;
