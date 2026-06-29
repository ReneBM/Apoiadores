const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const path = require('path');
const fs = require('fs');

async function removeBg(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    return;
  }
  const image = await Jimp.read(inputPath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  // Get reference color from top-left corner
  const refColor = intToRGBA(image.getPixelColor(10, 10));
  
  const visited = new Uint8Array(width * height);
  const queue = [];
  
  // Add border pixels to start queue
  for (let x = 0; x < width; x++) {
    queue.push([x, 0]);
    visited[x] = 1;
    queue.push([x, height - 1]);
    visited[(height - 1) * width + x] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push([0, y]);
    visited[y * width] = 1;
    queue.push([width - 1, y]);
    visited[y * width + (width - 1)] = 1;
  }
  
  function getDist(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }
  
  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const color = intToRGBA(image.getPixelColor(cx, cy));
    
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    const diff = max - min;
    
    // A pixel is background if it is neutral grey/white (low saturation) or close to top-left ref color
    const isNeutral = diff < 32;
    const isBrighterThanHair = max > 85;
    const isNearRefColor = getDist(color, refColor) < 95;
    
    const isBackground = isNearRefColor || (isNeutral && isBrighterThanHair);
    
    if (isBackground) {
      // Set pixel to transparent
      image.setPixelColor(rgbaToInt(0, 0, 0, 0), cx, cy);
      
      // Add neighbors
      const neighbors = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = ny * width + nx;
          if (!visited[idx]) {
            visited[idx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  
  await image.write(outputPath);
  console.log(`Saved transparent image to: ${outputPath}`);
}

async function run() {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  // Process original foto3, foto4, foto5
  await removeBg(path.join(uploadsDir, 'foto3.jpg'), path.join(uploadsDir, 'foto3_nobg.png'));
  await removeBg(path.join(uploadsDir, 'foto4.jpg'), path.join(uploadsDir, 'foto4_nobg.png'));
  await removeBg(path.join(uploadsDir, 'foto5.jpg'), path.join(uploadsDir, 'foto5_nobg.png'));
}

run().catch(console.error);
