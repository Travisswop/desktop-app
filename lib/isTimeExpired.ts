// Check if poll is expired based on current time
export const isTimeExpired = (expiresAt: string | Date): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
};
