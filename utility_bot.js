const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration - IMPORTANT: Replace these values
const BOT_TOKEN = '7578753418:AAGpWyPK7ZotWrRtDbRF7707NTpbo2hP86I';
// const CHAT_ID = '7981868134';
const CHECK_INTERVAL = 5000; // 180 seconds
const LOG_FILE = path.join(__dirname, 'bot-health-check.log');

// Function to log messages
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp}: ${message}\n`;
  
  fs.appendFile(LOG_FILE, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
  
  console.log(message);
}

// Function to restart bot using PM2
function restartBot() {
  logMessage('Bot not responding. Attempting to restart...');
  
  exec('pm2 restart cto-booster-bot', (error, stdout, stderr) => {
    if (error) {
      logMessage(`Restart error: ${error.message}`);
      return;
    }
    if (stderr) {
      logMessage(`Restart stderr: ${stderr}`);
      return;
    }
    logMessage('Bot restart command executed successfully');
  });
}

// Function to check bot health using getMe method
async function checkBotHealth() {
  try {
    logMessage('Starting bot health check...');
    
    // Create a new bot instance for each check to ensure freshness
    const bot = new TelegramBot(BOT_TOKEN, { polling: false });
    
    // Set a timeout for the health check
    const healthCheckTimeout = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Bot health check timed out'));
      }, CHECK_INTERVAL);
    });
    
    // Use getMe method to check bot accessibility
    const botInfoPromise = bot.getMe();
    
    // Race between getting bot info and timeout
    await Promise.race([
      botInfoPromise,
      healthCheckTimeout
    ]);
    
    logMessage('Bot is accessible and responding');
  } catch (error) {
    logMessage(`Health check failed: ${error.message}`);
    restartBot();
  }
}

// Run health check periodically
function startHealthCheck() {
  logMessage('Starting periodic bot health checks');
  setInterval(checkBotHealth, CHECK_INTERVAL);
  
  // Run initial check immediately
  checkBotHealth();
}

// Initialize and start health checks
function initialize() {
  try {
    startHealthCheck();
  } catch (error) {
    logMessage(`Initialization error: ${error.message}`);
  }
}

// Start the script
initialize();