import database from "app/config/database";
import errorHandler from "errorhandler";
import express from "express";
import { defineHttp, dev, middleware, prod } from "plainstack";

export default defineHttp(async ({ http, paths }) => {
  const app = express();
  app.use(middleware.id());
  app.use(errorHandler());
  app.use(middleware.logging());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(middleware.database({ database }));
  app.use(middleware.loadConfig());
  if (dev()) app.use(http.staticPath, express.static(paths.out));
  if (prod()) app.use(middleware.forceWWW());
  if (prod()) app.use(middleware.rateLimit());
  app.use(await middleware.fileRouter());
  app.listen(http.port);
  return app;
});
