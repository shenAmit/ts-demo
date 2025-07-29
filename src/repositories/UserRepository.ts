import { User } from "@/models/User";
import { db } from "../database/connection";
import { eq } from "drizzle-orm";
import { users } from "@/database/schema/users";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0 ? (result[0] as User) : null;
  }

  async create(data: Omit<User, "id">) {
    const result: any = await db.insert(users).values(data);

    const insertId: number = result.insertId ?? result[0]?.insertId;

    if (!insertId) {
      throw new Error("Insert failed. No insertId returned.");
    }
  }
}
