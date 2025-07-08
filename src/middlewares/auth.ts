import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserPayload } from "../types/Payload";

export async function isLoggedIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies.token;

    if (!token) {
      res.status(401).json({
        error: "Unauthorized. No token provided.",
        flag: "NoTokenProvided",
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "id" in decoded &&
      "email" in decoded
    ) {
      req.user = decoded as UserPayload;
      next();
    } else {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token." });
    } else if (error.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token has expired." });
    } else {
      console.error("Authentication Error:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

    if (!token) {
      req.user = undefined;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "id" in decoded &&
      "email" in decoded
    ) {
      req.user = decoded as UserPayload;
    } else {
      req.user = undefined;
    }
  } catch (error: any) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      req.user = undefined;
    } else {
      console.error("Authentication Error:", error);
    }
  }

  next();
}
