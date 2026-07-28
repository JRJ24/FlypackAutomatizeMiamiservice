import type { IUserModel } from "../interfaces/IUsersmodel";
import { safeDecrypt } from "./crypto";

const sanitizeUser = (user: IUserModel | Record<string, any>) => {
  const userObject = typeof (user as any).toObject === "function"
    ? (user as any).toObject()
    : { ...user };

  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  delete userObject.emailIndex;

  if (typeof userObject.name === "string") {
    userObject.name = safeDecrypt(userObject.name);
  }

  if (typeof userObject.email === "string") {
    userObject.email = safeDecrypt(userObject.email);
  }

  return userObject;
};

export { sanitizeUser };
