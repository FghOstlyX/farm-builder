import type { FarmSnapshot } from "../game/logic.js";
import { shareLinkForUser } from "./keyboards.js";

export const WELCOME_CAPTION =
  "Строй ферму, выращивай урожай, зарабатывай монеты.\n\n" +
  "Построй склад, посади морковь — через 30 секунд собери урожай и получи первые монеты.";

export function balanceText(snapshot: FarmSnapshot): string {
  return (
    `💰 Баланс: *${snapshot.coins}* монет\n` +
    `🏚 Склад: ${snapshot.hasWarehouse ? "построен" : "нет"}\n` +
    `🥕 Урожай: ${cropStatusLabel(snapshot)}`
  );
}

function cropStatusLabel(s: FarmSnapshot): string {
  switch (s.cropStatus) {
    case "empty":
      return "грядка пуста";
    case "growing":
      return `растёт (${Math.ceil(s.growRemainingMs / 1000)} сек)`;
    case "ready":
      return "готов к сбору!";
  }
}

export function dailyReport(snapshot: FarmSnapshot, harvestedCoins: number): string {
  return (
    `📊 *Ежедневный отчёт*\n` +
    `Сегодня собрано: ${snapshot.carrotsHarvestedToday} морковок\n` +
    `Заработано: ${harvestedCoins} монет`
  );
}

export function harvestReadyText(): string {
  return "🥕 *Урожай готов!* Морковь созрела — собери урожай на ферме.";
}

export function shareHint(userId: number): string {
  return (
    `Пригласи друга — он получит стартовый бонус:\n` +
    `\`${shareLinkForUser(userId)}\``
  );
}
