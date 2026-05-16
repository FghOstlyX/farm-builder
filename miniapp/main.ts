import "./styles.css";
import {
  fetchMe,
  buildWarehouse,
  plantCarrot,
  harvest,
  type FarmSnapshot,
  type MeResponse,
} from "./api";
import { FarmCanvas } from "./farm-canvas";

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string };
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback?: { impactOccurred: (style: string) => void };
  showAlert: (msg: string) => void;
  openTelegramLink: (url: string) => void;
}

const tg = window.Telegram?.WebApp;
if (!tg?.initData) {
  document.body.innerHTML =
    "<p style='padding:24px'>Откройте через Telegram Mini App</p>";
  throw new Error("Not in Telegram WebApp");
}

tg.ready();
tg.expand();

const defaultFarm: FarmSnapshot = {
  coins: 0,
  hasWarehouse: false,
  cropStatus: "empty",
  cropProgress: 0,
  carrotsHarvestedToday: 0,
  growRemainingMs: 0,
};

let me: MeResponse | null = null;
let farm: FarmSnapshot = { ...defaultFarm };

const coinsEl = document.getElementById("coins")!;
const statusEl = document.getElementById("status")!;
const canvas = document.getElementById("farm") as HTMLCanvasElement;

function applyTheme(): void {
  const p = tg.themeParams;
  if (p.bg_color) document.documentElement.style.setProperty("--tg-bg", p.bg_color);
  if (p.text_color) document.documentElement.style.setProperty("--tg-text", p.text_color);
  if (p.button_color) document.documentElement.style.setProperty("--tg-button", p.button_color);
}

function renderHud(): void {
  coinsEl.textContent = `💰 ${farm.coins}`;
  const labels: Record<FarmSnapshot["cropStatus"], string> = {
    empty: "Посади морковь",
    growing: `Растёт ${Math.ceil(farm.growRemainingMs / 1000)}с`,
    ready: "Урожай готов!",
  };
  statusEl.textContent = labels[farm.cropStatus];
}

function updateMainButton(): void {
  const btn = tg.MainButton;
  let text = "Начать строительство";
  let action: () => Promise<void> = handlePlant;

  if (!farm.hasWarehouse && farm.coins >= 50) {
    text = "Построить склад (50)";
    action = handleWarehouse;
  } else if (farm.cropStatus === "ready") {
    text = "Собрать урожай";
    action = handleHarvest;
  } else if (farm.cropStatus === "empty") {
    text = "Посадить морковь";
    action = handlePlant;
  } else if (farm.cropStatus === "growing") {
    text = "Ждём урожай...";
    action = async () => tg.showAlert("Морковь ещё растёт (~30 сек)");
  }

  btn.offClick(mainButtonHandler);
  mainButtonHandler = async () => {
    btn.showProgress();
    try {
      await action();
      tg.HapticFeedback?.impactOccurred("medium");
    } catch (e) {
      tg.showAlert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      btn.hideProgress();
    }
  };
  btn.onClick(mainButtonHandler);
  btn.text = text;
  btn.show();
}

let mainButtonHandler = async (): Promise<void> => {};

async function refresh(): Promise<void> {
  me = await fetchMe(tg.initData);
  farm = me.farm;
  renderHud();
  updateMainButton();
}

async function bootstrap(): Promise<void> {
  statusEl.textContent = "Загрузка...";
  try {
    await refresh();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки";
    statusEl.textContent = msg;
    tg.showAlert(`${msg}\n\nПроверьте, что сервер запущен и URL Mini App в BotFather актуален.`);
    tg.MainButton.text = "Повторить";
    tg.MainButton.show();
    tg.MainButton.onClick(() => void bootstrap());
  }
}

async function handleWarehouse(): Promise<void> {
  const res = await buildWarehouse(tg.initData);
  farm = res.farm;
  renderHud();
  updateMainButton();
  tg.showAlert("Склад построен!");
}

async function handlePlant(): Promise<void> {
  const res = await plantCarrot(tg.initData);
  farm = res.farm;
  renderHud();
  updateMainButton();
  scheduleReadyPoll();
}

async function handleHarvest(): Promise<void> {
  const res = await harvest(tg.initData);
  farm = res.farm;
  renderHud();
  updateMainButton();
  tg.showAlert(`+${res.reward} монет!`);
}

function scheduleReadyPoll(): void {
  const tick = async () => {
    if (farm.cropStatus === "ready") {
      updateMainButton();
      return;
    }
    const prev = farm.cropStatus;
    try {
      await refresh();
    } catch {
      return;
    }
    if (farm.cropStatus !== prev) updateMainButton();
    if (farm.cropStatus === "growing") setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);
}

applyTheme();
new FarmCanvas(canvas, () => farm);

window.addEventListener("farm:plot", () => {
  if (!me) return;
  if (farm.cropStatus === "ready") void handleHarvest();
  else void handlePlant();
});

window.addEventListener("farm:warehouse", () => {
  if (!me) return;
  if (!farm.hasWarehouse) void handleWarehouse();
});

void bootstrap();
