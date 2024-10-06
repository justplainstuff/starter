import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { jsxRenderer } from "hono/jsx-renderer";
import { logger } from "hono/logger";
import { type DB, form, store } from "plainstack";
import { secret, sqlite } from "plainstack/bun";
import { session } from "plainstack/session";

const { database, migrate } = sqlite<DB>();

await migrate(({ schema }) => {
  return schema
    .createTable("items")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .execute();
});

const entities = await store(database);

const app = new Hono();

app.use(logger());
app.use(session({ encryptionKey: await secret() }));
app.use("/static/*", serveStatic({ root: "./" }));

app.get(
  "*",
  jsxRenderer(({ children }) => {
    return (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light dark" />
          <link rel="stylesheet" href="/static/styles.css" />
          <title>So many todos</title>
        </head>
        <body>
          <main class="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 pb-12">
            <h1>{children}</h1>
          </main>
        </body>
      </html>
    );
  }),
);

app.get("/", async (c) => {
  const info = c.var.session.get("info");
  const items = await entities("items").all();
  return c.render(
    <div class="mt-12">
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight text-center">
        Todos
      </h1>
      {info && (
        <div role="alert" class="alert alert-success mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <title>Checkmark</title>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{info}</span>
        </div>
      )}
      <ul class="mt-20">
        {items.map((item) => (
          <li key={item.id}>
            <div class="bg-neutral shadow-xl rounded-lg mb-2">
              <div class="card-body">
                <h2 class="card-title">{item.content}</h2>
                <div class="card-actions justify-end">
                  <form
                    style={{ display: "inline" }}
                    method="post"
                    action={`/delete/${item.id}`}
                  >
                    <button class="btn btn-error" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form class="mt-8" method="post" action="/add">
        <div class="join w-full">
          <input
            type="text"
            name="content"
            placeholder="Enter todo here"
            class="input join-item nput-bordered input-primary w-full"
            required
          />
          <button class="btn btn-primary join-item" type="submit">
            Add
          </button>
        </div>
      </form>
    </div>,
  );
});

app.post("/add", form(entities("items").zod), async (c) => {
  const submission = c.req.valid("form");
  const data = submission.value;
  await entities("items").create(data);
  c.var.session.flash("info", "Item added");
  return c.redirect("/");
});

app.post("/delete/:id", async (c) => {
  await entities("items").delete(c.req.param("id"));
  c.var.session.flash("info", "Item deleted");
  return c.redirect("/");
});

export default app;
