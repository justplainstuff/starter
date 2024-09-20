import database from "app/config/database";
import { defineHandler, json } from "plainstack";

export const GET = defineHandler(async () => {
  try {
    await database.selectFrom("users").executeTakeFirstOrThrow();
    return { status: "ok" };
  } catch (e) {
    return json({ status: "degraded" }, { status: 500 });
  }
});
