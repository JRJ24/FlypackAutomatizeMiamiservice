import { safeDecrypt } from "./crypto";

const normalizeClientName = (value: unknown) => safeDecrypt(value).trim();

const toPlainObject = <T extends Record<string, any>>(value: T): Record<string, any> => {
  if (value && typeof (value as any).toObject === "function") {
    return (value as any).toObject();
  }

  return { ...value };
};

const withDecryptedClientFields = <T extends Record<string, any>>(value: T): T => {
  const object = toPlainObject(value);

  if (typeof object.clientName === "string") {
    object.clientName = normalizeClientName(object.clientName);
  }

  if (typeof object.client === "string") {
    object.client = normalizeClientName(object.client);
  }

  return object as T;
};

export { normalizeClientName, withDecryptedClientFields };
