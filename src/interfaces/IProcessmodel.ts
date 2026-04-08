import mongoose from "mongoose";

export interface IProcessmodel extends mongoose.Document {
  nameProcess: string;
  icon: string;
  path: string;
  description: string
  isActive?: boolean;
  isDelete?: boolean;
  createAt?: Date;
  updateAt?: Date;
}

export interface IProcess {
  nameProcess: string;
  icon: string;
  path: string;
  description?: string;
}