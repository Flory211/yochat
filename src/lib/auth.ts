import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET || 'yochat-secret-key-change-in-production');

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'teacher' | 'student';
  is_banned: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: User): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as User;
  } catch {
    return null;
  }
}
