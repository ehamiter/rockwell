import fetch from 'node-fetch';
import crypto from 'crypto';
import { getDatabase } from './database.js';
import nodemailer from 'nodemailer';

const FETCH_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM,    // Your Gmail address
  to: process.env.EMAIL_TO,        // Where to send notifications
  password: process.env.EMAIL_APP_PASSWORD  // Your Gmail App Password
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_CONFIG.from,
    pass: EMAIL_CONFIG.password
  }
});

async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function fetchAndHash(url, retries = 0) {
  try {
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const content = await response.text();
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Retry ${retries + 1} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return fetchAndHash(url, retries + 1);
    }
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

async function sendEmail(url, message) {
  if (!EMAIL_CONFIG.from || !EMAIL_CONFIG.to || !EMAIL_CONFIG.password) {
    console.log('Email configuration missing, skipping notification');
    return;
  }
  
  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.to,
      subject: `Website Monitor Alert: ${url}`,
      text: message,
      html: `<h3>Website Monitor Alert</h3>
             <p><strong>Website:</strong> ${url}</p>
             <p><strong>Status:</strong> ${message}</p>
             <p><em>Timestamp: ${new Date().toLocaleString()}</em></p>`
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
}

/**
 * Adds a website to the monitoring system
 * @param {string} url - The URL of the website to monitor
 * @param {number} checkFrequency - How often to check for changes, in hours (default: 24 hours)
 */
export async function addWebsiteToMonitor(url, checkFrequency = 1) {
  const db = await getDatabase();
  const initialHash = await fetchAndHash(url);
  
  await db.run(
    'INSERT INTO websites (url, last_hash, last_checked, check_frequency) VALUES (?, ?, datetime("now"), ?)',
    [url, initialHash, checkFrequency]
  );
  
  // Send confirmation email
  await sendEmail(url, 'Website has been added to monitoring system ✓');
}

export async function checkWebsiteChanges() {
  const db = await getDatabase();
  
  // Only get websites that are due for checking based on their check_frequency
  const websites = await db.all(`
    SELECT * FROM websites 
    WHERE datetime('now') >= datetime(last_checked, '+' || check_frequency || ' hours')
  `);

  if (websites.length > 0) {
    console.log(`Found ${websites.length} website(s) to check`);
  }

  for (const website of websites) {
    try {
      console.log(`Checking ${website.url} (frequency: ${website.check_frequency}h)`);
      const currentHash = await fetchAndHash(website.url);

      if (currentHash !== website.last_hash) {
        await db.run(
          'INSERT INTO changes (website_id, old_hash, new_hash) VALUES (?, ?, ?)',
          [website.id, website.last_hash, currentHash]
        );

        await db.run(
          'UPDATE websites SET last_hash = ?, last_checked = datetime("now") WHERE id = ?',
          [currentHash, website.id]
        );

        console.log(`Change detected for ${website.url}`);
        await sendEmail(website.url, 'Content has changed! A modification was detected on this website.');
      } else {
        await db.run(
          'UPDATE websites SET last_checked = datetime("now") WHERE id = ?',
          [website.id]
        );
        console.log(`No changes for ${website.url}`);
      }
    } catch (error) {
      console.error(`Error checking ${website.url}:`, error);
      await sendEmail(website.url, `Error checking website: ${error.message}`);
    }
  }
}