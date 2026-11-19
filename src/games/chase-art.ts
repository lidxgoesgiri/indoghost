import {
  COLS,
  ROWS,
  TILE,
  WIDTH,
  HEIGHT,
  DIRECTIONS,
  ID,
  xOf,
  yOf,
  rng,
  type Village,
  type Direction
} from './chase-model';
type Ctx = CanvasRenderingContext2D;
function polygon(ctx: Ctx, points: number[][], fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function glow(ctx: Ctx, x: number, y: number, radius: number, inner: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, 'rgba(225,174,84,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
}

function roof(ctx: Ctx, x: number, y: number, w: number, h: number, variant: number) {
  const l = x * TILE + 2,
    t = y * TILE + 2,
    r = (x + w) * TILE - 3,
    b = (y + h) * TILE - 4;
  const mid = (t + b) / 2,
    hip = Math.min((b - t) * 0.39, (r - l) * 0.3);
  const ridgeL = l + hip,
    ridgeR = r - hip;
  const palettes = [
    ['#526159', '#374941'],
    ['#5c5c4f', '#44483c'],
    ['#575952', '#3d4840']
  ];
  const [lit, sheltered] = palettes[variant % palettes.length];
  const light = ctx.createLinearGradient(0, t, 0, mid),
    shade = ctx.createLinearGradient(0, mid, 0, b);
  light.addColorStop(0, '#39453c');
  light.addColorStop(1, lit);
  shade.addColorStop(0, sheltered);
  shade.addColorStop(1, '#28332c');
  ctx.fillStyle = 'rgba(18,26,22,.5)';
  ctx.fillRect(l + 5, t + 8, r - l, b - t);
  ctx.fillStyle = '#242a21';
  ctx.fillRect(l + 2, b - 2, r - l - 3, 7);
  polygon(
    ctx,
    [
      [l, t],
      [r, t],
      [ridgeR, mid],
      [ridgeL, mid]
    ],
    light
  );
  polygon(
    ctx,
    [
      [l, b],
      [ridgeL, mid],
      [ridgeR, mid],
      [r, b]
    ],
    shade
  );
  polygon(
    ctx,
    [
      [l, t],
      [ridgeL, mid],
      [l, b]
    ],
    lit
  );
  polygon(
    ctx,
    [
      [r, t],
      [r, b],
      [ridgeR, mid]
    ],
    '#26352d'
  );
  for (let j = 1; j < 6; j++) {
    const f = j / 6;
    line(ctx, l + hip * f, t + (mid - t) * f, r - hip * f, t + (mid - t) * f, '#596058', 1.3);
    line(ctx, l + hip * f, b - (b - mid) * f, r - hip * f, b - (b - mid) * f, '#212b25', 1.6);
    line(ctx, l + hip * f, t + (mid - t) * f, l + hip * f, b - (b - mid) * f, '#3e443d', 1);
    line(ctx, r - hip * f, t + (mid - t) * f, r - hip * f, b - (b - mid) * f, '#343b34', 1);
  }
  for (let j = 1; j < Math.floor((r - l) / 8); j++) {
    const f = j / Math.floor((r - l) / 8);
    line(ctx, l + (r - l) * f, t, ridgeL + (ridgeR - ridgeL) * f, mid, '#2f3832', 1);
    line(ctx, l + (r - l) * f, b, ridgeL + (ridgeR - ridgeL) * f, mid, '#475047', 1);
  }
  line(ctx, l, t, ridgeL, mid, '#6c7064', 2);
  line(ctx, l, b, ridgeL, mid, '#626658', 2);
  line(ctx, r, t, ridgeR, mid, '#525c50', 2);
  line(ctx, r, b, ridgeR, mid, '#475046', 2);
  line(ctx, ridgeL - 2, mid, ridgeR + 2, mid, '#202b25', 5);
  line(ctx, ridgeL - 3, mid - 2, ridgeR + 3, mid - 2, '#757668', 2);
  line(ctx, l - 1, b, r + 1, b, '#706958', 2);
  const moss = rng(x * 131 + y * 57 + w);
  for (let k = 0; k < 50; k++) {
    const px = l + 2 + moss() * (r - l - 4),
      py = t + 2 + moss() * (b - t - 4);
    ctx.fillStyle = k % 3 ? 'rgba(126,135,109,.25)' : 'rgba(32,45,35,.25)';
    ctx.fillRect(px, py, 1 + moss() * 4, 1.4);
  }
  const door = l + (r - l) * (variant % 2 ? 0.36 : 0.65);
  ctx.fillStyle = '#6c6049';
  ctx.fillRect(door - 6, b + 1, 12, 3);
  if (variant % 3 !== 2) {
    glow(ctx, door + 14, b + 4, 21, 'rgba(236,164,70,.27)');
    ctx.fillStyle = '#cca86d';
    ctx.fillRect(door + 8, b + 1, 10, 3);
    line(ctx, door + 13, b + 1, door + 13, b + 4, '#6d603f', 1);
  }
}

export function terrain(village: Village, night: number) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  const random = rng(7119 + night);
  ctx.fillStyle = '#606058';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y += 8) {
    let x = -random() * 20;
    while (x < WIDTH) {
      const w = 11 + random() * 26,
        d = Math.floor(random() * 12) + 74;
      ctx.fillStyle = 'rgb(' + d + ',' + (d + 3) + ',' + (d - 2) + ')';
      ctx.fillRect(x, y, w - 1.1, 7.2);
      x += w;
    }
  }
  for (let i = 0; i < 5000; i++) {
    const x = random() * WIDTH,
      y = random() * HEIGHT;
    ctx.fillStyle = i % 3 ? 'rgba(215,198,155,.09)' : 'rgba(13,23,18,.22)';
    ctx.fillRect(x, y, random() * 2 + 1, 1);
  }
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (x > 0 && x < COLS - 1 && y > 0 && y < ROWS - 1) continue;
      const l = x * TILE,
        t = y * TILE;
      ctx.fillStyle = '#28382e';
      ctx.fillRect(l, t, TILE, TILE);
      for (let i = 0; i < 27; i++) {
        const px = l + random() * TILE,
          py = t + random() * TILE;
        const s = 3 + random() * 7,
          side = random() > 0.5 ? 1 : -1;
        polygon(
          ctx,
          [
            [px - s * side, py + 3],
            [px - side, py - 2],
            [px + s * side, py - s],
            [px + 2 * side, py + 1]
          ],
          i % 3 ? '#39493a' : '#485340'
        );
      }
      const horizontal = y === 0 || y === ROWS - 1;
      const axis = horizontal ? (y === 0 ? t + TILE - 6 : t + 6) : x === 0 ? l + TILE - 6 : l + 6;
      for (let n = 0; n < 3; n++) {
        const shift = (n - 1) * 3,
          color = n === 0 ? '#5e5845' : '#373c31';
        if (horizontal) line(ctx, l, axis + shift, l + TILE, axis + shift, color, 2);
        else line(ctx, axis + shift, t, axis + shift, t + TILE, color, 2);
      }
      if (horizontal) line(ctx, l + 10, axis - 6, l + 11, axis + 5, '#7d7359', 3);
      else line(ctx, axis - 6, t + 10, axis + 5, t + 11, '#7d7359', 3);
    }
  village.blocks.forEach(([x, y, w, h], i) => {
    if (village.passage.includes(ID(x, y))) roof(ctx, x + 1, y, w - 1, h, i);
    else roof(ctx, x, y, w, h, i);
  });
  village.passage.forEach((at) => {
    const x = xOf(at) * TILE,
      y = yOf(at) * TILE;
    ctx.fillStyle = '#665b44';
    ctx.fillRect(x, y, TILE, TILE);
    for (let j = 0; j < TILE; j += 8) line(ctx, x, y + j, x + TILE, y + j, '#514731', 1);
    line(ctx, x + 5, y, x + 5, y + TILE, '#b69556', 2);
    line(ctx, x + TILE - 5, y, x + TILE - 5, y + TILE, '#b69556', 2);
  });
  const evening = ctx.createRadialGradient(
    WIDTH * 0.43,
    HEIGHT * 0.4,
    WIDTH * 0.15,
    WIDTH * 0.48,
    HEIGHT * 0.5,
    WIDTH * 0.62
  );
  evening.addColorStop(0, 'rgba(7,19,20,0)');
  evening.addColorStop(1, 'rgba(6,18,20,.28)');
  ctx.fillStyle = evening;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return canvas;
}

