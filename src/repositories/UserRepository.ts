import { User } from "@/models/User";
import { db } from "../database/connection";
import { eq } from "drizzle-orm";
import { users } from "@/database/schema/users";

type InsertResult = {
  insertId: number;
  affectedRows: number;
};

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0 ? (result[0] as User) : null;
  }

  async create(data: Omit<User, "id">): Promise<User> {
    const result = (await db
      .insert(users)
      .values(data)) as unknown as InsertResult;

    if (!result.insertId) {
      throw new Error("Insert failed. No insertId returned.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, result.insertId))
      .limit(1);

    if (user.length === 0) {
      throw new Error("User inserted but not found.");
    }

    return user[0] as User;
  }
}
