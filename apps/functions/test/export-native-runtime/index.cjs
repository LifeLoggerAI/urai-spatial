// Exact compiled production exports, isolated from unrelated provider triggers.
const privacy = require('../../lib/apps/functions/src/privacyOperations.js');
for (const name of ['createExportRequest', 'processExportJob', 'getOperationalExportDownloadUrl', 'downloadOperationalExportPackage']) exports[name] = privacy[name];
