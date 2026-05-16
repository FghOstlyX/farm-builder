import type { FarmSnapshot } from "./api";

const TILE_W = 48;
const TILE_H = 24;

export class FarmCanvas {
  private animFrame = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private getState: () => FarmSnapshot,
  ) {
    this.canvas.addEventListener("click", (e) => this.onClick(e));
    this.loop();
  }

  private loop(): void {
    this.animFrame++;
    this.draw(this.getState());
    requestAnimationFrame(() => this.loop());
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

    if (y > 140 && y < 220 && x > 80 && x < 280) {
      window.dispatchEvent(new CustomEvent("farm:plot"));
    } else if (y > 60 && y < 130 && x > 200 && x < 320) {
      window.dispatchEvent(new CustomEvent("farm:warehouse"));
    }
  }

  private draw(state: FarmSnapshot | undefined): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx || !state) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    this.drawTile(ctx, 60, 100, "#8B6914", "#6B4E0A");
    this.drawTile(ctx, 120, 130, "#7CB342", "#558B2F");
    this.drawTile(ctx, 180, 100, "#7CB342", "#558B2F");
    this.drawTile(ctx, 240, 130, "#7CB342", "#558B2F");

    if (state.hasWarehouse) {
      this.drawBuilding(ctx, 250, 55, "#8D6E63", "#5D4037", "Склад");
    } else {
      this.drawBuilding(ctx, 250, 55, "#9E9E9E", "#616161", "Склад?");
    }

    this.drawPlot(ctx, 140, 165, state);
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    top: string,
    side: string,
  ): void {
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_H);
    ctx.lineTo(x + TILE_W, y + TILE_H / 2);
    ctx.lineTo(x + TILE_W, y + TILE_H);
    ctx.lineTo(x, y + TILE_H * 1.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + TILE_W, y + TILE_H / 2);
    ctx.lineTo(x, y + TILE_H);
    ctx.lineTo(x - TILE_W, y + TILE_H / 2);
    ctx.closePath();
    ctx.fill();
  }

  private drawBuilding(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fill: string,
    stroke: string,
    label: string,
  ): void {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, 70, 55);
    ctx.strokeRect(x, y, 70, 55);
    ctx.fillStyle = "#FFEB3B";
    ctx.fillRect(x + 25, y + 20, 20, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.fillText(label, x + 8, y + 68);
  }

  private drawPlot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state: FarmSnapshot,
  ): void {
    ctx.fillStyle = "#5D4037";
    ctx.fillRect(x, y, 100, 40);

    if (state.cropStatus === "empty") {
      ctx.fillStyle = "#A1887F";
      ctx.font = "12px sans-serif";
      ctx.fillText("🌱 Грядка", x + 18, y + 24);
      return;
    }

    const growth = state.cropProgress;
    const height = 8 + growth * 28;
    const sway = Math.sin(this.animFrame * 0.08) * 2;

    ctx.strokeStyle = "#2E7D32";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 38);
    ctx.quadraticCurveTo(x + 50 + sway, y + 38 - height, x + 50, y + 38 - height - 8);
    ctx.stroke();

    ctx.fillStyle = state.cropStatus === "ready" ? "#FF6F00" : "#81C784";
    ctx.beginPath();
    ctx.arc(x + 50, y + 38 - height - 10, 10 + growth * 4, 0, Math.PI * 2);
    ctx.fill();

    if (state.cropStatus === "ready") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("Собрать!", x + 22, y - 8);
    }
  }
}
