import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/** Proteksi route privat (PRD §7.1): tanpa session valid → 401. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) {
      res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Silakan login dulu" });
      return;
    }
    req.userId = session.user.id;
    req.userEmail = session.user.email;
    next();
  } catch (error) {
    next(error);
  }
}
