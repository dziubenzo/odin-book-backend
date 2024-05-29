import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

/* 
Users
*/

export const passwordUser1 = 'password1';
export const passwordUser2 = 'password2';

export const user1 = {
  _id: new mongoose.Types.ObjectId(),
  username: `user1`,
  password: await bcrypt.hash(passwordUser1, 10),
  registered_at: Date.now(),
  avatar: '',
  bio: '',
  followed_users: [],
  followed_categories: [],
  __v: 0,
};
export const user2 = {
  ...user1,
  _id: new mongoose.Types.ObjectId(),
  username: 'user2',
  password: await bcrypt.hash(passwordUser2, 10),
};

export const validCredentials = {
  username: 'user3',
  password: 'password',
  confirm_password: 'password',
};

/* 
Categories
*/

export const category1 = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Cats',
  icon: '',
  description: 'Feline category, yay!',
  created_at: Date.now(),
  slug: slugify('Cats', { lower: true }),
};

export const category2 = {
  ...category1,
  _id: new mongoose.Types.ObjectId(),
  name: 'Dogs',
  description: 'Canine category, yay!',
  slug: slugify('Dogs', { lower: true }),
};

export const category3 = {
  ...category1,
  _id: new mongoose.Types.ObjectId(),
  name: 'Rabbits',
  description: 'Rabbit-ish category, yay!',
  slug: slugify('Rabbits', { lower: true }),
};

export const longDescription = 'Lorem ipsum dolor sit amet. Non numquam deserunt cum deserunt voluptatem sit iure eaque eos consectetur voluptatem aut similique corrupti et libero quos sed corrupti maxime. Vel rerum similique ea consequatur asperiores qui fugiat fugit est expedita praesentium et doloribus fugit ut veritatis consequatur et dolore nesciunt? Non corporis dolorum aut dolore quas At voluptate nesciunt ut saepe pariatur ut dolorem consequatur 33 deleniti deleniti! Et commodi laboriosam ut voluptatem inventore vel totam quod et suscipit rerum ea repellendus unde ad galisum quibusdam ex labore asperiores. Aut repellat sunt et facere voluptatem est dolorum culpa.'