import Html from "@kitajs/html";
import { asset } from "plainstack";

export default function RootLayout(
  props: Html.PropsWithChildren<{
    head?: string | Promise<string>;
    description?: string;
    title?: string;
  }>,
) {
  return (
    <>
      {"<!doctype html>"}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>{props.title ?? "Title"}</title>
          <meta
            name="description"
            content={props.description || "Description"}
          />
          <link rel="stylesheet" href={asset("styles.css")} />
          <link rel="icon" type="image/x-icon" href={asset("favicon.ico")} />
          <script defer src={asset("scripts.ts")} />
          {props.head ? Html.escapeHtml(props.head) : null}
        </head>
        <body>{props.children}</body>
      </html>
    </>
  );
}
