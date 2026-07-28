import { Request, Response, type RequestHandler } from "express";
import * as jwt from "jsonwebtoken";
import crypto from "crypto";
import { Types } from "mongoose";
import { config } from "../config/env";
import UserModel from "../models/Users.model";
import SessionModel from "../models/Session.model";
import type { IUserModel } from "../interfaces/IUsersmodel";
import { sanitizeUser } from "../helpers/sanitizeUser";

interface IDecodedAccessToken {
  sub: string;
  role?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

const parseCookies = (req: Request) => {
  const cookieHeader = req.headers.cookie;
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (!rawName || rawValue.length === 0) return;

    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  });

  return cookies;
};

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie(
    config.accessTokenCookieName,
    accessToken,
    getCookieOptions(config.accessTokenMaxAgeMs),
  );
  res.cookie(
    config.refreshTokenCookieName,
    refreshToken,
    getCookieOptions(config.refreshTokenMaxAgeMs),
  );
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie(config.accessTokenCookieName, { path: "/" });
  res.clearCookie(config.refreshTokenCookieName, { path: "/" });
};

const clearAccessCookie = (res: Response) => {
  res.clearCookie(config.accessTokenCookieName, { path: "/" });
};

const generateAccessToken = (user: IUserModel, sessionId: string) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      sessionId,
    },
    config.jwtSecret,
    { expiresIn: config.accessTokenExpiresIn as jwt.SignOptions["expiresIn"] },
  );

const createAuthSession = async (
  user: IUserModel,
  req: Request,
  res: Response,
) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + config.refreshTokenMaxAgeMs);

  const session = await SessionModel.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
    expiresAt,
  });

  const accessToken = generateAccessToken(user, String(session._id));
  setAuthCookies(res, accessToken, refreshToken);

  return {
    user: sanitizeUser(user),
    sessionId: String(session._id),
  };
};

const rotateRefreshToken = async (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const refreshToken = cookies[config.refreshTokenCookieName];

  if (!refreshToken) {
    clearAuthCookies(res);
    return null;
  }

  const session = await SessionModel.findOne({
    refreshTokenHash: hashToken(refreshToken),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    clearAuthCookies(res);
    return null;
  }

  const user = await UserModel.findById(session.userId);

  if (!user || user.isDelete || !user.isActive) {
    session.revokedAt = new Date();
    await session.save();
    clearAuthCookies(res);
    return null;
  }

  const nextRefreshToken = crypto.randomBytes(64).toString("hex");
  session.refreshTokenHash = hashToken(nextRefreshToken);
  session.expiresAt = new Date(Date.now() + config.refreshTokenMaxAgeMs);
  session.userAgent = req.get("user-agent");
  session.ipAddress = req.ip;
  await session.save();

  const accessToken = generateAccessToken(user, String(session._id));
  setAuthCookies(res, accessToken, nextRefreshToken);

  return {
    user: sanitizeUser(user),
    sessionId: String(session._id),
  };
};

const revokeRefreshSession = async (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const refreshToken = cookies[config.refreshTokenCookieName];

  if (refreshToken) {
    await SessionModel.findOneAndUpdate(
      {
        refreshTokenHash: hashToken(refreshToken),
        revokedAt: { $exists: false },
      },
      { revokedAt: new Date() },
    );
  }

  clearAuthCookies(res);
};

const revokeUserSessions = async (userId: string | Types.ObjectId) => {
  await SessionModel.updateMany(
    {
      userId,
      revokedAt: { $exists: false },
    },
    { revokedAt: new Date() },
  );
};

const validatJWT: RequestHandler = async (req, res, next) => {
  const cookies = parseCookies(req);
  const accessToken = cookies[config.accessTokenCookieName];

  if (!accessToken) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized",
      mensaje: "No autorizado",
      data: null,
    });
  }

  try {
    const decoded = jwt.verify(accessToken, config.jwtSecret) as IDecodedAccessToken;

    if (!decoded.sub || !decoded.sessionId) {
      throw new Error("Invalid token payload");
    }

    const [session, user] = await Promise.all([
      SessionModel.findOne({
        _id: decoded.sessionId,
        userId: decoded.sub,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      }),
      UserModel.findById(decoded.sub),
    ]);

    if (!session || !user || user.isDelete || !user.isActive) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
        mensaje: "No autorizado",
        data: null,
      });
    }

    (req as any).user = user;
    (req as any).sessionId = decoded.sessionId;
    next();
  } catch (error) {
    clearAccessCookie(res);

    return res.status(401).json({
      ok: false,
      message: "Unauthorized",
      mensaje: "No autorizado",
      data: null,
    });
  }
};

export {
  validatJWT,
  createAuthSession,
  rotateRefreshToken,
  revokeRefreshSession,
  revokeUserSessions,
  clearAuthCookies,
};
