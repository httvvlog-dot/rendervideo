const fs = require('fs');
const path = require('path');

const fileToDelete = path.join(process.cwd(), 'src/app/admin/providers/components/provider-table.tsx');

if (fs.existsSync(fileToDelete)) {
  try {
    fs.unlinkSync(fileToDelete);
    console.log('[OK] Successfully deleted old provider-table.tsx');
  } catch (err) {
    console.error('[ERROR] Failed to delete:', err.message);
  }
} else {
  console.log('[SKIP] provider-table.tsx already deleted');
}
