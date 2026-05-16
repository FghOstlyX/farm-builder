import express from "express";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { webhookCallback } from "grammy";
import { assertConfig, config } from "./config.js";
import { openStore } from "./db/store.js";
import { FarmRepository } from "./game/repository.js";
import { createBot } from "./telegram/bot.js";
import { createApiRouter } from "./api/routes.js";
import { startHarvestNotifier } from "./jobs/harvest-notify.js";
import { setupTelegramBot } from "./telegram/setup-api.js";

assertConfig();

const __dirname = dirname(fileURLToPath(import.meta.url));
const miniappDist = join(__dirname, "..", "miniapp", "dist");

const store = openStore(config.databasePath.replace(/\.db$/, ".json"));
const farms = new FarmRepository(store);
const bot = createBot(config.botToken, farms);

const app = express();
app.use(express.json());

app.use(
  `/webhook/${config.webhookSecret}`,
  webhookCallback(bot, "express"),
);

app.use("/api", createApiRouter(farms));

app.use("/miniapp", express.static(miniappDist));
app.get("/miniapp", (_req, res) => {
  res.sendFile(join(miniappDist, "index.html"));
});

app.get("/", (_req, res) => {
  res.json({
    name: "Farm Builder",
    health: "/api/health",
    miniapp: "/miniapp",
    webhook: `/webhook/${config.webhookSecret}`,
  });
});

startHarvestNotifier(bot, store);

async function boot(): Promise<void> {
  if (process.env.AUTO_SETUP_TELEGRAM === "true") {
    try {
      await setupTelegramBot();
    } catch (err) {
      console.error("AUTO_SETUP_TELEGRAM failed:", err);
    }
  }

  app.listen(config.port, () => {
    console.log(`Farm Builder listening on :${config.port}`);
    console.log(`Mini App: ${config.webappUrl}/miniapp`);
    console.log(`Webhook: ${config.webappUrl}/webhook/${config.webhookSecret}`);
  });
}

void boot();
