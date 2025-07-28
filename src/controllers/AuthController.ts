import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { AppError } from "../utils/errors/AppError";
import { logger } from "../config/logger";
import ResponseBuilder from "@/utils/ResponseBuilder";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;
      const token = await this.authService.login(email, password);

      return ResponseBuilder.successWithToken(
        token,
        {},
        "Login successful",
        200,
      ).build(res);
    } catch (error) {
      logger.error("Login error: %s", error);
      if (error instanceof AppError) {
        return ResponseBuilder.error(error.message, error.statusCode).build(
          res,
        ); // ✅ fixed
      }

      return ResponseBuilder.error("Internal server error", 500).build(res); // ✅ fixed
    }
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body;
      const user = await this.authService.register({ name, email, password });

      return ResponseBuilder.success(
        user,
        "Registration successful",
        201,
      ).build(res);
    } catch (error) {
      logger.error("Register error: %s", error);
      if (error instanceof AppError) {
        return ResponseBuilder.error(error.message, error.statusCode).build(
          res,
        ); // ✅
      }

      return ResponseBuilder.error("Internal server error", 500).build(res); // ✅
    }
  }
}
