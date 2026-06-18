export const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

export const limitProductDescription = (value: string) =>
  value.slice(0, PRODUCT_DESCRIPTION_MAX_LENGTH);

export const normalizeProductDescription = (value: string) =>
  limitProductDescription(value.trim());
