const fs = require('fs');
const path = require('path');

const dirsToRemove = ['refactor_temp_v3', 'refactor_temp_v4'];

dirsToRemove.forEach(dirName => {
  const dirPath = path.join(process.cwd(), dirName);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[OK] Deleted temporary directory: ${dirName}`);
    } catch (err) {
      console.error(`[ERROR] Failed to delete ${dirName}:`, err.message);
    }
  }
});
