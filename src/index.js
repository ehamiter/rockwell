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

  // Check every minute to see if any websites need checking
  cron.schedule('* * * * *', async () => {
    try {
      console.log('Checking for websites that need updating...');
      await checkWebsiteChanges();
    } catch (error) {
      console.error('Error checking websites:', error);
    }
  });
}

startServer().catch(console.error);