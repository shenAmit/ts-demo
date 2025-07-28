import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./src/routes/auth";
import { errorHandler } from "./src/middleware/errorHandler";
import rateLimiter from "./src/middleware/rateLimiter";
import { logger } from "./src/config/logger";

const app = express();

app.use(cors());
app.use(helmet());
app.use(
  morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(rateLimiter);

app.use("/api/auth", authRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

app.use(errorHandler);

export default app;
