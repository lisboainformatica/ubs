import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/agendamento_psf?schema=public",
  },
});
