/**
 * Optional CLI seed — primarily categories are created on user registration.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("No global seed data required.");
  console.log("Default categories are created automatically when a user registers.");
  console.log("Use the in-app “Load demo data” button for sample accounts/transactions.");
  const users = await prisma.user.count();
  console.log(`Users in database: ${users}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
