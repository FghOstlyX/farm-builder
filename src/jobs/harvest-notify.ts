import type { Bot } from "grammy";
import type { JsonStore } from "../db/store.js";
import { FarmRepository } from "../game/repository.js";
import { notifyHarvestReady } from "../telegram/bot.js";

const notified = new Set<string>();

export function startHarvestNotifier(bot: Bot, store: JsonStore): void {
  const farms = new FarmRepository(store);
  const intervalMs = 15_000;

  setInterval(() => {
    for (const { user_id, planted_at } of store.listGrowingFarms()) {
      const row = farms.get(user_id);
      if (!row || !farms.isReadyForNotify(row)) continue;

      const key = `${user_id}:${planted_at}`;
      if (notified.has(key)) continue;
      notified.add(key);

      notifyHarvestReady(bot, user_id).catch((err) => {
        console.warn(`Harvest notify failed for ${user_id}:`, err);
        notified.delete(key);
      });
    }

    if (notified.size > 10_000) notified.clear();
  }, intervalMs);
}
