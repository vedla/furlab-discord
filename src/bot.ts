import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ChannelType,
  Message,
  InteractionType,
  REST,
  Routes,
  CommandInteraction,
} from 'discord.js';
import { reverseSearch } from './furlab-api';
import {
  preprocessImage,
  formatSocialname,
  handleImageProcessing,
  fetchRepliedMessage,
} from './utils';
import dotenv from 'dotenv';

dotenv.config();

const BOT_NAME = 'FindMyFluff';
const BOT_URL = 'https://find.furlab.net';
const EMBED_COLOR = '#6638f0';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

const commands = [
  {
    name: 'find',
    description: 'Find the source of an image by replying to a message with this command.',
    options: [
      {
        name: 'message',
        type: 7, // Message type
        description: 'The message to analyze (must contain an image).',
        required: true,
      },
    ],
  },
];

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error('DISCORD_BOT_TOKEN is not defined');
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    const clientId = process.env.DISCORD_APP_ID;
    if (!clientId) throw new Error('DISCORD_APP_ID is not defined');

    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.reference) {
    const repliedMessage = await fetchRepliedMessage(message);
    if (repliedMessage?.attachments.size) {
      const command = message.content.trim();
      if (command.startsWith('/') || (client.user && message.mentions.has(client.user))) {
        const imageUrl = repliedMessage.attachments.first()?.url ?? null;
        await handleImageProcessing(message, imageUrl);
      }
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'find') return;

  try {
    const messageOption = interaction.options.get('message', true);

    if (!interaction.channel || typeof messageOption.value !== 'string') {
      await interaction.reply('Invalid message reference or channel.');
      return;
    }

    const repliedMessage = await interaction.channel.messages.fetch(messageOption.value);
    const imageUrl = repliedMessage?.attachments.first()?.url;

    if (!imageUrl) {
      await interaction.reply('The replied message does not contain an image.');
      return;
    }

    await interaction.deferReply();
    await handleImageProcessing(interaction, imageUrl, true);
  } catch (error) {
    console.error('Error processing interaction:', error);
    await interaction.reply('Something went wrong. Please try again later.');
  }
});

client.login(token).catch((error) => {
  console.error('Failed to log in:', error);
});
