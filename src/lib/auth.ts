import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { DEFAULT_CATEGORIES } from "./categories";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createUser(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    if (existing.passwordHash) {
      throw new Error("An account with this email already exists");
    }
    // OAuth-only user: attach password so they can also use email login
    const passwordHash = await hashPassword(password);
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        name: name || existing.name || email.split("@")[0],
      },
    });
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name: name || email.split("@")[0],
      categories: {
        create: DEFAULT_CATEGORIES.map((c) => ({
          name: c.name,
          icon: c.icon,
          color: c.color,
          isDefault: true,
        })),
      },
    },
  });
  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return user;
}
