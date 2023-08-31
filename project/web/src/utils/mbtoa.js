import tob from "./tob";

const mbtoa = (b) => {
  return btoa(tob(b));
};

export default mbtoa;
