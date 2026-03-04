import dotenv from 'dotenv';
import ImageKit from '@imagekit/nodejs';

dotenv.config();

const { IMAGEKIT_URL_ENDPOINT, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, NODE_ENV } = process.env;

let imagekitClient;

if (NODE_ENV === 'test') {
  imagekitClient = {
    async upload({ fileName }) {
      return {
        url: `https://example.com/${fileName}`,
        thumbnailUrl: `https://example.com/thumb-${fileName}`,
        fileId: `test_${fileName}`,
      };
    },
  };
} else if (IMAGEKIT_URL_ENDPOINT && IMAGEKIT_PUBLIC_KEY && IMAGEKIT_PRIVATE_KEY) {
  imagekitClient = new ImageKit({
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
  });
} else {
  imagekitClient = {
    async upload() {
      throw new Error('ImageKit credentials are not configured');
    },
  };
}

export default imagekitClient;
