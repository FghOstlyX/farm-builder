import type { Request, Response, NextFunction } from "express";
import { validateInitData } from "../telegram/init-data.js";
import { config } from "../config.js";

export interface AuthedRequest extends Request {
  telegramUserId?: number;
  startParam?: string;
}

export function requireTelegramAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers["x-telegram-init-data"];
  const initData =
    (typeof header === "string" ? header : Array.isArray(header) ? header[0] : undefined) ??
    (typeof req.body?.initData === "string" ? req.body.initData : undefined);

  if (typeof initData !== "string" || !initData) {
    res.status(401).json({ error: "missing_init_data" });
    return;
  }

  const validated = validateInitData(initData, config.botToken);
  if (!validated) {
    res.status(401).json({ error: "invalid_init_data" });
    return;
  }

  req.telegramUserId = validated.user.id;
  req.startParam = validated.startParam;
  next();
}
