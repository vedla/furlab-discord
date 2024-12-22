import axios from 'axios';
import FormData from 'form-data';

export async function reverseSearch(imageBuffer: Buffer): Promise<any> {
  const headers = {
    'User-Agent':
      'FurlabBot/1.0 (by Tay Fox (@CodiAsFox) on GitHub | Vedla Creative - The Furlab Project https://furlab.net | send beans)',
  };

  const formData = new FormData();
  formData.append('file', imageBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  }); // Attach the file

  // Correctly append platforms as an array
  formData.append('includeNsfw', includeNsfw ? 'true' : 'false');

  formData.append('platforms[]', 'Fur Affinity');
  formData.append('platforms[]', 'Twitter');
  formData.append('platforms[]', 'e621');
  formData.append('platforms[]', 'Weasyl');
  formData.append('platforms[]', 'Furry Network');
  formData.append('platforms[]', 'DeviantArt');
  formData.append('platforms[]', 'Inkbunny');

  formData.append('limit', '8');
  
  // I know, the formatting is broken. i edited this on my phone.

  try {
    const response = await axios.post('https://api.fluffle.xyz/v1/search', formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    const err = error as any;
    console.error('Error response:', err.response?.data || err.message);
    throw error;
  }
}
