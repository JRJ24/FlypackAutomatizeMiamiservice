import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import userModel from "../models/Users.model";
import UsersModel from "../models/Users.model";
import {
  createAuthSession,
  rotateRefreshToken,
  revokeRefreshSession,
  revokeUserSessions,
} from "../middlewares/token";
import { emailForgotPassword } from "../helpers/emailManaged";
import { hashPassword } from "../helpers/hashpassword";
import { config } from "../config/env";
import { sanitizeUser } from "../helpers/sanitizeUser";

const invalidCredentials = {
  ok: false,
  message: "Credenciales invalidas",
  mensaje: "Credenciales invalidas",
  data: null,
};

const getEmailIndex = (email: string) =>
  crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json(invalidCredentials);
    }

    const user = await userModel.findOne({ emailIndex: getEmailIndex(String(email)) });

    if (!user || user.isDelete || !user.isActive) {
      return res.status(401).json(invalidCredentials);
    }

    const isMatch = await bcrypt.compare(password, user.password || "");

    if (!isMatch) {
      return res.status(401).json(invalidCredentials);
    }

    const session = await createAuthSession(user, req, res);

    return res.status(200).json({
      ok: true,
      user: session.user,
      data: session.user,
      message: "Login successful",
      mensaje: "Inicio de sesion exitoso",
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Server error", data: null });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    await revokeRefreshSession(req, res);

    return res.status(200).json({
      ok: true,
      message: "Logged out successfully",
      mensaje: "Sesion cerrada correctamente",
      data: null,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Server error", data: null });
  }
};

const loginGoogle = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user || user.isDelete || !user.isActive) {
      return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }

    await createAuthSession(user, req, res);

    return res.redirect(`${config.frontendUrl}/login/callback?success=true`);
  } catch (error) {
    console.error(error);
    return res.redirect(`${config.frontendUrl}/login?error=server_error`);
  }
};

const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshedSession = await rotateRefreshToken(req, res);

    if (!refreshedSession) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
        mensaje: "No autorizado",
        data: null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Session refreshed",
      mensaje: "Sesion renovada",
      user: refreshedSession.user,
      data: refreshedSession.user,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Server error", data: null });
  }
};

const me = async (req: Request, res: Response) => {
  const user = sanitizeUser((req as any).user || {});

  return res.status(200).json({
    ok: true,
    message: "Authenticated user",
    mensaje: "Usuario autenticado",
    user,
    data: user,
  });
};

const FORGOTPASSWORD = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "No email",
        mensaje: "No email",
        data: null,
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const verifyEmail = await UsersModel.findOne({ emailIndex: getEmailIndex(normalizedEmail) });

    if (verifyEmail) {
      const resetToken = crypto.randomBytes(20).toString("hex");
      const passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      verifyEmail.resetPasswordToken = passwordResetToken;
      verifyEmail.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

      await verifyEmail.save();
      await emailForgotPassword(
        normalizedEmail,
        `${config.frontendUrl}/RESETPASSWORD?token=${resetToken}`,
      );
    }

    return res.status(200).json({
      ok: true,
      message: "If the account exists, you will receive an email.",
      mensaje: "Si la cuenta existe, recibiras un correo.",
      data: null,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "ERROR INTERNAL",
      mensaje: "ERROR INTERNO",
      data: null,
    });
  }
};

const RESETPASSWORD = async (req: Request, res: Response) => {
  try {
    const { newPassword, reNewPassword, recoveryToken } = req.body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim() === "") {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    if (!reNewPassword || typeof reNewPassword !== "string") {
      return res.status(400).json({
        ok: false,
        message: "No data",
        mensaje: "No data",
        data: null,
      });
    }

    if (newPassword !== reNewPassword) {
      return res.status(400).json({
        ok: false,
        message: "Passwords do not match",
        mensaje: "Las contrasenas no coinciden",
        data: null,
      });
    }

    if (!recoveryToken || typeof recoveryToken !== "string") {
      return res.status(400).json({
        ok: false,
        message: "Token de recuperacion faltante",
        mensaje: "No se proporciono un token valido",
        data: null,
      });
    }

    const passwordResetToken = crypto
      .createHash("sha256")
      .update(recoveryToken)
      .digest("hex");

    const user = await UsersModel.findOne({
      resetPasswordToken: passwordResetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        message: "Invalid or expired token",
        mensaje: "Token invalido o expirado",
        data: null,
      });
    }

    const isMatch = user.password
      ? await bcrypt.compare(newPassword, user.password)
      : false;

    if (isMatch) {
      return res.status(400).json({
        ok: false,
        message: "This password is the same",
        mensaje: "La contrasena es igual a la actual",
        data: null,
      });
    }

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = 0;

    await user.save();
    await revokeUserSessions(user._id);

    return res.status(200).json({
      ok: true,
      message: "The password update successfully",
      mensaje: "La contrasena fue actualizada con exito",
      data: "Success",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      mensaje: "Error en el servidor",
      data: null,
    });
  }
};

export {
  login,
  logout,
  loginGoogle,
  refreshToken,
  me,
  FORGOTPASSWORD,
  RESETPASSWORD,
};
