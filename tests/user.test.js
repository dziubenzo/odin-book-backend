import userRouter from '../routes/user.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

import request from 'supertest';
import express from 'express';
import 'dotenv/config.js';
import {
  user1,
  passwordUser1,
  user2,
  passwordUser2,
  validCredentials,
  longBio,
  category1,
  category2,
} from './mocks.js';
import { startMongoMemoryServer } from '../config/mongoDBTesting.js';
import mongoose from 'mongoose';

import passport from 'passport';
import { jwtStrategy } from '../config/passport.js';
import { defaultAvatars } from '../config/helpers.js';

const app = express();
passport.use(jwtStrategy);
await startMongoMemoryServer();

app.use(express.urlencoded({ extended: false }));
app.use('/users', userRouter);

describe('GET /users', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app).get('/users').expect(401);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      await new User(user1).save();
      await new User(user2).save();

      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and an array of user objects', async () => {
      await request(app)
        .get('/users')
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('username', 'user1');
          expect(res.body[1]).toHaveProperty('username', 'user2');
        })
        .expect(200);
    });
  });
});

describe('POST /users', () => {
  describe('valid user credentials', () => {
    it('should return a 200 and a success message', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send(validCredentials)
        .expect(/successfully/i)
        .expect(200);
    });

    it('should assign a random default avatar', async () => {
      await request(app).post('/users').type('form').send(validCredentials);

      const { body: token } = await request(app)
        .post('/users/login')
        .type('form')
        .send({
          username: validCredentials.username,
          password: validCredentials.password,
        });

      const { body: user } = await request(app)
        .post('/users/auth')
        .auth(token, { type: 'bearer' });

      expect(defaultAvatars).toContain(user.avatar);
    });
  });

  describe('invalid user credentials', () => {
    it('should return a 400 and an error message if the username is too short', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send({ ...validCredentials, username: 'bz' })
        .expect(/username must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the username is too long', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send({ ...validCredentials, username: 'averyverylongusername' })
        .expect(/username must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the username starts with a number', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send({ ...validCredentials, username: '9badusername' })
        .expect(/cannot start with a number/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the username is already taken', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send(validCredentials)
        .expect(/already taken/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the password is too short', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send({
          username: 'cooluser',
          password: 'bz',
          confirm_password: 'bz',
        })
        .expect(/password must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the password is too long', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send({
          username: 'cooluser',
          password: 'averyverylongpassword',
          confirm_password: 'averyverylongpassword',
        })
        .expect(/password must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the passwords provided do not match', async () => {
      await request(app)
        .post('/users')
        .type('form')
        .send({
          username: 'cooluser',
          password: 'password1',
          confirm_password: 'password2',
        })
        .expect(/do not match/i)
        .expect(400);
    });
  });
});

describe('POST /users/login', () => {
  describe('valid user credentials', () => {
    it('should return a 200 and a string resembling a token', async () => {
      await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect((res) => {
          expect(res.body.length).toBeGreaterThan(100);
          expect(res.body.length).toBeLessThan(200);
        })
        .expect(200);
    });
  });

  describe('invalid user credentials', () => {
    it('should return a 401 and an error message if the username is incorrect', async () => {
      await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user2.username, password: passwordUser1 })
        .expect(/invalid username/i)
        .expect(401);
    });

    it('should return a 401 and an error message if the password is incorrect', async () => {
      await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser2 })
        .expect(/invalid username/i)
        .expect(401);
    });
  });
});

describe('POST /users/auth', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app)
        .post('/users/auth')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(401);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and a logged in user object without the password', async () => {
      await request(app)
        .post('/users/auth')
        .auth(token, { type: 'bearer' })
        .expect((res) => {
          expect(res.body.username).toBe(user1.username);
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('bio');
          expect(res.body).toHaveProperty('avatar');
          expect(res.body).not.toHaveProperty('password');
        })
        .expect(200);
    });
  });
});

