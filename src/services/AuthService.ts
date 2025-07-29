import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors/AppError";
import { UserRepository } from "@/repositories/UserRepository";
import { User } from "@/models/User";
import { AuthResponse } from "@/types/common";

interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const { password: _, ...safeUser } = user;

    const token = this.generateToken(user);

    return { token, user: safeUser as User };
  }

  async register({ name, email, password }: RegisterDTO): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userRepository.create({
      name,
      email,
      password: hashedPassword,
    });
  }

  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const secret = process.env.JWT_SECRET;
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1d").trim(); 

    if (!secret) {
      throw new AppError("JWT secret not configured", 500);
    }

    return jwt.sign(payload, secret, {
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"], 
    });
  }
}
