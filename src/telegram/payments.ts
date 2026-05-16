import type { Api } from "grammy";

/** Telegram Stars (XTR) — premium speed boost stub for MVP */
export async function sendSpeedBoostInvoice(
  api: Api,
  chatId: number,
): Promise<void> {
  await api.sendInvoice(
    chatId,
    "⚡ Ускорение роста",
    "Морковь созревает в 2 раза быстрее на 24 часа (подключите логику в payments.ts).",
    "speed_boost_24h",
    "XTR",
    [{ label: "Ускорение 24ч", amount: 25 }],
  );
}
