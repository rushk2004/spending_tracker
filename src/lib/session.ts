import { auth } from "@/auth";

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
  image?: string;
  isLoggedIn: boolean;
}

export async function getSession(): Promise<SessionData> {
  const session = await auth();
  if (!session?.user?.id) {
    return { isLoggedIn: false };
  }
  return {
    userId: session.user.id,
    email: session.user.email || undefined,
    name: session.user.name || undefined,
    image: session.user.image || undefined,
    isLoggedIn: true,
  };
}

export async function requireUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  return session;
}
