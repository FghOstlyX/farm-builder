import { InlineKeyboard, Keyboard } from "grammy";
import { config, miniAppUrl, webAppDirectLink } from "../config.js";

export function openFarmKeyboard(startParam?: string) {
  return new InlineKeyboard().webApp(
    "🚜 Перейти к ферме →",
    webAppDirectLink(startParam),
  );
}

export function launchFarmKeyboard(userId?: number) {
  const kb = new InlineKeyboard()
    .webApp("▶️ ЗАПУСТИТЬ ФЕРМУ", webAppDirectLink())
    .row()
    .text("📊 Ежедневный отчёт", "daily_report");
  if (userId) {
    kb.row().url("🔗 Поделиться фермой", miniAppUrl(`friend${userId}`));
  }
  return kb;
}

export function welcomeReplyKeyboard() {
  return new Keyboard()
    .webApp("🌾 Открыть ферму", webAppDirectLink())
    .resized();
}

export function shareLinkForUser(userId: number): string {
  return miniAppUrl(`friend${userId}`);
}
