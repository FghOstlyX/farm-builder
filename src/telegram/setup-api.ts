import { config } from "../config.js";

export async function setupTelegramBot(): Promise<void> {
  const token = config.botToken;
  const miniappUrl = `${config.webappUrl}/miniapp`;
  const webhookUrl = `${config.webappUrl}/webhook/${config.webhookSecret}`;

  async function api(method: string, body?: Record<string, unknown>) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      throw new Error(`${method}: ${data.description ?? "failed"}`);
    }
  }

  await api("setMyCommands", {
    commands: [
      { command: "start", description: "Начать / приветствие" },
      { command: "farm", description: "Открыть ферму" },
      { command: "balance", description: "Баланс монет" },
      { command: "harvest", description: "Собрать урожай удалённо" },
    ],
  });

  await api("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "🌾 Открыть ферму",
      web_app: { url: miniappUrl },
    },
  });

  await api("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query", "pre_checkout_query"],
    drop_pending_updates: true,
  });

  console.log(`Telegram setup OK → ${miniappUrl}`);
}