describe('PUT /users/:username/update', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app)
        .put(`/users/${user1.username}/update`)
        .type('form')
        .send({ bio: 'My super bio, yo!', avatar: 'https://example.com' })
        .expect(401);
    });
  });

  describe('auth', () => {
    let token = '';
    const file = Buffer.from('A legit file');

    beforeAll(async () => {
      vi.mock('../config/cloudinary.js', () => {
        return {
          handleUpload: vi
            .fn()
            .mockResolvedValue({ secure_url: 'cool_cat_image.png' }),
        };
      });
      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and an updated user with changed bio and avatar', async () => {
      await request(app)
        .put(`/users/${user1.username}/update`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ bio: 'My super bio, yo!', avatar: 'https://example.com' })
        .expect((res) => {
          expect(res.body.bio).toBe('My super bio, yo!');
          expect(res.body.avatar).toBe('https://example.com');
        })
        .expect(200);
    });

    it('should return a 200 and an updated user with their avatar changed to the uploaded image', async () => {
      await request(app)
        .put(`/users/${user1.username}/update`)
        .auth(token, { type: 'bearer' })
        .attach('uploaded_avatar', file, 'cool_cat_image.png')
        .expect((res) => {
          expect(res.body.avatar).toBe('cool_cat_image.png');
        })
        .expect(200);
    });

    it('should return a 200 and set the avatar to the uploaded image if the default avatar is also provided', async () => {
      await request(app)
        .put(`/users/${user1.username}/update`)
        .auth(token, { type: 'bearer' })
        .field('avatar', 'https://example.com')
        .attach('uploaded_avatar', file, 'cool_cat_image.png')
        .expect((res) => {
          expect(res.body.avatar).toBe('cool_cat_image.png');
        })
        .expect(200);
    });

    it('should return a 400 and an error message if the bio exceeds the maximum number of characters', async () => {
      await request(app)
        .put(`/users/${user1.username}/update`)
        .auth(token, { type: 'bearer' })
        .field('bio', longBio)
        .expect(/bio cannot exceed/i)
        .expect(400);
    });
  });
});

describe('PUT /users/:username/update_category', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_category`)
        .type('form')
        .send({ category_id: category1._id.toString() })
        .expect(401);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      await new Category(category1).save();

      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and add a category to the followed categories field', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_category`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ category_id: category1._id.toString() })
        .expect((res) => {
          expect(res.body.followed_categories).toContain(
            category1._id.toString()
          );
        })
        .expect(200);
    });

    it('should return a 200 and remove a category from the followed categories field if it is already followed', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_category`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ category_id: category1._id.toString() })
        .expect((res) => {
          expect(res.body.followed_categories).not.toContain(
            category1._id.toString()
          );
        })
        .expect(200);
    });

    it('should return a 200 and the user object with no password', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_category`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ category_id: category1._id.toString() })
        .expect((res) => {
          expect(res.body).not.toHaveProperty('password');
        })
        .expect(200);
    });

    it('should return a 400 and an error message if the category_id field is not a valid MongoDB ID', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_category`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ category_id: "I'm a valid category, for sure!" })
        .expect(/valid mongodb id/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the category is not in the DB', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_category`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ category_id: category2._id.toString() })
        .expect(/error while/i)
        .expect(400);
    });
  });
});

describe('PUT /users/:username/update_user', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .type('form')
        .send({ user_id: user2._id.toString() })
        .expect(401);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and add a user to the followed users field', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user_id: user2._id.toString() })
        .expect((res) => {
          expect(res.body.followed_users).toContain(user2._id.toString());
        })
        .expect(200);
    });

    it('should return a 200 and remove a user from the followed users field if it is already followed', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user_id: user2._id.toString() })
        .expect((res) => {
          expect(res.body.followed_users).not.toContain(user2._id.toString());
        })
        .expect(200);
    });

    it('should return a 200 and the user object with no password', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user_id: user2._id.toString() })
        .expect((res) => {
          expect(res.body).not.toHaveProperty('password');
        })
        .expect(200);
    });

    it('should return a 400 and an error message if the user_id field is not a valid MongoDB ID', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user_id: "I've never been more valid than this..." })
        .expect(/valid mongodb id/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the user is not in the DB', async () => {
      const validID = new mongoose.Types.ObjectId();

      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user_id: validID.toString() })
        .expect(/error while/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the logged in user attempts to follow themselves', async () => {
      await request(app)
        .put(`/users/${user1.username}/update_user`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user_id: user1._id.toString() })
        .expect(/follow yourself/i)
        .expect(400);
    });
  });
});

describe('GET /users/:username', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app).get(`/users/${user1.username}`).expect(401);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and a user object with stats properties', async () => {
      await request(app)
        .get(`/users/${user2.username}`)
        .auth(token, { type: 'bearer' })
        .expect((res) => {
          expect(res.body.username).toBe(user2.username);
          expect(res.body.bio).toBe(user2.bio);
          expect(res.body.avatar).toBe(user2.avatar);
          expect(res.body).toHaveProperty('postsCount');
          expect(res.body).toHaveProperty('postLikesCount');
          expect(res.body).toHaveProperty('postDislikesCount');
          expect(res.body).toHaveProperty('commentsCount');
          expect(res.body).toHaveProperty('commentLikesCount');
          expect(res.body).toHaveProperty('commentDislikesCount');
          expect(res.body).toHaveProperty('followersCount');
        })
        .expect(200);
    });

    it('should return a 400 and an error message if the user is not in the DB', async () => {
      const fakeUsername = 'fakeUsername';

      await request(app)
        .get(`/users/${fakeUsername}`)
        .auth(token, { type: 'bearer' })
        .expect(/error while/i)
        .expect(400);
    });
  });
});
