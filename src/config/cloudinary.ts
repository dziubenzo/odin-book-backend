import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Transform received avatar/icon and upload it to Cloudinary
export async function handleUpload(file: Express.Multer.File, path: string) {
  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

  const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
    folder: path,
    resource_type: 'image',
    transformation: ['roundify'],
  });
  return cloudinaryRes;
}

// Transform received post image and upload it to Cloudinary
export async function handlePostImageUpload(buffer, mimetype) {
  const b64 = Buffer.from(buffer).toString('base64');
  const dataURI = 'data:' + mimetype + ';base64,' + b64;

  const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
    folder: 'odin_book/images',
    resource_type: 'image',
    // Do not transform GIFs
    transformation: mimetype === 'image/gif' ? [] : ['smallify'],
  });
  return cloudinaryRes;
}
