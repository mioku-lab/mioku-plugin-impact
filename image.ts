import type { ScreenshotService } from "mioku";
import { escapeHtml, getAvatarUrl } from "./utils";

export interface RankRow {
  name: string;
  userId: number;
  jjLength: number;
}

export interface InjectionPoint {
  date: string;
  volume: number;
}

const COLORS = [
  "#1f77b4",
  "#2ca02c",
  "#d62728",
  "#ff7f0e",
  "#9467bd",
  "#17becf",
  "#bcbd22",
  "#e377c2",
  "#ff6347",
  "#ffd700",
];

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "MiSans", "PingFang SC", "Microsoft YaHei",
      "Noto Sans CJK SC", "Hiragino Sans GB", "Apple Color Emoji",
      "Noto Color Emoji", sans-serif;
    background: #fff;
    color: #1d1d1f;
  }
`;

/**
 * 渲染牛子排行榜：横向条形图（前五正向延伸，后五负向延伸）。
 */
export async function renderRankChart(
  screenshot: ScreenshotService,
  rows: RankRow[],
): Promise<string> {
  const width = 960;
  const rowHeight = 56;
  const headerHeight = 96;
  const padding = 32;
  const labelWidth = 220;
  const trackPad = 32;
  const trackWidth = width - padding * 2 - labelWidth - trackPad;
  const height = headerHeight + rowHeight * rows.length + padding;

  const maxAbs = Math.max(
    1,
    ...rows.map((r) => Math.abs(r.jjLength)),
  );

  const items = rows
    .map((row, i) => {
      const color = COLORS[i % COLORS.length];
      const ratio = Math.min(1, Math.abs(row.jjLength) / maxAbs);
      const barWidth = ratio * (trackWidth / 2 - 6);
      const isPositive = row.jjLength >= 0;
      const trackLeft = padding + labelWidth + trackPad;
      const center = trackLeft + trackWidth / 2;
      const barLeft = isPositive ? center : center - barWidth;
      const labelText = `${row.jjLength.toFixed(2)} cm`;
      return `
        <div class="row" style="top:${headerHeight + i * rowHeight}px;">
          <img class="avatar" src="${escapeHtml(getAvatarUrl(row.userId))}" />
          <div class="name">${escapeHtml(truncate(row.name, 9))}</div>
          <div class="track" style="left:${trackLeft}px; width:${trackWidth}px;">
            <div class="axis"></div>
            <div class="bar" style="
              left:${barLeft}px;
              width:${barWidth}px;
              background:${color};
            "></div>
            <div class="value" style="${
              isPositive
                ? `left:${barLeft + barWidth + 8}px;`
                : `left:${barLeft - 70}px; text-align:right;`
            }">${labelText}</div>
          </div>
        </div>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" />
    <style>
      ${BASE_CSS}
      .canvas {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        background: #fafafa;
      }
      .title {
        position: absolute;
        left: 0; top: 28px;
        width: 100%;
        text-align: center;
        font-size: 32px;
        font-weight: 700;
        color: #1d1d1f;
      }
      .subtitle {
        position: absolute;
        left: 0; top: 64px;
        width: 100%;
        text-align: center;
        font-size: 16px;
        color: #6e6e73;
      }
      .row {
        position: absolute;
        left: ${padding}px;
        right: ${padding}px;
        height: ${rowHeight - 8}px;
      }
      .avatar {
        position: absolute;
        left: 0; top: 0;
        width: ${rowHeight - 12}px;
        height: ${rowHeight - 12}px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid #e5e5ea;
        background: #f2f2f7;
      }
      .name {
        position: absolute;
        left: 60px;
        top: 50%;
        transform: translateY(-50%);
        width: ${labelWidth - 60}px;
        font-size: 18px;
        color: #1d1d1f;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        position: absolute;
        top: 50%;
        height: ${rowHeight - 18}px;
        transform: translateY(-50%);
      }
      .axis {
        position: absolute;
        left: 50%;
        top: -4px;
        bottom: -4px;
        width: 2px;
        background: #d2d2d7;
      }
      .bar {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 4px;
        opacity: 0.92;
      }
      .value {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        color: #1d1d1f;
        white-space: nowrap;
        width: 70px;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="title">JJ 排行榜</div>
      <div class="subtitle">Top 5 与 Bottom 5（单位：cm）</div>
      ${items}
    </div>
  </body></html>`;

  return screenshot.screenshot(html, {
    width,
    height,
    fullPage: false,
    type: "png",
  });
}

/**
 * 渲染历史注入折线图。
 */
export async function renderInjectionChart(
  screenshot: ScreenshotService,
  points: InjectionPoint[],
  totalVolume: number,
): Promise<string> {
  const width = 1024;
  const height = 560;
  const padding = { top: 80, right: 48, bottom: 80, left: 64 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxValue = Math.max(1, ...points.map((p) => p.volume));
  const niceMax = niceCeil(maxValue);

  const ticksY = 5;
  const yLabels = Array.from({ length: ticksY + 1 }, (_, i) => {
    const v = (niceMax / ticksY) * i;
    return {
      value: v.toFixed(0),
      y: padding.top + plotH - (v / niceMax) * plotH,
    };
  });

  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

  const dots = points.map((p, i) => {
    const x = padding.left + stepX * i;
    const y = padding.top + plotH - (p.volume / niceMax) * plotH;
    return { x, y, point: p };
  });

  const linePath = dots
    .map((d, i) => `${i === 0 ? "M" : "L"} ${d.x.toFixed(2)} ${d.y.toFixed(2)}`)
    .join(" ");

  const dotsHtml = dots
    .map(
      (d) => `
        <circle cx="${d.x}" cy="${d.y}" r="5" fill="#1f77b4" />
        <text x="${d.x}" y="${d.y - 12}" text-anchor="middle" font-size="13" fill="#1d1d1f">${d.point.volume}</text>
      `,
    )
    .join("");

  const sampledLabels = sampleLabels(dots, 8);
  const xLabelsHtml = sampledLabels
    .map(
      (d) => `
        <text x="${d.x}" y="${padding.top + plotH + 22}" text-anchor="middle" font-size="13" fill="#6e6e73" transform="rotate(-30 ${d.x} ${padding.top + plotH + 22})">${escapeHtml(d.point.date)}</text>
      `,
    )
    .join("");

  const yAxisHtml = yLabels
    .map(
      (l) => `
        <line x1="${padding.left}" y1="${l.y}" x2="${padding.left + plotW}" y2="${l.y}" stroke="#e5e5ea" stroke-dasharray="4 4" />
        <text x="${padding.left - 8}" y="${l.y + 4}" text-anchor="end" font-size="13" fill="#6e6e73">${l.value}</text>
      `,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" />
    <style>
      ${BASE_CSS}
      .canvas {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        background: #fafafa;
      }
      .title {
        position: absolute;
        left: 0; top: 24px;
        width: 100%;
        text-align: center;
        font-size: 28px;
        font-weight: 700;
        color: #1d1d1f;
      }
      .subtitle {
        position: absolute;
        left: 0; top: 56px;
        width: 100%;
        text-align: center;
        font-size: 14px;
        color: #6e6e73;
      }
      svg { position: absolute; left: 0; top: 0; }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="title">历史注入走势</div>
      <div class="subtitle">总量 ${totalVolume.toFixed(2)} ml · 共 ${points.length} 天有记录</div>
      <svg width="${width}" height="${height}">
        ${yAxisHtml}
        <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${padding.left + plotW}" y2="${padding.top + plotH}" stroke="#1d1d1f" stroke-width="2" />
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotH}" stroke="#1d1d1f" stroke-width="2" />
        <path d="${linePath}" fill="none" stroke="#1f77b4" stroke-width="2.5" />
        ${dotsHtml}
        ${xLabelsHtml}
      </svg>
    </div>
  </body></html>`;

  return screenshot.screenshot(html, {
    width,
    height,
    fullPage: false,
    type: "png",
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const base = v / exp;
  let mult: number;
  if (base <= 1) mult = 1;
  else if (base <= 2) mult = 2;
  else if (base <= 5) mult = 5;
  else mult = 10;
  return mult * exp;
}

function sampleLabels<T>(items: T[], maxLabels: number): T[] {
  if (items.length <= maxLabels) return items;
  const step = (items.length - 1) / (maxLabels - 1);
  const out: T[] = [];
  for (let i = 0; i < maxLabels; i++) {
    out.push(items[Math.round(i * step)]);
  }
  return out;
}
