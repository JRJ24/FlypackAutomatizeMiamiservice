import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import UserModel from "@/../../src/models/Users.model";

interface AuthRequest extends Request {
  user?: Object;
}

interface IDecodedToken {
  data: {
    _id: string;
  };
  iat: number;
  exp: number;
}

const validatJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  let token = <string>req.headers["x-access-token"];

  if (!token) {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized - No token provided",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRETORPRIVATEKEY as string,
    ) as IDecodedToken;

    const id = decoded.data._id;

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(401).json({
        message: "User does not exist",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized - Invalid Token",
    });
  }
};

const deleteJWT = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRETORPRIVATEKEY, (err, decoded) => {
      if (err) {
        reject("Invalid token");
      } else {
        resolve(decoded);
      }
    });
  });
};


const generateJWT = (data) => {
  return new Promise((resolve, reject) => {
    const payload = { data };
    jwt.sign(
      payload,
      process.env.SECRETORPRIVATEKEY,
      {
        expiresIn: "168h",
      },
      (err, token) => {
        if (err) {
          reject("Couln't generate token");
        } else {
          resolve(token);
        }
      }
    );
  });
};

export { validatJWT, deleteJWT, generateJWT };