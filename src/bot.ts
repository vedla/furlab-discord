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
} from 'discord.js';
import { reverseSearch } from './furlab-api';
import { preprocessImage, formatSocialname } from './utils';
import dotenv from 'dotenv';

interface Platform {
  platform: string;
  location: string;
}

// Load environment variables
dotenv.config();

// Constants
const BOT_NAME = 'Furlab - FindMyFluff';
const BOT_URL = 'https://find.furlab.net';
const EMBED_COLOR = '#6638f0';

// Create Discord client with specified intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event: Bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

// Event: Message received
// client.on('messageCreate', async (message) => {
//   if (message.author.bot || !message.attachments.size) return;

//   const attachment = message.attachments.first();
//   if (!attachment?.url) {
//     await message.reply('Please upload a valid image.');
//     return;
//   }

//   try {
//     // Notify user that the bot is processing the image
//     await message.channel.sendTyping();

//     // Preprocess the image
//     const preprocessedImage = await preprocessImage(attachment.url);

//     // Perform reverse search
//     const results = await reverseSearch(preprocessedImage);

//     if (results?.code === 200) {
//       const resultData = results.data;

//       // Create embed for search results
//       const embed = new EmbedBuilder()
//         .setAuthor({ name: BOT_NAME, url: BOT_URL })
//         .setTitle('Fluff was found!')
//         .setColor(EMBED_COLOR)
//         .setTimestamp();

//       // Create action row with buttons for each platform
//       const actionRow = new ActionRowBuilder<ButtonBuilder>();
//       const platformObj = JSON.parse(resultData.platforms);

//       platformObj.forEach((platform: { platform: string; location: string }) => {
//         const button = new ButtonBuilder()
//           .setStyle(5) // Link button style
//           .setLabel(formatSocialname(platform.platform))
//           .setURL(platform.location);

//         actionRow.addComponents(button);
//       });

//       // Reply with embed and action row
//       await message.reply({ embeds: [embed], components: [actionRow] });
//     } else {
//       await message.reply('No matches found. 😔');
//     }
//   } catch (error) {
//     console.error('Error processing image:', error);
//     await message.reply('Something went wrong. Please try again later.');
//   }
// });

const commands = [
  {
    name: 'find',
    description: 'Find the source of an image by replying to a message with this command.',
    options: [
      {
        name: 'message',
        type: 7, // Type 7 refers to a message type
        description: 'The message to analyze (must contain an image).',
        required: true,
      },
    ],
  },
];

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error('DISCORD_BOT_TOKEN is not defined');
}
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    const clientId = process.env.DISCORD_APP_ID;
    if (!clientId) {
      throw new Error('DISCORD_APP_ID is not defined');
    }
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('messageCreate', async (message) => {
  // Ignore bot messages and direct messages
  if (message.author.bot || !message.guild) return;

  // Handle replies
  if (message.reference) {
    const messageId = message.reference?.messageId;
    if (!messageId) return;
    const repliedMessage = await message.channel.messages.fetch(messageId);
    if (repliedMessage?.author?.id !== client.user?.id && repliedMessage.attachments.size) {
      const command = message.content.trim();
      if (command.startsWith('/') || (client.user && message.mentions.has(client.user))) {
        const imageUrl = repliedMessage.attachments.first()?.url ?? null;
        await handleImageReply(message, imageUrl);
      }
    }
  }
});

async function handleImageReply(message: Message, imageUrl: string | null) {
  if (!imageUrl) {
    await message.reply('The replied message does not contain an image.');
    return;
  }

  try {
    // Notify user that the bot is processing the image
    if (message.channel.isTextBased()) {
      if (message.channel.type === ChannelType.GuildText) {
        await message.channel.sendTyping();
      }
    }

    // Preprocess the image
    const preprocessedImage = await preprocessImage(imageUrl);

    // Perform reverse search
    const results = await reverseSearch(preprocessedImage);

    if (results?.code === 200) {
      const resultData = results.data;

      // Create embed for search results
      const embed = new EmbedBuilder()
        .setAuthor({ name: BOT_NAME, url: BOT_URL })
        .setTitle('Fluff was found!')
        .setColor(EMBED_COLOR)
        .setTimestamp();

      // Create action row with buttons for each platform
      const actionRow = new ActionRowBuilder<ButtonBuilder>();
      const platformObj = JSON.parse(resultData.platforms);

      platformObj.forEach((platform: Platform) => {
        const button = new ButtonBuilder()
          .setStyle(5) // Link button style
          .setLabel(formatSocialname(platform.platform))
          .setURL(platform.location);

        actionRow.addComponents(button);
      });

      // Reply with embed and action row
      await message.reply({ embeds: [embed], components: [actionRow] });
    } else {
      await message.reply('No matches found. 😔');
    }
  } catch (error) {
    console.error('Error processing image:', error);
    await message.reply('Something went wrong. Please try again later.');
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'find') {
    try {
      const messageOption = interaction.options.get('message', true); // Ensure 'message' is provided

      // Check if channel exists
      if (!interaction.channel) {
        await interaction.reply('This command can only be used in a text channel.');
        return;
      }

      // Validate messageOption.value is a string
      if (typeof messageOption.value !== 'string') {
        await interaction.reply('Invalid message reference.');
        return;
      }

      // Fetch the referenced message
      const repliedMessage = await interaction.channel.messages.fetch(messageOption.value);

      if (!repliedMessage || repliedMessage.attachments.size === 0) {
        await interaction.reply('The replied message does not contain an image.');
        return;
      }

      const imageUrl = repliedMessage.attachments.first()?.url;

      if (!imageUrl) {
        await interaction.reply('Invalid image URL.');
        return;
      }

      await interaction.deferReply(); // Indicates the bot is processing

      // Preprocess the image and perform reverse search
      const preprocessedImage = await preprocessImage(imageUrl);
      const results = await reverseSearch(preprocessedImage);

      if (results?.code === 200) {
        const resultData = results.data;

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'Furlab - FindMyFluff', url: 'https://find.furlab.net' })
          .setTitle('Fluff was found!')
          .setColor('#6638f0')
          .setTimestamp();

        const actionRow = new ActionRowBuilder<ButtonBuilder>();
        const platformObj = JSON.parse(resultData.platforms);

        platformObj.forEach((platform: Platform) => {
          const button = new ButtonBuilder()
            .setStyle(5) // Link button style
            .setLabel(formatSocialname(platform.platform))
            .setURL(platform.location);

          actionRow.addComponents(button);
        });

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
      } else {
        await interaction.editReply('No matches found. 😔');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      await interaction.reply('Something went wrong. Please try again later.');
    }
  }
});

// Login to Discord with your bot's token
client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error('Failed to log in:', error);
});
