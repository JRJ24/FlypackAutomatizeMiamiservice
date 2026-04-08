import { Request, Response } from "express";
import { generateJWT, deleteJWT } from "../middlewares/token";
import bcrypt from "bcryptjs";
import userModel from "../models/Users.model";
import crypto from "crypto";

// Generate Token by user credentials
const login = async (req: Request, res: Response) => {
  try {

    const {email, password } = req.body;
    
    // const allowedDomains = process.env.EMAIL_ENDS.split(',');
    
    // const isValidEmail = allowedDomains.some(domain => email.endsWith(domain));
    if(!email){
      return res.status(400).json({
        ok: false,
        message: "Invalid Credentials email is required",
      })
    }

    const searchHash = crypto.createHash('sha256').update(email).digest('hex');

    const user = await userModel.findOne({emailIndex: searchHash});

    if (!user) {
      return res.status(404).json({ 
        ok: false,
        message: "no user found"
      });
    }

    if (user.isDelete) {
      return res.status(404).json({
        ok: false,
        message: "user is delete"
      });
    }
    if (!user.isActive) {
      return res.status(404).json({
        ok: false,
        message: "user is not active"
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

// const loginGoogle = async (req: Request, res: Response) => {
//   try {
//     const user = req.user as any;

//     if (!user) {
//       return res.redirect('https://reclamaciones.flypack.do/login?error=auth_failed');
//     }

//     if (user.isDelete) {
//       return res.redirect('https://reclamaciones.flypack.do/login?error=account_deleted');
//     }

//     if (!user.isActive) {
//       return res.redirect('https://reclamaciones.flypack.do/login?error=account_inactive');
//     }

//     const userToSend = user.toObject ? user.toObject() : user;
//     delete userToSend.password;
    
//     const token = await generateJWT(userToSend);

//     // IMPORTANTE: Redirige al frontend con el token
//     res.redirect(`https://reclamaciones.flypack.do/login/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userToSend))}`);
    
//   } catch (error) {
//     console.error(error);
//     res.redirect('https://reclamaciones.flypack.do/login?error=server_error');
//   }
// };


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

export { login, logout };