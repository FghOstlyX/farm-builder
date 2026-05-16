import "./styles.css";
import {
  fetchMe,
  selectCrop,
  buildWarehouse,
  plant,
  harvest,
  unlockCrop,
  sellCrop,
  type MeResponse,
  type ShopCropView,
} from "./api";

interface TelegramWebApp {
  initData: string;
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leave?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback?: { impactOccurred: (s: string) => void };
  showAlert: (msg: string) => void;
}

const tg = window.Telegram?.WebApp as TelegramWebApp | undefined;
if (!tg?.initData) {
  document.body.innerHTML =
    "<p style='padding:24px;text-align:center'>Откройте приложение через Telegram</p>";
  throw new Error("no telegram");
}

tg.ready();
tg.expand();

let state: MeResponse | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const loader = document.getElementById("loader")!;
const loaderHint = document.getElementById("loader-hint")!;
const shell = document.getElementById("shell")!;
const coinsEl = document.getElementById("coins")!;
const plotEmoji = document.getElementById("plot-emoji")!;
const plotTitle = document.getElementById("plot-title")!;
const plotSub = document.getElementById("plot-sub")!;
const plotProgress = document.getElementById("plot-progress")!;
const farmHint = document.getElementById("farm-hint")!;
const warehouseCard = document.getElementById("warehouse-card")!;
const warehouseLabel = document.getElementById("warehouse-label")!;
const cropList = document.getElementById("crop-list")!;
const stockList = document.getElementById("stock-list")!;
const shopList = document.getElementById("shop-list")!;

function applyTheme(): void {
  const p = tg.themeParams;
  if (p.bg_color) document.documentElement.style.setProperty("--bg", p.bg_color);
  if (p.text_color) document.documentElement.style.setProperty("--text", p.text_color);
  if (p.button_color) document.documentElement.style.setProperty("--accent", p.button_color);
}

function setState(data: MeResponse): void {
  state = data;
  renderAll();
  schedulePoll();
}

async function runAction(fn: () => Promise<MeResponse>): Promise<void> {
  tg.MainButton.showProgress();
  try {
    setState(await fn());
    tg.HapticFeedback?.impactOccurred("light");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    tg.showAlert(msg);
  } finally {
    tg.MainButton.hideProgress();
    syncMainButton();
  }
}

function renderAll(): void {
  if (!state) return;
  const f = state.farm;
  coinsEl.textContent = `💰 ${f.coins}`;

  const p = f.plot;
  if (p.status === "empty") {
    const sel = state.shop.find((c) => c.id === f.selectedCrop);
    plotEmoji.textContent = sel?.emoji ?? "🌱";
    plotTitle.textContent = "Грядка свободна";
    plotSub.textContent = sel ? `Выбрано: ${sel.name}` : "Выберите культуру в «Сад»";
    plotProgress.style.width = "0%";
  } else {
    plotEmoji.textContent = p.emoji ?? "🌱";
    plotTitle.textContent = p.cropName ?? "Урожай";
    plotSub.textContent =
      p.status === "growing"
        ? `Растёт · ${Math.ceil(p.growRemainingMs / 1000)} сек`
        : "Готово к сбору!";
    plotProgress.style.width = `${Math.round(p.progress * 100)}%`;
  }

  warehouseCard.classList.toggle("built", f.hasWarehouse);
  warehouseLabel.textContent = f.hasWarehouse ? "Склад ✓" : "Построить";

  renderGarden();
  renderWarehouse();
  renderShop();
  syncMainButton();
}

function renderGarden(): void {
  if (!state) return;
  cropList.innerHTML = "";
  for (const crop of state.shop) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "crop-card";
    if (crop.id === state.farm.selectedCrop) btn.classList.add("selected");
    if (!crop.unlocked) btn.classList.add("locked");
    btn.innerHTML = `
      <span class="emoji">${crop.emoji}</span>
      <span class="meta">
        <span class="name">${crop.name}</span>
        <span class="desc">${crop.unlocked ? `Рост ${crop.growSec}с · семена ${crop.seedPrice}🪙` : `🔒 Разблокировать в «Рынок» за ${crop.unlockPrice}🪙`}</span>
      </span>`;
    btn.disabled = !crop.unlocked;
    btn.onclick = () => void runAction(() => selectCrop(tg.initData, crop.id));
    cropList.appendChild(btn);
  }
}

function renderWarehouse(): void {
  if (!state) return;
  stockList.innerHTML = "";
  const entries = state.shop.filter((c) => (state!.farm.inventory[c.id] ?? 0) > 0);

  if (!state.farm.hasWarehouse) {
    stockList.innerHTML = `<div class="empty-state">Постройте склад на ферме, чтобы хранить урожай.</div>`;
    return;
  }

  if (entries.length === 0) {
    stockList.innerHTML = `<div class="empty-state">Склад пуст. Соберите урожай на грядке.</div>`;
    return;
  }

  for (const crop of entries) {
    const qty = state.farm.inventory[crop.id] ?? 0;
    const card = document.createElement("div");
    card.className = "crop-card";
    card.style.cursor = "default";
    card.innerHTML = `
      <span class="emoji">${crop.emoji}</span>
      <span class="meta">
        <span class="name">${crop.name}</span>
        <span class="desc">На складе: ${qty} шт · продажа ${crop.sellPrice}🪙/шт</span>
      </span>`;
    const row = document.createElement("div");
    row.className = "btn-row";
    const sell = document.createElement("button");
    sell.type = "button";
    sell.className = "btn btn-primary";
    sell.textContent = "Продать 1";
    sell.onclick = () => void runAction(() => sellCrop(tg.initData, crop.id, 1));
    row.appendChild(sell);
    card.appendChild(row);
    stockList.appendChild(card);
  }
}

