import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

/* 
Mongo IDs
*/

export const idUser1 = new mongoose.Types.ObjectId();
export const idUser2 = new mongoose.Types.ObjectId();
export const idUser3 = new mongoose.Types.ObjectId();

export const idCategory1 = new mongoose.Types.ObjectId();
export const idCategory2 = new mongoose.Types.ObjectId();
export const idCategory3 = new mongoose.Types.ObjectId();

export const idPost1 = new mongoose.Types.ObjectId();
export const idPost2 = new mongoose.Types.ObjectId();
export const idPost3 = new mongoose.Types.ObjectId();
export const idPost4 = new mongoose.Types.ObjectId();

export const idComment2 = new mongoose.Types.ObjectId();

/* 
Users
*/

export const passwordUser1 = 'password1';
export const passwordUser2 = 'password2';
export const passwordUser3 = 'password3';

export const user1 = {
  _id: idUser1,
  username: `user1`,
  password: await bcrypt.hash(passwordUser1, 10),
  registered_at: Date.now(),
  avatar: '',
  bio: 'Default Bio',
  followed_users: [],
  followed_categories: [],
  __v: 0,
};
export const user2 = {
  ...user1,
  _id: idUser2,
  username: 'user2',
  password: await bcrypt.hash(passwordUser2, 10),
};

export const user3 = {
  ...user1,
  _id: idUser3,
  username: 'user3',
  password: await bcrypt.hash(passwordUser3, 10),
  followed_users: [idUser1.toString()],
  followed_categories: [idCategory1.toString()],
};

export const validCredentials = {
  username: 'user3',
  password: 'password',
  confirm_password: 'password',
};

export const longBio =
  'Lorem ipsum dolor sit amet. Non numquam deserunt cum deserunt voluptatem sit iure eaque eos consectetur voluptatem aut similique corrupti et libero quos sed corrupti maxime.';

/* 
Categories
*/

export const category1 = {
  _id: idCategory1,
  name: 'Cats',
  icon: '',
  description: 'Feline category, yay!',
  created_at: Date.now(),
  slug: slugify('Cats', { lower: true }),
};

export const category2 = {
  ...category1,
  _id: idCategory2,
  name: 'Dogs',
  description: 'Canine category, yay!',
  slug: slugify('Dogs', { lower: true }),
};

export const category3 = {
  name: 'Rabbits',
  description: 'Rabbit-ish category, yay!',
};

export const longDescription =
  'Lorem ipsum dolor sit amet. Non numquam deserunt cum deserunt voluptatem sit iure eaque eos consectetur voluptatem aut similique corrupti et libero quos sed corrupti maxime. Vel rerum similique ea consequatur asperiores qui fugiat fugit est expedita praesentium et doloribus fugit ut veritatis consequatur et dolore nesciunt? Non corporis dolorum aut dolore quas At voluptate nesciunt ut saepe pariatur ut dolorem consequatur 33 deleniti deleniti! Et commodi laboriosam ut voluptatem inventore vel totam quod et suscipit rerum ea repellendus unde ad galisum quibusdam ex labore asperiores. Aut repellat sunt et facere voluptatem est dolorum culpa.';

/* 
Posts
*/

export const post1 = {
  _id: idPost1,
  author: idUser1.toString(),
  title: 'Post 1',
  content: 'Post 1 Content, yay!',
  category: idCategory1.toString(),
  // Make the date 1 second later for comparison purposes
  created_at: Date.now() + 1000,
  likes: [],
  comments: [],
  slug: slugify('Post 1', { lower: true }),
};

export const post2 = {
  ...post1,
  _id: idPost2,
  title: 'Post 2',
  content: 'Post 2 Content, yay!',
  category: idCategory2.toString(),
  created_at: Date.now(),
  slug: slugify('Post 2', { lower: true }),
};

export const post3 = {
  ...post1,
  _id: idPost3,
  title: 'Post 3',
  content: 'Post 3 Content, yay!',
  category: idCategory1.toString(),
  created_at: Date.now(),
  slug: slugify('Post 3', { lower: true }),
};

export const post4 = {
  ...post1,
  _id: idPost4,
  author: idUser3.toString(),
  title: 'Post 4',
  content: 'Post 4 Content, yay!',
  category: idCategory1.toString(),
  created_at: Date.now(),
  likes: [idUser3.toString()],
  slug: slugify('Post 4', { lower: true }),
};

/* 
Comments
*/

export const comment2 = {
  _id: idComment2,
  author: idUser1.toString(),
  content: 'Comment 2, woo hoo!',
  created_at: Date.now(),
  likes: [],
};

/* 
YouTube links
*/

export const goodYouTubeLink = 'https://www.youtube.com/embed/goodlink';
export const badYouTubeLink = 'https://www.google.com/embed/badlink';
