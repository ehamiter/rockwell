import cron from 'node-cron';
import { initializeDatabase } from './services/database.js';
import { checkWebsiteChanges } from './services/websiteMonitor.js';
import { server } from './api/server.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Initialize the database
  await initializeDatabase();

  // Start the Express server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Schedule website checks to run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled website checks...');
    await checkWebsiteChanges();
  });
}

startServer().catch(console.error);