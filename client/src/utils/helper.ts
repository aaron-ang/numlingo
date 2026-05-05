export const isEmpty = (obj: any): boolean => {
  for (const _ in obj) {
    return false;
  }
  return true;
};

export const sleep = (delay: number) => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};
