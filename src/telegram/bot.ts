import { Bot, GrammyError, HttpError } from "grammy";
import { config } from "../config.js";
import { sendSpeedBoostInvoice } from "./payments.js";
import type { FarmRepository } from "../game/repository.js";
import { toSnapshot } from "../game/logic.js";
import {
  launchFarmKeyboard,
  openFarmKeyboard,
  welcomeReplyKeyboard,
} from "./keyboards.js";
import {
  balanceText,
  dailyReport,
  harvestReadyText,
  WELCOME_CAPTION,
} from "./messages.js";

const BOT_COMMANDS = [
  { command: "start", description: "Начать / приветствие" },
  { command: "farm", description: "Открыть ферму" },
  { command: "balance", description: "Баланс монет" },
  { command: "harvest", description: "Собрать урожай удалённо" },
];

export function createBot(token: string, farms: FarmRepository): Bot {
  const bot = new Bot(token);

  bot.api.setMyCommands(BOT_COMMANDS).catch(console.error);

  bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const payload = ctx.match?.trim();
    const referrerId = payload
      ? farms.parseReferrerFromStartParam(
          payload.startsWith("friend") ? payload : `friend${payload}`,
        )
      : undefined;

    farms.ensure(userId, {
      referrerId: referrerId && referrerId !== userId ? referrerId : undefined,
      referralBonus: config.referralBonusCoins,
    });

    await ctx.replyWithPhoto(
      "https://picsum.photos/seed/farmbuilder/800/450",
      {
        caption: `🌾 *Farm Builder*\n\n${WELCOME_CAPTION}`,
        parse_mode: "Markdown",
        reply_markup: launchFarmKeyboard(userId),
      },
    );

    await ctx.reply("Или нажми кнопку ниже:", {
      reply_markup: welcomeReplyKeyboard(),
    });
  });

  bot.command("farm", async (ctx) => {
    await ctx.reply("Открой свою ферму:", {
      reply_markup: openFarmKeyboard(),
    });
  });

  bot.command("balance", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const row = farms.ensure(userId);
    await ctx.reply(balanceText(toSnapshot(row)), {
      parse_mode: "Markdown",
      reply_markup: openFarmKeyboard(),
    });
  });

  bot.command("harvest", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.replyWithChatAction("typing");
    await ctx.reply("🌾 Собираю урожай...");

    const result = farms.harvest(userId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        nothing_planted: "Грядка пуста — сначала посади морковь в Mini App.",
        not_ready: "Урожай ещё не созрел. Подожди немного!",
      };
      await ctx.reply(messages[result.error] ?? "Не удалось собрать урожай.", {
        reply_markup: openFarmKeyboard(),
      });
      return;
    }

    const snap = toSnapshot(result.row);
    await ctx.reply(
      `✅ В склад: +${result.amount} ${result.cropId}\n\n${balanceText(snap)}`,
      { parse_mode: "Markdown", reply_markup: openFarmKeyboard() },
    );
  });

  bot.callbackQuery("build_warehouse", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("typing");

    const statusMsg = await ctx.reply("🏗 Строю склад...");

    await new Promise((r) => setTimeout(r, 800));

    const result = farms.buildWarehouse(userId);
    if (!result.ok) {
      const text =
        result.error === "warehouse_exists"
          ? "Склад уже построен."
          : "Недостаточно монет для склада (нужно 50).";
      await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, text, {
        reply_markup: openFarmKeyboard(),
      });
      return;
    }

    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      "✅ Склад построен! Теперь урожай приносит больше монет.",
      { reply_markup: openFarmKeyboard() },
    );
  });

  bot.callbackQuery("buy_speed_boost", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    await ctx.answerCallbackQuery();
    await sendSpeedBoostInvoice(bot.api, chatId);
  });

  bot.callbackQuery("daily_report", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    const row = farms.ensure(userId);
    await ctx.reply(dailyReport(toSnapshot(row)), {
      parse_mode: "Markdown",
      reply_markup: launchFarmKeyboard(),
    });
  });

  bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));

  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply(
      `⭐ Спасибо за покупку «${payment.invoice_payload}»!\n` +
        "Премиум-функции подключите в `src/telegram/payments.ts`.",
      { reply_markup: openFarmKeyboard() },
    );
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Bot error on update ${ctx.update.update_id}:`, err.error);
    if (err.error instanceof GrammyError) {
      console.error("GrammyError:", err.error.description);
    } else if (err.error instanceof HttpError) {
      console.error("HttpError:", err.error);
    }
  });

  return bot;
}

/** Notify user that crop is ready (call from scheduler or after plant) */
export async function notifyHarvestReady(
  bot: Bot,
  chatId: number,
): Promise<void> {
  await bot.api.sendMessage(chatId, harvestReadyText(), {
    parse_mode: "Markdown",
    reply_markup: openFarmKeyboard(),
  });
}

