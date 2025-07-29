import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { AppError } from "../utils/errors/AppError";
import { logger } from "../config/logger";
import ResponseBuilder from "@/utils/ResponseBuilder";
import { User } from "@/models/User";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;
      const { token, user } = await this.authService.login(email, password);

      return ResponseBuilder.successWithToken(
        token,
        user,
        "Login successful",
        200
      ).build(res);
    } catch (error) {
      logger.error("Login error: %s", error);
      if (error instanceof AppError) {
        return ResponseBuilder.error(error.message, error.statusCode).build(
          res
        );
      }

      return ResponseBuilder.error("Internal server error", 500).build(res);
    }
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body;
      await this.authService.register({ name, email, password });

      return ResponseBuilder.successMessage(
        "Registration successful",
        201
      ).build(res);
    } catch (error) {
      logger.error("Register error: %s", error);
      if (error instanceof AppError) {
        return ResponseBuilder.error(error.message, error.statusCode).build(
          res
        );
      }

      return ResponseBuilder.error("Internal server error", 500).build(res);
    }
  }
}
