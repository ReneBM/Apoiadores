const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const brainDir = 'C:/Users/User/.gemini/antigravity/brain/3dd9021a-2d85-44bf-9de5-94698b481600';
const publicDir = 'c:/Users/User/Documents/Senador Styveson Valim/frontend/public/senador';
const uploadsDir = 'c:/Users/User/Documents/Senador Styveson Valim/backend/uploads';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function removeCheckerboard(jpegFileName, outputPngName) {
  const inputPath = path.join(brainDir, jpegFileName);
  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    return;
  }

  console.log(`Decoding JPEG: ${jpegFileName}...`);
  const jpegData = fs.readFileSync(inputPath);
  const rawImageData = jpeg.decode(jpegData, { useTArray: true }); // width, height, data (RGBA)

  const width = rawImageData.width;
  const height = rawImageData.height;
  const data = rawImageData.data; // Uint8Array RGBA

  const png = new PNG({ width, height });

  let replacedCount = 0;

  // Flood fill or color detection for checkerboard
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      const diff1 = Math.abs(r - g);
      const diff2 = Math.abs(g - b);
      const diff3 = Math.abs(r - b);

      // Grayscale/Achromatic pixel check
      const isAchromatic = diff1 < 18 && diff2 < 18 && diff3 < 18;
      const brightness = (r + g + b) / 3;

      let isBg = false;

      // The fake checkerboard background consists of white (235..255) and light gray (170..230) alternating squares
      if (isAchromatic && brightness > 165) {
        // Extra check: prevent erasing light shirt if skin/clothing tone is not pure gray
        // Skin tone has higher red (r > g and g > b). Pure gray has r ~= g ~= b.
        const isSkinTone = (r - b > 20) && (g - b > 10);
        if (!isSkinTone) {
          isBg = true;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = isBg ? 0 : 255; // 0 = Transparent, 255 = Opaque

      if (isBg) replacedCount++;
    }
  }

  console.log(`Replaced ${replacedCount} checkerboard pixels in ${outputPngName}. Writing PNG...`);

  const outPublic = path.join(publicDir, outputPngName);
  const outUploads = path.join(uploadsDir, outputPngName.replace('.png', '_nobg.png'));

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outPublic, buffer);
  fs.writeFileSync(outUploads, buffer);
  console.log(`Successfully generated TRUE PNG: ${outPublic}`);
}

try {
  removeCheckerboard('foto5_clean_nobg_1782689348389.png', 'foto5.png');
  removeCheckerboard('foto4_clean_v2_1782689895024.png', 'foto4.png');
  removeCheckerboard('foto3_clean_nobg_1782689331224.png', 'foto3.png');
  console.log('All Senator photos converted to TRUE PNG without checkerboard background!');
} catch (err) {
  console.error('Error processing photos:', err);
}
