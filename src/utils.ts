import sharp from 'sharp';
import axios from 'axios';

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
