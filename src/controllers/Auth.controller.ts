import { Request, Response } from "express";
import { generateJWT, deleteJWT } from "../middlewares/token";
import bcrypt from "bcryptjs";
import userModel from "../models/Users.model";
import crypto from "crypto";
import UsersModel from "../models/Users.model";
import { emailForgotPassword } from "./../helpers/emailManaged";
import { hashPassword } from "./../helpers/hashpassword";

// Generate Token by user credentials
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // const allowedDomains = process.env.EMAIL_ENDS.split(',');

    // const isValidEmail = allowedDomains.some(domain => email.endsWith(domain));
    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Invalid Credentials email is required",
      });
    }

    const searchHash = crypto.createHash("sha256").update(email).digest("hex");

    const user = await userModel.findOne({ emailIndex: searchHash });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "no user found",
      });
    }

    if (user.isDelete) {
      return res.status(404).json({
        ok: false,
        message: "user is delete",
      });
    }
    if (!user.isActive) {
      return res.status(404).json({
        ok: false,
        message: "user is not active",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials pas" });
    }

    const userToSend = user.toObject();
    delete userToSend.password;

    const token = await generateJWT(userToSend);

    res.json({
      ok: true,
      user: userToSend,
      message: "ME AUTO SUCESS LOGIN",
      mensaje: "ME AUTO EXITO INICIO DE SESION",
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Logout User by invalidating the token
const logout = async (req: Request, res: Response) => {
  const token = req.header("x-access-token") || "";
  try {
    await deleteJWT(token);
    res.json({
      ok: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const loginGoogle = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (process.env.NODE_ENV === "PROD") {
      if (!user) {
        return res.redirect(
          "https://operaciones.flypack.do/login?error=auth_failed",
        );
      }

      if (user.isDelete) {
        return res.redirect(
          "https://operaciones.flypack.do/login?error=account_deleted",
        );
      }

      if (!user.isActive) {
        return res.redirect(
          "https://operaciones.flypack.do/login?error=account_inactive",
        );
      }

      const userToSend = user.toObject ? user.toObject() : user;
      delete userToSend.password;

      const token = await generateJWT(userToSend);

      // IMPORTANTE: Redirige al frontend con el token
      res.redirect(
        `https://operaciones.flypack.do/login/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userToSend))}`,
      );
    } else {
      if (!user) {
        return res.redirect(
          "https://operaciones.flypack.do/login?error=auth_failed",
        );
      }

      if (user.isDelete) {
        return res.redirect(
          "https://operaciones.flypack.do/login?error=account_deleted",
        );
      }

      if (!user.isActive) {
        return res.redirect(
          "https://operaciones.flypack.do/login?error=account_inactive",
        );
      }

      const userToSend = user.toObject ? user.toObject() : user;
      delete userToSend.password;

      const token = await generateJWT(userToSend);

      // IMPORTANTE: Redirige al frontend con el token
      res.redirect(
        `http://localhost:5173/login/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userToSend))}`,
      );
    }
  } catch (error) {
    console.error(error);
    res.redirect("http://localhost:5173/login?error=server_error");
  }
};

// const refresh = async (req: Request, res: Response) => {
//   try{
//     const user = req.user as any;

//     if(!user){
//       return res.status(404).json({
//         ok: false,
//         message: "No send User"
//       })
//     }

//     const freshUser = await userModel.findOne({ email: user.email });

//     if(!freshUser){
//       return res.status(404).json({
//         ok: false,
//         message: "not found"
//       })
//     }

//     const freshUserToken = freshUser.toObject();
//     delete freshUserToken.password;

//     const newToken = await generateJWT(freshUserToken);

//     if(!newToken) {
//       return res.status(403).json({
//         ok: false,
//         message: "token no generated"
//       })
//     }

//     return res.status(200).json({
//       ok: true,
//       token: newToken,
//       message: "Token regenerated"
//     })
//   }catch(err){
//     res.status(500).json({ ok: false, message: "Server error" });
//   }
// }

const FORGOTPASSWORD = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    let resetLink: string;
    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "No email",
        mensaje: "No email",
        data: null,
      });
    }

    const verifyEmail = await UsersModel.findOne({ email: email });

    if (verifyEmail) {
      const resetToken = crypto.randomBytes(20).toString("hex");

      const passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const passwordResetExpires = Date.now() + 10 * 60 * 1000;

      verifyEmail.resetPasswordToken = passwordResetToken;
      verifyEmail.resetPasswordExpires = passwordResetExpires;

      await verifyEmail.save();

      if (process.env.NODE_ENV === "PROD") {
        resetLink = `https://operaciones.flypack.do/RESETPASSWORD?token=${resetToken}`;
      } else {
        resetLink = `http://localhost:5173/RESETPASSWORD?token=${resetToken}`;
      }

      await emailForgotPassword(email, resetLink);

      return res.status(200).json({
        ok: true,
        message: "In process",
        mensaje: "En proceso",
        data: null,
      });
    }

    return res.status(404).json({
      ok: false,
      message: "User not found",
      mensaje: "Usuario no encontrado",
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

    // More explicit validation
    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.trim() === ""
    ) {
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

    if (!recoveryToken || typeof recoveryToken !== "string") {
      return res.status(400).json({
        ok: false,
        message: "Token de recuperación faltante",
        mensaje: "No se proporcionó un token válido",
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

    if (!user || !user.password) {
      return res.status(400).json({
        ok: false,
        message: "No User o no user with password",
        mensaje: "No User",
        data: null,
      });
    }

    const isMatch = await bcrypt.compare(newPassword, user.password);
    if (isMatch) {
      return res.status(400).json({
        ok: false,
        message: "This password is the same",
      });
    }

    const hashPass = await hashPassword(newPassword);

    user.password = hashPass;
    user.resetPasswordToken = "";
    user.resetPasswordExpires = 0;

    await user.save();

    return res.status(200).json({
      ok: true,
      message: "The password update sucessfully",
      mensaje: "La contraseña fue actualzada con exito",
      data: "Sucess",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: "Server error",
      mensaje: "Error en el servidor",
    });
  }
};

export { login, logout, loginGoogle, FORGOTPASSWORD, RESETPASSWORD };
