const REF_PREFIX = "REF #";

const normalizeMiamiInvoiceNumber = (value?: unknown) => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withoutPrefix = trimmed.replace(/^REF\s*#?\s*/i, "").trim();
  if (!withoutPrefix) return undefined;

  return `${REF_PREFIX}${withoutPrefix}`;
};

export { normalizeMiamiInvoiceNumber };
