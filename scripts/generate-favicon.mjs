import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..", "src", "app");
const size = 32;

// Keep favicon.ico in sync with icon.svg (Chrome still requests /favicon.ico).
const svg = fs.readFileSync(path.join(appDir, "icon.svg"));
const png = await sharp(svg).resize(size, size).png().toBuffer();

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(size, 0);
entry.writeUInt8(size, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(6 + 16, 12);

fs.writeFileSync(path.join(appDir, "favicon.ico"), Buffer.concat([header, entry, png]));
console.log("synced favicon.ico from icon.svg");
