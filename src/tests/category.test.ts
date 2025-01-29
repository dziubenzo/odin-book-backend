import 'dotenv/config.js';
import express from 'express';
import passport from 'passport';
import request from 'supertest';
import { vi } from 'vitest';
import { defaultCategoryIcon } from '../config/helpers';
import { startMongoMemoryServer } from '../config/mongoDBTesting';
import { jwtStrategy } from '../config/passport';
import Category from '../models/Category';
import User from '../models/User';
import categoryRouter from '../routes/category';
import userRouter from '../routes/user';
import {
  category1,
  category2,
  category3,
  category4,
  longDescription,
  passwordUser1,
  user1,
} from './mocks';

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
  const file = Buffer.from('Another legit file');

  beforeAll(async () => {
    vi.mock('../config/cloudinary', () => {
      return {
        handleUpload: vi
          .fn()
          .mockResolvedValue({ secure_url: 'cool_cat_category_icon.png' }),
      };
    });
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

    it('should return a 200 and a success message for a category containing question marks in its name', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(category4)
        .expect(/successfully/i)
        .expect(200);
    });

    it('should convert question marks into the qm string for its slug', async () => {
      const expectedSlug = 'qmquestionqmmarks';

      await request(app)
        .get(`/categories/${expectedSlug}`)
        .auth(token, { type: 'bearer' })
        .expect((res) => {
          expect(res.body).toHaveProperty('slug', expectedSlug);
        })
        .expect(200);
    });

    it('should assign a default category icon if an icon is not provided', async () => {
      await request(app)
        .get(`/categories/${category3.slug}`)
        .auth(token, { type: 'bearer' })
        .expect((res) => {
          expect(res.body).toHaveProperty('icon', defaultCategoryIcon);
        })
        .expect(200);
    });

    it('should return a 200 if an icon is attached with the request', async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .field('name', 'Category 4')
        .field('description', 'Category 4 Description')
        .attach('uploaded_icon', file, 'cool_cat_category_icon.png')
        .expect(/successfully/i)
        .expect(200);
    });

    it('should assign the uploaded category icon to the created category', async () => {
      await request(app)
        .get(`/categories/category-4`)
        .auth(token, { type: 'bearer' })
        .expect((res) => {
          expect(res.body).toHaveProperty('icon', 'cool_cat_category_icon.png');
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
        .send({ ...category3, name: '0badcategory' })
        .expect(/cannot start with a number/i)
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

    it("should return a 400 and an error message if the name is 'new'", async () => {
      await request(app)
        .post('/categories')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...category3, name: 'New' })
        .expect(/prohibited/i)
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
    it('should return a 200 and the requested category object with the count of category posts and followers', async () => {
      await request(app)
        .get(`/categories/${category1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', category1.name);
          expect(res.body).toHaveProperty('description', category1.description);
          expect(res.body).toHaveProperty('slug', category1.slug);
          expect(res.body).toHaveProperty('postsCount');
          expect(res.body.postsCount >= 0).toBeTruthy();
          expect(res.body).toHaveProperty('followersCount');
          expect(res.body.followersCount >= 0).toBeTruthy();
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
