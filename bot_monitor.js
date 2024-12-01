const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.MONITOR_BOT_TOKEN; // Token for the monitoring bot
const mainBotUsername = process.env.MAIN_BOT_USERNAME; // Username of the main bot
const mainBotPm2Name = 'cto-booster-bot'; // PM2 process name of the main bot

const monitorBot = new TelegramBot(token, { polling: true });

async function checkMainBot() {
  const chatId = process.env.MONITOR_CHAT_ID; // Chat ID to send the /start command to
  let startCommandReceived = false;

  // Set a timeout to check if the main bot responds within 180 seconds
  const timeout = setTimeout(() => {
    if (!startCommandReceived) {
      console.log('Main bot did not respond to /start within 180 seconds. Restarting...');
      exec(`pm2 restart ${mainBotPm2Name}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error restarting main bot: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      });
    }
  }, 180000); // 180 seconds

  // Send /start command to the main bot
  monitorBot.sendMessage(chatId, `/start@${mainBotUsername}`);

  // Listen for responses from the main bot
  monitorBot.on('message', (msg) => {
    if (msg.text && msg.text.includes('Welcome!')) {
      startCommandReceived = true;
      clearTimeout(timeout); // Clear the timeout if the main bot responds
      console.log('Main bot responded to /start command.');
    }
  });
}

// Run the checkMainBot function periodically (e.g., every 5 minutes)
setInterval(checkMainBot, 300000); // 300000 milliseconds = 5 minutes

// Initial check
checkMainBot();