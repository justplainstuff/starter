import { defineSeed } from "plainstack";

export default defineSeed(async (db) => {
  await db
    .insertInto("users")
    .values({
      id: "usr_123",
      email: "user@example.com",
      createdAt: Date.now(),
    })
    .execute();
});
