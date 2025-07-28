import http from "http";
import dotenv from "dotenv";
import app from "./app";
import { connectDB, disconnectDB } from "./src/database/connection";
import { logger } from "./src/config/logger";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

function gracefulShutdown(signal: string) {
  logger.info(`🛑 Received ${signal}. Closing server...`);
  server.close(async () => {
    await disconnectDB();
    logger.info("🧹 Cleanup complete. Exiting...");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer();
