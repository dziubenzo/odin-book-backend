import postRouter from '../routes/post.js';
import Post from '../models/Post.js';
import userRouter from '../routes/user.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import commentRouter from '../routes/comment.js';

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
app.use('/posts/:slug/comments', commentRouter);

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

      it('should return post objects with populated author and category fields', (done) => {
        request(app)
          .get('/posts')
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body[0]).toHaveProperty(
              'author.username',
              user1.username
            );
            expect(res.body[0]).toHaveProperty('category.name', category1.name);
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
    it('should return a 200 and the new post that is liked by the post author', (done) => {
      request(app)
        .post('/posts')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect((res) => {
          expect(res.body).toHaveProperty('author', post3.author);
          expect(res.body).toHaveProperty('content', post3.content);
          expect(res.body.likes).toHaveLength(1);
          expect(res.body.likes).toContain(post3.author);
        })
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

describe('GET /posts/:slug', () => {
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
      request(app).get(`/posts/${post1.slug}`).expect(401, done);
    });
  });

  describe('post exists', () => {
    it('should return a 200 and the requested post object with populated author and category fields', (done) => {
      request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('title', post1.title);
          expect(res.body).toHaveProperty('author.username', user1.username);
          expect(res.body).toHaveProperty('category.name', category1.name);
        })
        .expect(200, done);
    });
  });

  describe('post does not exist', () => {
    it('should return a 404 and an error message', (done) => {
      request(app)
        .get(`/posts/i-do-not-exist`)
        .auth(token, { type: 'bearer' })
        .expect(/post not found/i)
        .expect(404, done);
    });
  });
});

describe('PUT /posts/:slug/like', () => {
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
      request(app)
        .put(`/posts/${post1.slug}/like`)
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(401, done);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'Valid user, surely!' })
        .expect(/user field must be/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the user is not in the DB', (done) => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      request(app)
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: validMongoID })
        .expect(/error while/i)
        .expect(400, done);
    });
  });

  describe('valid user', () => {
    it('should return a 200 and a success message', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/liked successfully/i)
        .expect(200, done);
    });

    it('should add a like to the likes array and remove a dislike from the dislikes array', (done) => {
      request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.likes).toContain(user1._id.toString());
          expect(res.body.dislikes).not.toContain(user1._id.toString());
        })
        .expect(200, done);
    });

    it('should return a 200 and a success message if the user has already liked the post', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/unliked successfully/i)
        .expect(200, done);
    });

    it('should remove a like from the likes array', (done) => {
      request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.likes).not.toContain(user1._id.toString());
        })
        .expect(200, done);
    });
  });
});

describe('PUT /posts/:slug/dislike', () => {
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
      request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .type('form')
        .send({ user: user1._id })
        .expect(401, done);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'Valid user, yep!' })
        .expect(/user field must be/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the user is not in the DB', (done) => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: validMongoID })
        .expect(/error while/i)
        .expect(400, done);
    });
  });

  describe('valid user', () => {
    it('should return a 200 and a success message', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/disliked successfully/i)
        .expect(200, done);
    });

    it('should add a dislike to the dislikes array and remove a like from the likes array', (done) => {
      request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.dislikes).toContain(user1._id.toString());
          expect(res.body.likes).not.toContain(user1._id.toString());
        })
        .expect(200, done);
    });

    it('should return a 200 and a success message if the user has already disliked the post', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/undisliked successfully/i)
        .expect(200, done);
    });

    it('should remove a dislike from the dislikes array', (done) => {
      request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.dislikes).not.toContain(user1._id.toString());
        })
        .expect(200, done);
    });
  });
});
