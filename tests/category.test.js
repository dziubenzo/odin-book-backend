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
  longDescription,
} from './mocks.js';
import { defaultCategoryIcon } from '../config/helpers.js';

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
    it('should return a 401', async () => {
      await request(app).get('/categories').expect(401);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      await new User(user1).save();
      await new Category(category1).save();
      await new Category(category2).save();

      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    it('should return a 200 and an array of category objects', async () => {
      await request(app)
        .get('/categories')
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('name', category1.name);
          expect(res.body[1]).toHaveProperty('name', category2.name);
        })
        .expect(200);
    });
  });
});

describe('POST /categories', () => {
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
    it('should return a 401', async () => {
      await request(app)
        .post('/categories')
        .type('form')
        .send(category3)
        .expect(401);
    });
  });

  describe('valid category', () => {
    it('should return a 200 and a success message', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(category3)
        .expect(/successfully/i)
        .expect(200);
    });

    it('should assign a default category icon if an icon is not provided', async () => {
      await request(app)
        .get('/categories')
        .auth(token, { type: 'bearer' })
        .expect((res) => {
          expect(res.body[res.body.length - 1]).toHaveProperty(
            'icon',
            defaultCategoryIcon
          );
        })
        .expect(200);
    });
  });

  describe('invalid category', () => {
    it('should return a 400 and an error message if the name is too short', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...category3, name: 'sh' })
        .expect(/name must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the name is too long', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({
          ...category3,
          name: 'a-very-very-very-very-verylongname',
        })
        .expect(/name must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the name does not match the pattern', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...category3, name: '99badcategory' })
        .expect(/start with a letter/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the name is already taken', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(category3)
        .expect(/already exists/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the description is too short', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ name: 'validname', description: 'de' })
        .expect(/description must contain between/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the description is too long', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ name: 'validname', description: longDescription })
        .expect(/description must contain between/i)
        .expect(400);
    });
  });
});

describe('GET /categories/:slug', () => {
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
    it('should return a 401', async () => {
      await request(app).get(`/categories/${category1.slug}`).expect(401);
    });
  });

  describe('category exists', () => {
    it('should return a 200 and the requested category object', async () => {
      await request(app)
        .get(`/categories/${category1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', category1.name);
          expect(res.body).toHaveProperty('description', category1.description);
          expect(res.body).toHaveProperty('slug', category1.slug);
        })
        .expect(200);
    });
  });

  describe('category does not exist', () => {
    it('should return a 404 and an error message', async () => {
      await request(app)
        .get(`/categories/i-do-not-exist`)
        .auth(token, { type: 'bearer' })
        .expect(/category not found/i)
        .expect(404);
    });
  });
});
