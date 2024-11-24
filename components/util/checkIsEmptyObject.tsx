export const isEmptyObject = (obj: any) => {
  if (obj) {
    return Object.keys(obj).length === 0;
  }
};
