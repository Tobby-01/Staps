import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export const signToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

export const setAuthCookie = (res, token) => {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: env.isProduction ? "none" : "lax",
    secure: env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    sameSite: env.isProduction ? "none" : "lax",
    secure: env.isProduction,
  });
};
