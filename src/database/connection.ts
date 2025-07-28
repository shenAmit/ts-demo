import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as dotenv from "dotenv";

dotenv.config();

let pool: ReturnType<typeof createPool>;
export let db: ReturnType<typeof drizzle>;

export async function connectDB() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("❌ DATABASE_URL is not defined in .env");
  }

  const match = url.match(
    /^mysql:\/\/(?<user>[^:]+):(?<password>[^@]*)@(?<host>[^:]+):(?<port>\d+)\/(?<database>[^?]+)/,
  );

  if (!match || !match.groups) {
    throw new Error("❌ Invalid DATABASE_URL format");
  }

  const { user, password, host, port, database } = match.groups;

  pool = createPool({
    host,
    port: Number(port),
    user,
    password: password || "",
    database,
    waitForConnections: true,
    connectionLimit: 10,
  });

  db = drizzle(pool);
  console.log("✅ MySQL connected via Drizzle");
}

export async function disconnectDB() {
  await pool.end();
  console.log("❌ MySQL disconnected");
}
