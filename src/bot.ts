import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { reverseSearch } from './fluffle';
import { preprocessImage } from './preprocessImage';

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

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.attachments.size) return;

  const attachment = message.attachments.first();
  if (!attachment?.url) {
    message.reply('Please upload a valid image.');
    return;
  }

  try {
    message.reply('Searching for matches... 🕵️‍♂️');

    // Preprocess the image
    const preprocessedImage = await preprocessImage(attachment.url);

    // Perform reverse search
    const results = await reverseSearch(preprocessedImage);

    if (results?.results?.length > 0) {
      const topResult = results.results[0];
      // message.reply(
      //   `Found a match! 🖼️\n**Platform:** ${topResult.platform}\n**URL:** ${topResult.location}`,
      // );
      const embed = new EmbedBuilder()
        .setTitle('Fluffle Search Result')
        .setURL(topResult.location)
        .setDescription(`**Platform:** ${topResult.platform}`)
        .setImage(topResult.thumbnail.location);

      message.reply({ embeds: [embed] });
    } else {
      message.reply('No matches found. 😔');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error processing image:', error.message);
      console.error(error);
    } else {
      if (
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data instanceof Object &&
        'message' in error.data
      ) {
        console.error('Error processing image:', error.data.message);
      } else {
        console.error('Unknown error occurred.');
      }
    }
    message.reply('Something went wrong. Please try again later.');
  }
});

// Login to Discord with your bot's token
client.login(process.env.DISCORD_BOT_TOKEN);
