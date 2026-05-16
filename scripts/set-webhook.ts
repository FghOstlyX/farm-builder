import "dotenv/config";

const token = process.env.BOT_TOKEN;
const baseUrl = process.env.WEBAPP_URL?.replace(/\/$/, "");
const secret = process.env.WEBHOOK_SECRET;

if (!token || !baseUrl || !secret) {
  console.error("Set BOT_TOKEN, WEBAPP_URL, WEBHOOK_SECRET in .env");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/webhook/${secret}`;

const res = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: [
        "message",
        "callback_query",
        "pre_checkout_query",
      ],
      drop_pending_updates: true,
    }),
  },
);

const data = await res.json();
console.log(JSON.stringify(data, null, 2));

if (!data.ok) process.exit(1);
console.log(`Webhook set: ${webhookUrl}`);
