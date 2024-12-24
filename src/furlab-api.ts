import axios from 'axios';
import FormData from 'form-data';

export async function reverseSearch(imageBuffer: Buffer): Promise<any> {
  const formData = new FormData();

  const headers = {
    'User-Agent':
      'FurlabBot/1.0 (by Tay Fox (@CodiAsFox) on GitHub | Vedla Creative - The Furlab Project https://furlab.net | send beans)',
  };

  // Attach the image buffer
  formData.append('imageBuffer', imageBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  }); // Attach the file

  // Include required parameters
  formData.append('includeNsfw', 'true');

  // Send request to the API
  try {
    const response = await axios.post(process.env.API_URL!, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(), // Automatically handle multipart headers
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });
    return response.data;
  } catch (error) {
    const err = error as any;
    if (err.response) {
      console.error('Error response from API:', err.response.data);
      throw new Error(`API error: ${JSON.stringify(err.response.data)}`);
    } else {
      console.error('Network or other error:', err.message);
      throw new Error(`Request failed: ${err.message}`);
    }
  }
}
