import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import * as morgan from "morgan";
import router from "./Routes";
import passport from "passport";
import cors from "cors";
import { dbConnection } from "./config/database";
import path from "path";
import debug from "debug";
// import { authGoogle } from "./middlewares/authGoogle";
// import client, { shutdownPostHog } from "./helpers/postHog";
import { createProxyMiddleware } from "http-proxy-middleware";
import { initializeSocket } from "./Socket";
import processRouterSeeder from "./seeders/process";
import priceSeeder from "./seeders/prices";
import { MaintenanceCostSeeders } from "./seeders/maintenanceCost";
import { authGoogle } from "./middlewares/authGoogle";

const app: express.Application = express();
const server = http.createServer(app);

// app.use(
//   "/v-data-user",
//   createProxyMiddleware({
//     target: process.env.POSTHOG_HOST,
//     changeOrigin: true,
//     pathRewrite: {
//       "^/v-data-user": "",
//     },
//   }),
// );

app.use(express.json({ limit: "10mb" }));

const origin =
  process.env.NODE_ENV === "PROD"
    ? process.env.URL_FRONTEND_PROD
    : process.env.URL_FRONTEND_DEV;


app.use(
  cors({
    origin: origin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
  }),
);

app.use(morgan.default("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// app.use((req, res, next) => {
//   const distinctId = (req as any).user?._id || req.ip;
//   client.capture({
//     distinctId: distinctId,
//     event: "api_request",
//     properties: {
//       method: req.method,
//       path: req.path,
//       userAgent: req.get("user-agent"),
//     },
//   });
//   next();
// });

app.use("/api", router);

app.set("trust proxy", 1);

authGoogle();
app.use(passport.initialize());

const PORT = process.env.PORT || 5000;

dbConnection()
  .then(async () => {
    await processRouterSeeder();
    await priceSeeder();
    await MaintenanceCostSeeders();
    server.listen(PORT, async () => {
      const io = initializeSocket(server);
      app.set("socketio", io);
      console.log(`http://localhost:${PORT}`)
    });

    process.on("SIGTERM", async () => {
      // await shutdownPostHog();
      process.exit(0);
    });
  })
  .catch((err: any) => {
    console.error("Error", err);
  });