function renderShop(): void {
  if (!state) return;
  shopList.innerHTML = "";
  for (const crop of state.shop) {
    const card = document.createElement("div");
    card.className = "crop-card";
    card.style.cursor = "default";
    card.innerHTML = `
      <span class="emoji">${crop.emoji}</span>
      <span class="meta">
        <span class="name">${crop.name}</span>
        <span class="desc">Семена ${crop.seedPrice}🪙 · продажа ${crop.sellPrice}🪙 · рост ${crop.growSec}с</span>
      </span>`;
    const row = document.createElement("div");
    row.className = "btn-row";

    if (!crop.unlocked) {
      const unlock = document.createElement("button");
      unlock.type = "button";
      unlock.className = "btn btn-primary";
      unlock.textContent = `Открыть · ${crop.unlockPrice}🪙`;
      unlock.onclick = () => void runAction(() => unlockCrop(tg.initData, crop.id));
      row.appendChild(unlock);
    } else if ((state.farm.inventory[crop.id] ?? 0) > 0) {
      const sell = document.createElement("button");
      sell.type = "button";
      sell.className = "btn btn-primary";
      sell.textContent = `Продать (${crop.inStock})`;
      sell.onclick = () => void runAction(() => sellCrop(tg.initData, crop.id, 1));
      row.appendChild(sell);
    } else {
      const hint = document.createElement("span");
      hint.className = "desc";
      hint.textContent = "Соберите урожай, чтобы продать";
      row.appendChild(hint);
    }

    card.appendChild(row);
    shopList.appendChild(card);
  }
}

function syncMainButton(): void {
  if (!state) {
    tg.MainButton.hide();
    return;
  }
  const f = state.farm;
  let text = "Посадить";
  let action: () => Promise<MeResponse> = () => plant(tg.initData);

  if (f.plot.status === "ready") {
    text = "Собрать урожай";
    action = () => harvest(tg.initData);
  } else if (f.plot.status === "growing") {
    text = `Растёт · ${Math.ceil(f.plot.growRemainingMs / 1000)}с`;
    action = async () => {
      throw new Error("Подождите созревания урожая");
    };
  } else if (!f.hasWarehouse) {
    text = "Построить склад (50🪙)";
    action = () => buildWarehouse(tg.initData);
  } else {
    const crop = state.shop.find((c) => c.id === f.selectedCrop);
    text = crop ? `Посадить ${crop.emoji} ${crop.name}` : "Выберите культуру";
    action = () => plant(tg.initData);
  }

  tg.MainButton.offClick(onMainClick);
  mainAction = action;
  tg.MainButton.onClick(onMainClick);
  tg.MainButton.text = text;
  tg.MainButton.show();
}

let mainAction: () => Promise<MeResponse> = () => plant(tg.initData);
function onMainClick(): void {
  void runAction(mainAction);
}

function schedulePoll(): void {
  if (pollTimer) clearTimeout(pollTimer);
  if (!state || state.farm.plot.status !== "growing") return;
  pollTimer = setTimeout(async () => {
    try {
      setState(await fetchMe(tg.initData));
    } catch {
      /* ignore background poll errors */
    }
  }, 1000);
}

document.getElementById("plot-card")!.onclick = () => {
  if (!state) return;
  const st = state.farm.plot.status;
  if (st === "ready") void runAction(() => harvest(tg.initData));
  else if (st === "empty") void runAction(() => plant(tg.initData));
};

document.getElementById("warehouse-card")!.onclick = () => {
  if (!state || state.farm.hasWarehouse) {
    showTab("warehouse");
    return;
  }
  void runAction(() => buildWarehouse(tg.initData));
};

function showTab(name: string): void {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.getElementById(`page-${name}`)?.classList.add("active");
  document.querySelector(`.tab[data-tab="${name}"]`)?.classList.add("active");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    showTab((tab as HTMLElement).dataset.tab!);
  });
});

async function bootstrap(): Promise<void> {
  applyTheme();
  const hints = [
    "Пробуждаем сервер…",
    "Ещё немного…",
    "Почти готово…",
  ];
  for (let i = 0; i < 8; i++) {
    loaderHint.textContent = hints[i % hints.length]!;
    try {
      setState(await fetchMe(tg.initData));
      loader.classList.add("hidden");
      shell.classList.remove("hidden");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  loaderHint.textContent =
    "Сервер долго отвечает. Закройте Mini App и откройте снова через минуту.";
}

void bootstrap();
