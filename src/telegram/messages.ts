import type { FarmSnapshot } from "../game/logic.js";
import { shareLinkForUser } from "./keyboards.js";

export const WELCOME_CAPTION =
  "Строй ферму, выращивай урожай, продавай на рынке.\n\n" +
  "Открой Mini App: посади культуру, собери урожай на склад, развивай хозяйство.";

export function balanceText(snapshot: FarmSnapshot): string {
  const plot = plotLabel(snapshot);
  const stock = Object.entries(snapshot.inventory)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}×${n}`)
    .join(", ");
  return (
    `💰 *${snapshot.coins}* монет\n` +
    `🏚 Склад: ${snapshot.hasWarehouse ? "есть" : "нет"}\n` +
    `🌱 Грядка: ${plot}\n` +
    (stock ? `📦 Запасы: ${stock}` : "📦 Запасы: пусто")
  );
}

function plotLabel(s: FarmSnapshot): string {
  const p = s.plot;
  if (p.status === "empty") return "пусто";
  if (p.status === "growing") {
    return `${p.emoji ?? ""} ${p.cropName} (${Math.ceil(p.growRemainingMs / 1000)}с)`;
  }
  return `${p.emoji ?? ""} ${p.cropName} — созрело!`;
}

export function dailyReport(snapshot: FarmSnapshot): string {
  return (
    `📊 *Ежедневный отчёт*\n` +
    `Собрано сегодня: ${snapshot.harvestedToday} урожаев\n` +
    `💰 Баланс: ${snapshot.coins} монет`
  );
}

export function harvestReadyText(): string {
  return "🌾 *Урожай готов!* Зайди на ферму и собери урожай.";
}

export function shareHint(userId: number): string {
  return (
    `Пригласи друга — стартовый бонус:\n` +
    `\`${shareLinkForUser(userId)}\``
  );
}
