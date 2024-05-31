import postRouter from '../routes/post.js';
import Post from '../models/Post.js';
import userRouter from '../routes/user.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

import request from 'supertest';
import express from 'express';
import 'dotenv/config.js';
import { startMongoMemoryServer } from '../config/mongoDBTesting.js';
import {
  user1,
  passwordUser1,
  category1,
  category2,
  post1,
  post2,
  post3,
} from './mocks.js';
import mongoose from 'mongoose';

import passport from 'passport';
import { jwtStrategy } from '../config/passport.js';

const app = express();
passport.use(jwtStrategy);
await startMongoMemoryServer();

app.use(express.urlencoded({ extended: false }));
app.use('/users', userRouter);
app.use('/posts', postRouter);

describe('GET /posts', () => {
  describe('no auth', () => {
    it('should return a 401', (done) => {
      request(app).get('/posts').expect(401, done);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      await new User(user1).save();
      await new Category(category1).save();
      await new Category(category2).save();
      await new Post(post1).save();
      await new Post(post2).save();

      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    describe('without limit query parameter', () => {
      it('should return a 200 and an array of all post objects in descending order', (done) => {
        request(app)
          .get('/posts')
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body).toHaveLength(2);
            expect(
              res.body[0].created_at > res.body[1].created_at
            ).toBeTruthy();
          })
          .expect(200, done);
      });
    });

    describe('with limit query parameter', () => {
      it('should return a 200 and an array of post objects equal to the limit query parameter', (done) => {
        const limit = 1;

        request(app)
          .get(`/posts?limit=${limit}`)
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body).toHaveLength(limit);
          })
          .expect(200, done);
      });

      it('should return a 400 and an error message if the limit query parameter is not an integer', (done) => {
        const limit = 'yay!';

        request(app)
          .get(`/posts?limit=${limit}`)
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect(/must be an integer/i)
          .expect(400, done);
      });
    });
  });
});

describe('POST /posts', () => {
  let token = '';

  beforeAll(async () => {
    const response = await request(app)
      .post('/users/login')
      .type('form')
      .send({ username: user1.username, password: passwordUser1 })
      .expect(200);

    token = response.body;
  });

  describe('no auth', () => {
    it('should return a 401', (done) => {
      request(app).post('/posts').type('form').send(post3).expect(401, done);
    });
  });

  describe('valid post', () => {
    it('should return a 200 and a success message', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect(/successfully/i)
        .expect(200, done);
    });
  });

  describe('invalid post', () => {
    it('should return a 400 and an error message if the author is not a valid MongoDB ID', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, author: 'Me!' })
        .expect(/author field must be/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the title is too short', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, title: 'ti' })
        .expect(/post title must contain/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the title is too long', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({
          ...post3,
          title:
            'I am a rather very very very very very very very very long title, yep!',
        })
        .expect(/post title must contain/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the content is too short', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, content: 'Shorty' })
        .expect(/post content must contain/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the category is not a valid MongoDB ID', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, category: 'SliceOfLife' })
        .expect(/category field must be/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the author is not in the DB', (done) => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, author: validMongoID })
        .expect(/error while/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the category is not in the DB', (done) => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, category: validMongoID })
        .expect(/error while/i)
        .expect(400, done);
    });
  });
});
