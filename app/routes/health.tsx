import database from "app/config/database";
import { defineHandler, getLogger, json } from "plainstack";

export const GET = defineHandler(async () => {
  const log = getLogger("health");
  try {
    await database.selectFrom("users").selectAll().execute();
    return { status: "ok" };
  } catch (e) {
    log.error("health check failed", e);
    return json({ status: "degraded" }, { status: 500 });
  }
});
