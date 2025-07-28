import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/AppError";
import { logger } from "../config/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error(`${req.method} ${req.url} - ${err.message}`);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  logger.error(err.stack || "No stack trace available");

  return res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
}
