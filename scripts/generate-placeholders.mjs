/**
 * Generates placeholder images for any expected asset that is MISSING.
 * Never overwrites an existing file — drop real images at the same paths
 * and re-running this script is a no-op for them.
 *
 * Work placeholders: solid fill in the project's primary palette color
 * with the file path rendered as small centered text.
 * Hero placeholder: 3840×2160 with dark blue-green negative space on the
 * LEFT and a portrait-suggesting form on the right (matches
 * heroTextAlign: 'left' in lib/content.ts).
 *
 * Colors mirror lib/palettes.ts (c1 per project) — generation-time only;
 * runtime color always comes from lib/palettes.ts.
 */
import { mkdir, access, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = new URL("..", import.meta.url).pathname;
const pub = join(root, "public");

const primaries = {
  aurabrew: "#C4762A",
  silvrbank: "#4DA6C7",
  instantbox: "#39D98A",
  bark: "#E07A4F",
  "alejandra-pelay": "#D9D2C7",
};

const exists = async (p) => access(p).then(() => true, () => false);

function workSvg(color, label, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="${Math.round(h / 34)}"
        fill="rgba(0,0,0,0.55)" letter-spacing="2">${label}</text>
</svg>`;
}

function heroSvg(w, h) {
  // Dark blue-green field; negative space kept clear on the LEFT,
  // portrait-suggesting silhouette on the right for shader verification.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="glow" cx="72%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#2e6b66"/>
      <stop offset="55%" stop-color="#123a3c"/>
      <stop offset="100%" stop-color="#07191d"/>
    </radialGradient>
    <radialGradient id="head" cx="50%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#5a9a8e"/>
      <stop offset="100%" stop-color="#1d4a48"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#07191d"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <ellipse cx="${w * 0.72}" cy="${h * 0.46}" rx="${h * 0.23}" ry="${h * 0.3}" fill="url(#head)"/>
  <ellipse cx="${w * 0.72}" cy="${h * 1.06}" rx="${h * 0.5}" ry="${h * 0.42}" fill="url(#head)" opacity="0.85"/>
  <text x="${w * 0.72}" y="${h * 0.5}" text-anchor="middle" font-family="sans-serif"
        font-size="${Math.round(h / 40)}" fill="rgba(255,255,255,0.35)" letter-spacing="4">hero/portrait.jpg</text>
</svg>`;
}

async function ensure(path, svg, quality = 82) {
  const full = join(pub, path);
  if (await exists(full)) {
    console.log(`skip (exists)  ${path}`);
    return;
  }
  await mkdir(dirname(full), { recursive: true });
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality }).toBuffer();
  await writeFile(full, buf);
  console.log(`created        ${path}`);
}

const W = 1600;
const H = 1200;

for (const [slug, color] of Object.entries(primaries)) {
  const files = ["main", "detail-01", "detail-02", "detail-03", "detail-04"];
  for (const name of files) {
    const rel = `work/${slug}/${name}.jpg`;
    await ensure(rel, workSvg(color, rel, W, H));
  }
}

await ensure("hero/portrait.jpg", heroSvg(3840, 2160), 80);

console.log("done.");
