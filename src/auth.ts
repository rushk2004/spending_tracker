import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { isGoogleConfigured, isTwitterConfigured } from "@/lib/oauth";

async function ensureDefaultCategories(userId: string) {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return;
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: true,
    })),
  });
}

async function upsertOAuthUser(params: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  providerAccountId: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  type: string;
}) {
  const email = params.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: params.name || email.split("@")[0],
        image: params.image || null,
      },
    });
    await ensureDefaultCategories(user.id);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name || params.name || undefined,
        image: user.image || params.image || undefined,
      },
    });
  }

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
    },
    create: {
      userId: user.id,
      type: params.type,
      provider: params.provider,
      providerAccountId: params.providerAccountId,
      access_token: params.access_token || null,
      refresh_token: params.refresh_token || null,
      expires_at: params.expires_at ?? null,
      token_type: params.token_type || null,
      scope: params.scope || null,
      id_token: params.id_token || null,
    },
    update: {
      userId: user.id,
      access_token: params.access_token || null,
      refresh_token: params.refresh_token || null,
      expires_at: params.expires_at ?? null,
      token_type: params.token_type || null,
      scope: params.scope || null,
      id_token: params.id_token || null,
    },
  });

  return user;
}

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || "").toLowerCase();
      const password = String(credentials?.password || "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (isGoogleConfigured()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (isTwitterConfigured()) {
  providers.push(
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID || process.env.AUTH_TWITTER_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET || process.env.AUTH_TWITTER_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return false;
      if (account.provider === "credentials") return true;

      const email =
        user.email ||
        (profile && "email" in profile ? String((profile as { email?: string }).email || "") : "");
      if (!email) {
        return "/login?error=OAuthEmailMissing";
      }

      const dbUser = await upsertOAuthUser({
        email,
        name: user.name,
        image: user.image,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        type: account.type,
      });
      user.id = dbUser.id;
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.userId = user.id;
      } else if (account && account.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
