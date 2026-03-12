import mongoose from "mongoose";

export interface IProcessmodel extends mongoose.Document {
  nameProcess: string;
  icon: string;
  path: string;
  isActive: boolean;
  isDelete: boolean;
  createAt: Date;
  updateAt: Date;
}