export function drawGate(ctx: Ctx, at: number, open: boolean) {
  const x = xOf(at) * TILE + 24,
    y = yOf(at) * TILE + 24;
  glow(ctx, x, y, open ? 52 : 35, open ? 'rgba(251,192,94,.68)' : 'rgba(181,143,83,.28)');
  ctx.fillStyle = '#312a20';
  ctx.fillRect(x - 18, y - 9, 36, 23);
  if (!open) {
    ctx.fillStyle = '#665944';
    ctx.fillRect(x - 14, y - 8, 28, 20);
    for (let j = -12; j < 14; j += 5) line(ctx, x + j, y - 7, x + j, y + 11, '#3c352b', 1.4);
    line(ctx, x - 13, y + 6, x + 12, y - 4, '#998266', 2);
  } else {
    ctx.fillStyle = '#a98b52';
    ctx.fillRect(x - 12, y + 9, 24, 3);
    polygon(
      ctx,
      [
        [x - 5, y + 3],
        [x, y - 3],
        [x + 5, y + 3],
        [x + 2, y + 3],
        [x + 2, y + 7],
        [x - 2, y + 7],
        [x - 2, y + 3]
      ],
      '#ffe3a1'
    );
  }
  ctx.fillStyle = '#b29564';
  ctx.fillRect(x - 17, y - 9, 3, 25);
  ctx.fillRect(x + 14, y - 9, 3, 25);
  polygon(
    ctx,
    [
      [x - 24, y - 9],
      [x - 16, y - 13],
      [x - 6, y - 21],
      [x + 6, y - 21],
      [x + 16, y - 13],
      [x + 24, y - 9]
    ],
    '#252d27'
  );
  line(ctx, x - 23, y - 8, x + 23, y - 8, '#b4a378', 2);
  for (const side of [-1, 1]) {
    oval(ctx, x + side * 20, y - 2, 3, 4, open ? '#ffce75' : '#b99b6e');
  }
}

