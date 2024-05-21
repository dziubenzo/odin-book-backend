import userRouter from '../routes/user.js';
import User from '../models/User.js';

import request from 'supertest';
import express from 'express';
import { user1, user2 } from './mocks.js';
import { startMongoMemoryServer } from '../config/mongoDBTesting.js';

const app = express();
await startMongoMemoryServer();

app.use(express.urlencoded({ extended: false }));
app.use('/users', userRouter);

describe('GET /users', () => {
  describe('no users in the DB', () => {
    it('should return a 404 and an empty array', (done) => {
      request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(404, [], done);
    });
  });

  describe('users in the DB', () => {
    beforeEach(async () => {
      await new User(user1).save();
      await new User(user2).save();
    });

    it('should return 200 and an array of user objects', (done) => {
      request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('username', 'user1');
          expect(res.body[1]).toHaveProperty('username', 'user2');
        })
        .expect(200, done);
    });
  });
});
