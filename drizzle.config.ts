// drizzle.config.ts - UPDATED CODE

import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'; // Loads environment variables from .env file

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Tells Drizzle to use the URL from your .env
  },
});