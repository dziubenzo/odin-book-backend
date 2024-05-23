import userRouter from '../routes/user.js';
import User from '../models/User.js';

import request from 'supertest';
import express from 'express';
import 'dotenv/config.js';
import { user1, passwordUser1, user2, validCredentials } from './mocks.js';
import { startMongoMemoryServer } from '../config/mongoDBTesting.js';

import passport from 'passport';
import { jwtStrategy } from '../config/passport.js';

const app = express();
passport.use(jwtStrategy);
await startMongoMemoryServer();

app.use(express.urlencoded({ extended: false }));
app.use('/users', userRouter);

describe('GET /users', () => {
  describe('no auth', () => {
    it('should return a 401', (done) => {
      request(app).get('/users').expect(401, done);
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

    it('should return a 200 and an array of user objects', (done) => {
      request(app)
        .get('/users')
        .auth(token, { type: 'bearer' })
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

describe('POST /users', () => {
  describe('valid user credentials', () => {
    it('should return a 200 and a success message', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send(validCredentials)
        .expect(/successfully/i)
        .expect(200, done);
    });
  });

  describe('invalid user credentials', () => {
    it('should return a 400 and an error message if the username is too short', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send({ ...validCredentials, username: 'bz' })
        .expect(/username must contain between/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the username is too long', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send({ ...validCredentials, username: 'averyverylongusername' })
        .expect(/username must contain between/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the username does not match the pattern', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send({ ...validCredentials, username: '99badusername' })
        .expect(/start with a letter/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the username is already taken', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send(validCredentials)
        .expect(/already taken/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the password is too short', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send({
          username: 'cooluser',
          password: 'bz',
          confirm_password: 'bz',
        })
        .expect(/password must contain between/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the password is too long', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send({
          username: 'cooluser',
          password: 'averyverylongpassword',
          confirm_password: 'averyverylongpassword',
        })
        .expect(/password must contain between/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the passwords provided do not match', (done) => {
      request(app)
        .post('/users')
        .type('form')
        .send({
          username: 'cooluser',
          password: 'password1',
          confirm_password: 'password2',
        })
        .expect(/do not match/i)
        .expect(400, done);
    });
  });
});
