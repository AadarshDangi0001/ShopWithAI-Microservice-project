import dotenv from 'dotenv';
import ImageKit from 'imagekit';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

export async function uploadImage(buffer, filename, folder = '/products') {
    try {
        const result = await imagekit.upload({
            file: buffer,
            fileName: uuidv4(),
            folder,
        });
        return{
            url: result.url,
            thumbnail: result.thumbnailUrl,
            id: result.fileId
        };
    } catch (error) {
        console.error('Error uploading image to ImageKit:', error);
        throw new Error('Image upload failed');
    }
}

export async function deleteImage(imageUrl) {
    try {
        const fileId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        await imagekit.deleteFile(fileId);
    } catch (error) {
        console.error('Error deleting image from ImageKit:', error);
        throw new Error('Image deletion failed');
    }
}
