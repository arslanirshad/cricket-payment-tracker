import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..", "src", "app");
const size = 32;

// Cricket bat (left) + ball (right) on teal rounded square
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#0d9488"/>
  <!-- Bat blade -->
  <path d="M7.5 24.5 L9 10.5 Q9.2 8.8 11 8.5 L13.2 8.2 Q15.2 7.9 15.5 9.8 L14.2 24.2 Q14 25.8 12.2 26 L9.5 26.3 Q7.5 26.4 7.5 24.5 Z" fill="#d4a574"/>
  <!-- Bat face highlight -->
  <path d="M10.2 11 L11.5 11.2 L10.8 23.5 L9.6 23.3 Z" fill="#e8c49a" opacity="0.7"/>
  <!-- Handle grip -->
  <rect x="10.6" y="4.2" width="3.2" height="5.2" rx="1" fill="#5c4033"/>
  <path d="M10.6 5.2h3.2M10.6 6.4h3.2M10.6 7.6h3.2" stroke="#3d2b22" stroke-width="0.5"/>
  <!-- Ball -->
  <circle cx="23" cy="18.5" r="5.8" fill="#c41e3a"/>
  <path d="M20.6 13.8c-1.3 1.6-1.3 8.2 0 9.8" stroke="#f8fafc" stroke-width="0.9" stroke-linecap="round" fill="none"/>
  <path d="M25.4 13.8c1.3 1.6 1.3 8.2 0 9.8" stroke="#f8fafc" stroke-width="0.9" stroke-linecap="round" fill="none"/>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();

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

const ico = Buffer.concat([header, entry, png]);
fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
fs.writeFileSync(path.join(appDir, "icon.png"), png);
console.log("wrote favicon.ico and icon.png");
