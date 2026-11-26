import rateLimit from "express-rate-limit";

// File uploads go through memory to Cloudinary, so a flood is expensive for the
// server (RAM, bandwidth) and for the Cloudinary quota. 30 uploads per 10
// minutes per IP is far more than normal chatting needs. Relaxed under tests,
// like the other limiters.
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 30,
  message: { message: "Too many uploads, please try again later." },
});
