import * as authController from "./../controllers/Auth.controller";

import express = require("express");
import { validatJWT } from "../middlewares/token";
import passport from "passport";


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
  passport.authenticate("google", { session: false, failureRedirect: "http://localhost:5173/login?error=auth_failed" }),
  authController.loginGoogle 
);

// authRouter.get(
//   "/refresh",
//   token.validatJWT,
//   authController.refresh
// )

authRouter.get("/logout", validatJWT, authController.logout);

export default authRouter;