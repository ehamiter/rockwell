import express from 'express';
import { addWebsiteToMonitor } from '../services/websiteMonitor.js';
import { getDatabase } from '../services/database.js';

const app = express();
app.use(express.json());

app.post('/websites', async (req, res) => {
  try {
    const { url, checkFrequency } = req.body;
    await addWebsiteToMonitor(url, checkFrequency);
    res.status(201).json({ message: 'Website added to monitoring' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/websites', async (req, res) => {
  try {
    const db = await getDatabase();
    const websites = await db.all('SELECT * FROM websites');
    res.json(websites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/changes', async (req, res) => {
  try {
    const db = await getDatabase();
    const changes = await db.all(`
      SELECT changes.*, websites.url 
      FROM changes 
      JOIN websites ON changes.website_id = websites.id 
      ORDER BY detected_at DESC
    `);
    res.json(changes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export const server = app;