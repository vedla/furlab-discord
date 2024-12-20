import sharp from 'sharp';
import axios from 'axios';

export async function preprocessImage(imageUrl: string): Promise<Buffer> {
  // Download the image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(response.data);

  // Resize the image to meet Fluffle’s requirements
  const resizedImage = await sharp(imageBuffer)
    .resize({ width: 256, height: 256, fit: 'inside' }) // Resize to fit within 256x256
    .png() // Convert to PNG
    .toBuffer();

  return resizedImage;
}
