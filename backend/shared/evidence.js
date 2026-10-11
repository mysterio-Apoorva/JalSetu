"use strict";
const jpeg = require("jpeg-js");
const { check, HttpError } = require("./core");

// Decode, bound resource consumption and re-encode without camera EXIF/comments.
// This validates an image, not whether a physical water delivery happened.
exports.normalizePhoto = (encoded) => {
  check(
    typeof encoded === "string" &&
      encoded.length <= 2800000 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(encoded),
    "JPEG photo required (maximum 2 MB)",
  );
  const input = Buffer.from(encoded, "base64");
  check(input.length <= 2000000, "Photo exceeds 2 MB");
  let decoded;
  try {
    decoded = jpeg.decode(input, {
      tolerantDecoding: false,
      maxResolutionInMP: 12,
      maxMemoryUsageInMB: 128,
    });
  } catch {
    throw new HttpError(
      400,
      "Photo is corrupt or too large. Use a JPEG up to 12 megapixels and 2 MB.",
    );
  }
  check(
    decoded.width >= 320 && decoded.height >= 240,
    "Delivery photo must be at least 320 by 240 pixels",
  );
  const photo = jpeg.encode(
    { width: decoded.width, height: decoded.height, data: decoded.data },
    80,
  ).data;
  check(
    photo.length <= 2000000,
    "Processed photo exceeds 2 MB. Choose a smaller image.",
  );
  return photo;
};
