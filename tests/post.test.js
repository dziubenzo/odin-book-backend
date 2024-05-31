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
} from './mocks.js';

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
      it('should return a 200 and an array of post objects equal to limit query parameter', (done) => {
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
