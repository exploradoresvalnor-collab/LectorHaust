const axios = require('axios');

const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';
const BASE_URL = 'https://safebooru.org/index.php';
const TAGS = 'scenery landscape rating:safe'; // Testing with spaces
const LIMIT = 5;

async function testApi() {
  const tagsFormatted = TAGS.replace(/\s+/g, '+');
  const apiUrl = `${BASE_URL}?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tagsFormatted)}&limit=${LIMIT}`;
  const requestUrl = `${PROXY_URL}${encodeURIComponent(apiUrl)}`;

  console.log('--- DIAGNOSTIC START ---');
  console.log('Original API URL:', apiUrl);
  console.log('Proxy Request URL:', requestUrl);

  try {
    const response = await axios.get(requestUrl);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Data Type:', typeof response.data);
    
    if (typeof response.data === 'string') {
      console.log('Data (first 200 chars):', response.data.substring(0, 200));
      try {
        const parsed = JSON.parse(response.data);
        console.log('JSON parsed successfully. Array size:', Array.isArray(parsed) ? parsed.length : 'Not an array');
      } catch (e) {
        console.error('Failed to parse as JSON:', e.message);
      }
    } else {
      console.log('Data (Raw JSON):', JSON.stringify(response.data).substring(0, 200));
      console.log('Is Array:', Array.isArray(response.data));
    }
  } catch (error) {
    console.error('Request failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
  console.log('--- DIAGNOSTIC END ---');
}

testApi();
