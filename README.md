# rockwell 👀
> I always feel like somebody's watchin' me (Hee-hee-hee)

A website monitoring service that watches for changes in web pages and notifies you via email when they change. Named after Rockwell's 1984 hit song "Somebody's Watching Me" 🎵

## Features

- Monitor any number of websites
- Configurable check frequency per website (e.g., every 30 minutes, hourly, daily)
- Email notifications when changes are detected
- SQLite database for storing website hashes and change history
- RESTful API for managing monitored websites

## Setup

1. Clone the repository:
```bash
git clone git@github.com:ehamiter/rockwell.git
cd rockwell
```

2. Install dependencies:
```bash
npm install
```

3. Create a `rockwell.env` file with your email settings:
```bash
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com
EMAIL_APP_PASSWORD="your app password"
```

4. Set up as a systemd service (optional, for running as a daemon):
```bash
sudo nano /etc/systemd/system/rockwell.service
```

Add this content (adjust paths as needed):
```ini
[Unit]
Description=Rockwell Website Monitor
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/rockwell
EnvironmentFile=/path/to/rockwell/rockwell.env
Environment=NODE_ENV=production
ExecStart=/path/to/.nvm/versions/node/v22.11.0/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:
```bash
sudo systemctl enable rockwell.service
sudo systemctl start rockwell.service
```

## API Usage

### Add a website to monitor
```bash
curl -X POST http://localhost:3000/websites \
-H "Content-Type: application/json" \
-d '{"url": "https://example.com", "checkFrequency": 1}'
```

### List monitored websites
```bash
curl http://localhost:3000/websites
```

### View changes
```bash
curl http://localhost:3000/websites/changes
```

### Update check frequency
```bash
sqlite3 monitor.db
UPDATE websites SET check_frequency = 0.5 WHERE url LIKE '%example.com%';
.exit
```

### View logs
```bash
sudo journalctl -u rockwell.service -f
```

## How it Works

Rockwell fetches each monitored webpage at its configured interval, generates a hash of the content, and compares it with the previously stored hash. If they differ, it:

1. Records the change in the database
2. Sends an email notification
3. Updates the stored hash

The check frequency is configurable per website (e.g., 0.5 for every 30 minutes, 1 for hourly, 24 for daily).

## License

MIT