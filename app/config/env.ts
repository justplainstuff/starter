import { defineEnv } from "plainstack";

export default defineEnv((z) =>
  z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number().optional(),
    DB_URL: z.string(),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).optional(),
    SMTP_HOST: z.string(),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
  }),
);
