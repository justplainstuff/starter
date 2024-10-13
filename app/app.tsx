import { parseWithZod } from "@conform-to/zod";
import { conformValidator } from "@hono/conform-validator";
import { googleAuth } from "@hono/oauth-providers/google";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { jsxRenderer } from "hono/jsx-renderer";
import { logger } from "hono/logger";
import {
  type DB,
  Toast,
  cacheFormData,
  error,
  protect,
  signin,
  store,
} from "plainstack";
import { secret, sqlite } from "plainstack/bun";
import { session } from "plainstack/session";
import { z } from "zod";

/** env */

const env = z
  .object({
    AUTH_SECRET: z.string().default(await secret("AUTH_SECRET")),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
  })
  .parse(process.env);

/** database */

const { database, migrate } = sqlite<DB>();

await migrate(
  ({ schema }) =>
    schema
      .createTable("items")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("content", "text", (col) => col.notNull())
      .addColumn("created_at", "integer", (col) => col.notNull())
      .execute(),
  ({ schema }) =>
    schema
      .createTable("users")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("email", "text")
      .addColumn("email_verified", "boolean", (col) =>
        col.notNull().defaultTo(false),
      )
      .addColumn("name", "text")
      .addColumn("picture", "text")
      .addColumn("created_at", "integer", (col) => col.notNull())
      .execute(),
);

const entities = await store(database);

const app = new Hono();

function form<T>(schema: z.ZodSchema<T> | Promise<z.ZodSchema<T>>) {
  return conformValidator(async (formData) =>
    parseWithZod(formData, { schema: await schema }),
  );
}

/** middleware */

app.use(logger());
app.use(session({ encryptionKey: await secret() }));
app.get(
  "/google",
  googleAuth({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    scope: ["openid", "email", "profile"],
  }),
  async (c) => {
    const googleUser = c.get("user-google");
    if (googleUser) {
      const found =
        (await entities("users").get({ id: googleUser.id })) ??
        (await entities("users").create({
          id: googleUser.id,
          email: googleUser.email,
          emailVerified: googleUser.verified_email ? 1 : 0,
          name: googleUser.name,
          picture: googleUser.picture,
        }));
      c.get("session").set("user-id", found.id);
      return c.redirect("/app");
    }
    return c.redirect("/signin");
  },
);
app.use("/static/*", serveStatic({ root: "./" }));
app.use(cacheFormData());
app.onError(error());

const auth = protect({
  signinPath: "/signin",
  getUser: (id) => entities("users").get({ id }),
});

/** layout */

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
        <body>{children}</body>
      </html>
    );
  }),
);

app.get(
  "/app/*",
  auth,
  jsxRenderer(({ children, Layout }, c) => {
    const user = c.get("user");
    const toast = c.get("session").get("toast");
    return (
      <Layout>
        <div class="navbar bg-base-200">
          <div class="flex-1">
            <a class="btn btn-ghost text-xl" href="/">
              Your App
            </a>
          </div>
          <div class="flex-none gap-2">
            <div class="dropdown dropdown-end">
              <button
                tabindex={0}
                type="submit"
                class="btn btn-ghost btn-circle avatar"
              >
                <div class="w-10 rounded-full">
                  <img
                    alt="Profile"
                    src={
                      user.picture ??
                      "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                    }
                  />
                </div>
              </button>
              <ul
                tabindex={0}
                class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-32 p-2 shadow"
              >
                <li>
                  <a href="/app/settings">Settings</a>
                </li>
                <li>
                  <a href="/signout">Logout</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <main class="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 pb-12">
          {children}
          <Toast toast={toast} />
        </main>
      </Layout>
    );
  }),
);

/** routes */

app.get("/", async (c) => {
  return c.render(
    <div class="hero min-h-screen bg-base-200">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">Welcome to Plainstack</h1>
          <p class="py-6">Sign in below to get started.</p>
          <a href="/signin" class="btn btn-primary">
            Login
          </a>
        </div>
      </div>
    </div>,
  );
});

app.get(
  "/signin",
  signin({
    getUser: (id) => entities("users").get({ id }),
    protectedPath: "/app",
  }),
  async (c) => {
    return c.render(
      <div class="min-h-screen flex items-center justify-center bg-base-200">
        <div class="max-w-md w-full space-y-8">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold">
              Sign in to Your App
            </h2>
          </div>
          <div class="mt-8 space-y-6">
            <div>
              <a
                href="/google"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      </div>,
    );
  },
);

app.get("/app", auth, async (c) => {
  const user = c.get("user");
  return c.render(
    <div class="mt-12">
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight text-center">
        Hi {user.name} 👋
      </h1>
    </div>,
  );
});

app.get("/app/settings", auth, async (c) => {
  const user = c.get("user");
  return c.render(
    <div class="mt-12">
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight">Settings</h1>
      <form method="post" action="/app/settings" class="mt-24">
        <label class="form-control w-full max-w-xs">
          <div class="label">
            <span class="label-text">Name</span>
          </div>
          <input
            type="text"
            name="name"
            value={user.name ?? ""}
            placeholder="Type here"
            class="input input-bordered w-full max-w-xs"
          />
        </label>
        <button class="btn btn-primary mt-4" type="submit">
          Update
        </button>
      </form>
    </div>,
  );
});

app.post(
  "/app/settings",
  auth,
  form(z.object({ name: z.string() })),
  async (c) => {
    const user = c.get("user");
    const name = c.req.valid("form").value.name;
    await entities("users").update({ ...user, name });
    c.var.session.flash("toast", "Settings saved");
    return c.redirect("/app/settings");
  },
);

app.get("/signout", auth, async (c) => {
  c.get("session")?.deleteSession();
  return c.redirect("/");
});

export default app;
