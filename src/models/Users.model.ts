import { model, Schema } from "mongoose";
import { IUserModel } from "../interfaces/IUsersmodel";

const UsersSchema = new Schema<IUserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["MIAMI", "FLYPACK", "FLYPACKADMIN", "FLYPACKASSISTANT", "USER"],
      default: "USER",
      required: true,
    },
    mustchangePassword: {
      type: Boolean,
      isRequired: true,
      default: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isDelete: {
      type: Boolean,
      isRequired: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model<IUserModel>("Users", UsersSchema);
