import { Router } from "express";
import type { FarmRepository } from "../game/repository.js";
import { toSnapshot, GAME } from "../game/logic.js";
import { config } from "../config.js";
import { requireTelegramAuth, type AuthedRequest } from "./middleware.js";
import { shareLinkForUser } from "../telegram/keyboards.js";

export function createApiRouter(farms: FarmRepository): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "farm-builder" });
  });

  router.get("/me", requireTelegramAuth, (req: AuthedRequest, res) => {
    const userId = req.telegramUserId!;
    const referrerId = farms.parseReferrerFromStartParam(req.startParam);
    const row = farms.ensure(userId, {
      referrerId: referrerId && referrerId !== userId ? referrerId : undefined,
      referralBonus: config.referralBonusCoins,
    });

    res.json({
      userId,
      farm: toSnapshot(row),
      shareLink: shareLinkForUser(userId),
      referralBonus: config.referralBonusCoins,
      costs: {
        warehouse: GAME.warehouseCost,
        carrotGrowMs: GAME.carrotGrowMs,
      },
    });
  });

  router.post("/build/warehouse", requireTelegramAuth, (req: AuthedRequest, res) => {
    const result = farms.buildWarehouse(req.telegramUserId!);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ farm: toSnapshot(result.row) });
  });

  router.post("/plant/carrot", requireTelegramAuth, (req: AuthedRequest, res) => {
    const result = farms.plantCarrot(req.telegramUserId!);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      farm: toSnapshot(result.row),
      readyAt: Date.now() + GAME.carrotGrowMs,
    });
  });

  router.post("/harvest", requireTelegramAuth, (req: AuthedRequest, res) => {
    const result = farms.harvest(req.telegramUserId!);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ farm: toSnapshot(result.row), reward: result.reward });
  });

  return router;
}
