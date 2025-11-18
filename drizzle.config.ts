import type { Config } from 'drizzle-kit';
export default {
  schema: './src/database/schemas/*',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo', // <--- very important
} satisfies Config;