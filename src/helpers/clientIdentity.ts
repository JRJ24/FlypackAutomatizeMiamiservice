import UsersModel from "../models/Users.model";
import { normalizeClientName } from "./clientName";

const normalizeClientCode = (value: unknown) =>
  String(value || "").trim().toUpperCase();

const normalizeClientIdentityName = (value: unknown) =>
  normalizeClientName(value).toLowerCase();

const getClientCodeForName = async (clientName: unknown) => {
  const normalizedName = normalizeClientIdentityName(clientName);

  if (!normalizedName) return undefined;

  const clients = await UsersModel.find({
    role: "CLIENTFLYPACK",
    isActive: true,
    isDelete: false,
  }).select("name clientCode");

  const client = clients.find(
    (item) => normalizeClientIdentityName(item.name) === normalizedName,
  );

  return normalizeClientCode(client?.clientCode) || undefined;
};

const getRequestClientIdentity = (user: any) => ({
  clientName: normalizeClientName(user?.name),
  clientCode: normalizeClientCode(user?.clientCode),
});

const matchesClientIdentity = (
  value: Record<string, any>,
  nameField: "client" | "clientName",
  identity: { clientName: string; clientCode?: string },
) => {
  const recordClientCode = normalizeClientCode(value.clientCode);

  if (identity.clientCode && recordClientCode) {
    return recordClientCode === identity.clientCode;
  }

  return normalizeClientIdentityName(value[nameField]) === normalizeClientIdentityName(identity.clientName);
};

export {
  getClientCodeForName,
  getRequestClientIdentity,
  matchesClientIdentity,
  normalizeClientCode,
};
