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
import seedUsers from "./seeders/userClients";
import MaintenanceBanks from "./seeders/banksAccounts";
import seedFutureCounters from "./seeders/counterYear";
import { config } from "./config/env";

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

app.use(
  cors({
    origin(requestOrigin, callback) {
      if (!requestOrigin || config.corsOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
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

app.set("trust proxy", 1);

authGoogle();
app.use(passport.initialize());

app.use("/api", router);

dbConnection()
  .then(async () => {
    if (config.runSeedersOnStart) {
      await processRouterSeeder();
      await priceSeeder();
      await MaintenanceCostSeeders();
      await seedUsers();
      await MaintenanceBanks();
      await seedFutureCounters();
    }

    server.listen(config.port, async () => {
      const io = initializeSocket(server);
      app.set("socketio", io);
      console.log(`http://localhost:${config.port}`);
    });

    process.on("SIGTERM", async () => {
      // await shutdownPostHog();
      server.close(() => process.exit(0));
    });
  })
  .catch((err: any) => {
    console.error("Error", err);
  });
