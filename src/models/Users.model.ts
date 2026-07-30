import { model, Schema } from "mongoose";
import { IUserModel } from "../interfaces/IUsersmodel";
import { encrypt, safeDecrypt } from "../helpers/crypto";
import crypto from "crypto";

const UsersSchema = new Schema<IUserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    emailIndex: {
      type: String,
      unique: true,
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
      enum: [
        "FLYPACKADMIN",
        "FLYPACKMIAMI",
        "FLYPACKJDG",
        "CLIENTFLYPACK",
        "USER",
      ],
      default: "USER",
      required: true,
    },
    clientCode: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    mustchangePassword: {
      type: Boolean,
      isRequired: true,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      isRequired: false,
    },
    resetPasswordExpires: {
      type: Number,
      isRequired: false,
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

UsersSchema.pre("save", function () {
  if (this.isModified("name")) {
    this.name = encrypt(safeDecrypt(this.name));
  }

  if (this.isModified("email")) {
    const plainEmail = safeDecrypt(this.email).trim().toLowerCase();
    this.emailIndex = crypto
      .createHash("sha256")
      .update(plainEmail)
      .digest("hex");

    this.email = encrypt(plainEmail);
  }
});

UsersSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as any;
  if (Array.isArray(update)) return;

  const target = update.$set || update;

  if (target.name) {
    target.name = encrypt(safeDecrypt(target.name));
  }

  if (target.email) {
    const plainEmail = safeDecrypt(target.email).trim().toLowerCase();

    target.emailIndex = crypto
      .createHash("sha256")
      .update(plainEmail)
      .digest("hex");

    target.email = encrypt(plainEmail);
  }

  if (update.$set) update.$set = target;
  this.setUpdate(update);
});

UsersSchema.post("init", function (doc) {
  try {
    if (doc.name) doc.name = safeDecrypt(doc.name);
    if (doc.email) doc.email = safeDecrypt(doc.email);
  } catch (e) {
    console.warn("No se pudo desencriptar el documento:", doc._id);
  }
});

export default model<IUserModel>("Users", UsersSchema);
