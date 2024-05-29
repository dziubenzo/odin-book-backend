import categoryRouter from '../routes/category.js';
import Category from '../models/Category.js';
import userRouter from '../routes/user.js';
import User from '../models/User.js';

import request from 'supertest';
import express from 'express';
import 'dotenv/config.js';
import { startMongoMemoryServer } from '../config/mongoDBTesting.js';
import {
  user1,
  passwordUser1,
  category1,
  category2,
  category3,
} from './mocks.js';

import passport from 'passport';
import { jwtStrategy } from '../config/passport.js';

const app = express();
passport.use(jwtStrategy);
await startMongoMemoryServer();

app.use(express.urlencoded({ extended: false }));
app.use('/users', userRouter);
app.use('/categories', categoryRouter);

describe('GET /categories', () => {
  describe('no auth', () => {
    it('should return a 401', (done) => {
      request(app).get('/categories').expect(401, done);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      await new User(user1).save();
      await Promise.all[
        (new Category(category1).save(), new Category(category2).save())
      ];

      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and an array of category objects', (done) => {
      request(app)
        .get('/categories')
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('name', category1.name);
          expect(res.body[1]).toHaveProperty('name', category2.name);
        })
        .expect(200, done);
    });
  });
});