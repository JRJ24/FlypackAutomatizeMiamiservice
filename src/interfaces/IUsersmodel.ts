import { stringList } from "aws-sdk/clients/datapipeline";
import mongoose from "mongoose";

export interface IUserModel extends mongoose.Document {
  name: string;
  email: string;
  emailIndex: string;
  password?: string;
  googleId?: string;
  role?: string;
  mustchangePassword: boolean;
  isActive: boolean;
  isDelete: boolean;
  createAt: Date;
  updateAt: Date;
}