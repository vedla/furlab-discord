import sharp from 'sharp';
import axios from 'axios';

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
import dotenv from 'dotenv';

const BOT_NAME = 'FindMyFluff';
const BOT_URL = 'https://find.furlab.net';
const EMBED_COLOR = '#6638f0';

interface Credits {
  id: number;
  name: string;
}
interface Platform {
  platform: string;
  location: string;
  credits: [Credits];
}

export async function preprocessImage(imageUrl: string): Promise<Buffer> {
  // Download the image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(response.data);

  // Resize the image to meet Fluffles requirements
  const resizedImage = await sharp(imageBuffer)
    .resize({ width: 256, height: 256, fit: 'inside' }) // Resize to fit within 256x256
    .png() // Convert to PNG
    .toBuffer();

  return resizedImage;
}

export function formatSocialname(name: string) {
  const socialMap = new Map<string, string>([
    ['furaffinity', 'Fur Affinity'],
    ['twitter', 'Twitter'],
    ['e621', 'e621'],
    ['weasyl', 'Weasyl'],
    ['furry network', 'Furry Network'],
    ['deviantart', 'DeviantArt'],
    ['inkbunny', 'Inkbunny'],
  ]);

  return socialMap.get(name.toLowerCase().trim().replace(' ', '')) || 'unknown';
}

export function urlFixer(url: string): string {
  const replacements: Record<string, string> = {
    'twitter.com': 'fxtwitter.com',
    'x.com': 'fixupx.com',
    'furaffinity.net': 'fxfuraffinity.net',
    'bsky.app': 'fxbsky.app',
  };

  for (const [original, replacement] of Object.entries(replacements)) {
    if (url.includes(`//${original}`)) {
      return url.replace(original, replacement);
    }
  }

  return url;
}

function createResultEmbed(resultData: { platforms: string }) {
  const embed = new EmbedBuilder()
    .setAuthor({ name: BOT_NAME })
    .setTitle('Fluff was found!')
    .setColor(EMBED_COLOR)
    .setFooter({ text: 'Powered by Furlab' })
    .setTimestamp();

  const platformObj = JSON.parse(resultData.platforms);
  let credit = '';

  platformObj.forEach((platform: Platform) => {
    credit += `[${platform.credits[0].name} - ${formatSocialname(platform.platform)}](${
      platform.location
    })\n`;
  });

  if (credit) {
    embed.addFields([{ name: 'Uploaded by', value: credit }]);
  }

  return embed;
}

function createActionRow(platforms: string) {
  const actionRow = new ActionRowBuilder<ButtonBuilder>();
  const platformObj = JSON.parse(platforms);

  platformObj.forEach((platform: Platform) => {
    const button = new ButtonBuilder()
      .setStyle(5) // Link button
      .setLabel(formatSocialname(platform.platform))
      .setURL(platform.location);

    actionRow.addComponents(button);
  });

  return actionRow;
}

async function fetchRepliedMessage(message: Message) {
  const messageId = message.reference?.messageId;
  if (!messageId) return null;
  return message.channel.messages.fetch(messageId);
}

async function handleImageProcessing(
  source: Message | CommandInteraction,
  imageUrl: string | null,
  isInteraction = false
) {
  if (!imageUrl) {
    const replyMessage = 'The replied message does not contain an image.';
    isInteraction ? await source.reply(replyMessage) : await source.reply(replyMessage);
    return;
  }

  try {
    if (!isInteraction && source.channel && source.channel.type === ChannelType.GuildText) {
      await source.channel.sendTyping();
    }

    const preprocessedImage = await preprocessImage(imageUrl);
    const results = await reverseSearch(preprocessedImage);

    if (results?.code === 200) {
      const resultData = results.data;
      const embed = createResultEmbed(resultData);
      const actionRow = createActionRow(resultData.platforms);

      if (isInteraction) {
        if (source instanceof CommandInteraction) {
          await source.editReply({ embeds: [embed], components: [actionRow] });
        } else {
          await source.reply({ embeds: [embed], components: [actionRow] });
        }
      } else {
        await source.reply({ embeds: [embed], components: [actionRow] });
      }
    } else {
      const noMatchMessage = 'No matches found. 😔';
      if (isInteraction && source instanceof CommandInteraction) {
        await source.editReply(noMatchMessage);
      } else {
        await source.reply(noMatchMessage);
      }
    }
  } catch (error) {
    console.error('Error processing image:', error);
    const errorMessage = 'Something went wrong. Please try again later.';
    if (isInteraction && source instanceof CommandInteraction) {
      await source.editReply(errorMessage);
    } else {
      await source.reply(errorMessage);
    }
  }
}

export { fetchRepliedMessage, handleImageProcessing, createResultEmbed, createActionRow };
