import { AuthController } from "@/controllers/AuthController";
import { Router } from "express";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post("/login", (req, res) => authController.login(req, res));
authRoutes.post("/register", (req, res) => authController.register(req, res));

export default authRoutes;