export function drawCoin(ctx: Ctx, at: number) {
  const x = xOf(at) * TILE + 24,
    y = yOf(at) * TILE + 24;
  glow(ctx, x, y, 19, 'rgba(237,181,66,.32)');
  oval(ctx, x, y + 4, 10, 3, 'rgba(14,19,15,.48)');
  oval(ctx, x, y, 9.1, 9.1, '#4c3f24');
  oval(ctx, x, y - 1, 8.1, 8.1, '#f6d387');
  oval(ctx, x, y - 1, 5.6, 5.6, '#af8447');
  ctx.fillStyle = '#f5d798';
  ctx.fillRect(x - 3.1, y - 4.1, 6.2, 6.2);
  ctx.fillStyle = '#484335';
  ctx.fillRect(x - 2, y - 3, 4, 4);
}

export function drawPlayer(ctx: Ctx, x: number, y: number, facing: Direction, ward: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.22, 1.22);
  x = 0;
  y = 0;
  const [dx, dy] = DIRECTIONS[facing];
  const lx = x + (dx || 0.7) * 12,
    ly = y + dy * 9 + 4;
  glow(ctx, lx, ly, ward ? 69 : 38, ward ? 'rgba(255,205,106,.65)' : 'rgba(246,188,97,.28)');
  if (ward) {
    ctx.strokeStyle = 'rgba(255,218,150,.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 21, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  oval(ctx, x, y + 8, 13, 6, 'rgba(11,19,16,.59)');
  oval(ctx, x - 4, y + 9, 3.2, 4, '#242824');
  oval(ctx, x + 4, y + 9, 3.2, 4, '#242824');
  oval(ctx, x, y + 3, 8.5, 9, '#d6ccac');
  polygon(
    ctx,
    [
      [x - 7, y + 2],
      [x - 2, y + 4],
      [x + 7, y],
      [x + 7, y + 3],
      [x - 5, y + 8]
    ],
    '#744b35'
  );
  line(ctx, x + 7, y + 2, lx, ly, '#ae9875', 3.4);
  ctx.fillStyle = '#493d2c';
  ctx.fillRect(lx - 3, ly - 2, 6, 9);
  ctx.fillStyle = '#ffc66e';
  ctx.fillRect(lx - 2.5, ly, 5, 5.5);
  oval(ctx, x, y - 5, 10.5, 7.4, '#443e2d');
  oval(ctx, x, y - 6, 10.5, 7.1, '#d2af72');
  polygon(
    ctx,
    [
      [x - 10, y - 5],
      [x, y - 13],
      [x + 6, y - 7],
      [x, y - 4]
    ],
    '#ebca89'
  );
  line(ctx, x, y - 12, x + 8, y - 5, '#b4945f', 1.2);
  line(ctx, x, y - 12, x - 4, y - 3, '#c09b60', 1);
  ctx.restore();
}

export function drawTuyul(ctx: Ctx, x: number, y: number, ward: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.22, 1.22);
  x = 0;
  y = 0;
  oval(ctx, x, y + 9, 12, 5, 'rgba(10,18,17,.6)');
  glow(ctx, x, y, 24, ward ? 'rgba(154,184,165,.19)' : 'rgba(198,105,89,.27)');
  oval(ctx, x, y + 4, 7, 6, ward ? '#60726a' : '#856e66');
  line(ctx, x - 6, y + 3, x - 10, y + 8, '#ac9d89', 2.5);
  line(ctx, x + 6, y + 3, x + 10, y + 8, '#ac9d89', 2.5);
  ctx.fillStyle = ward ? '#486c5a' : '#9a594c';
  ctx.fillRect(x - 6, y + 6, 12, 3);
  oval(ctx, x - 3.5, y + 10, 3, 3, '#a99c8b');
  oval(ctx, x + 3.5, y + 10, 3, 3, '#a99c8b');
  oval(ctx, x - 7.5, y - 4, 2.8, 3.3, '#a99889');
  oval(ctx, x + 7.5, y - 4, 2.8, 3.3, '#a99889');
  oval(ctx, x, y - 5.5, 8.7, 9.2, '#554e48');
  oval(ctx, x, y - 6.5, 8.1, 8.5, ward ? '#adb4a6' : '#b9a595');
  oval(ctx, x - 2.6, y - 9.8, 3.5, 1.4, 'rgba(238,224,202,.42)');
  for (const s of [-1, 1]) {
    oval(ctx, x + s * 3.4, y - 5, 2.4, 1.8, '#463f37');
    oval(ctx, x + s * 3.4, y - 5, 1.2, 0.9, ward ? '#b6d3bb' : '#ff987e');
  }
  ctx.restore();
}
