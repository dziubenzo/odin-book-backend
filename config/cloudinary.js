import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Transform received image and upload it to Cloudinary
export async function handleUpload(file, path) {
  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

  const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
    folder: path,
    resource_type: 'image',
    transformation: ['roundify'],
  });
  return cloudinaryRes;
}