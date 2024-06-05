import postRouter from '../routes/post.js';
import Post from '../models/Post.js';
import userRouter from '../routes/user.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import commentRouter from '../routes/comment.js';
import Comment from '../models/Comment.js';

import request from 'supertest';
import express from 'express';
import 'dotenv/config.js';
import { startMongoMemoryServer } from '../config/mongoDBTesting.js';
import {
  user1,
  passwordUser1,
  category1,
  post1,
  longDescription,
  idComment2,
  comment2,
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

describe('POST /posts/:slug/comments', () => {
  describe('no auth', () => {
    it('should return a 401', (done) => {
      request(app)
        .post(`/posts/${post1.slug}/comments`)
        .type('form')
        .send({ author: user1._id.toString(), content: 'Comment!' })
        .expect(401, done);
    });
  });

  describe('auth', () => {
    let token = '';

    beforeAll(async () => {
      await new User(user1).save();
      await new Category(category1).save();
      await new Post(post1).save();

      const response = await request(app)
        .post('/users/login')
        .type('form')
        .send({ username: user1.username, password: passwordUser1 })
        .expect(200);

      token = response.body;
    });

    describe('valid comment', () => {
      it('should return a 200 and the updated post that includes the new comment', (done) => {
        request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: user1._id.toString(), content: 'Comment 1' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body.comments).toHaveLength(1);
            expect(res.body.comments[0]).toHaveProperty(
              'author._id',
              user1._id.toString()
            );
            expect(res.body.comments[0]).toHaveProperty('content', 'Comment 1');
          })
          .expect(200, done);
      });
    });

    describe('invalid comment', () => {
      it('should return a 400 and an error message if the author is not a valid MongoDB ID', (done) => {
        request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({
            author: 'Bad author!',
            content: 'Good comment for a change',
          })
          .expect(/author field must be/i)
          .expect(400, done);
      });

      it('should return a 400 and an error message if the content is too short', (done) => {
        request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: user1._id.toString(), content: 'Bz' })
          .expect(/comment content must contain/i)
          .expect(400, done);
      });

      it('should return a 400 and an error message if the content is too long', (done) => {
        request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: user1._id.toString(), content: longDescription })
          .expect(/comment content must contain/i)
          .expect(400, done);
      });

      it('should return a 400 and an error message if the author does not exist in the DB', (done) => {
        const validMongoID = new mongoose.Types.ObjectId().toString();

        request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: validMongoID, content: 'Happy comment!' })
          .expect(/error while/i)
          .expect(400, done);
      });
    });
  });
});

describe('PUT /posts/:slug/comments/:commentID/like', () => {
  let token = '';

  beforeAll(async () => {
    await new Comment(comment2).save();

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
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .type('form')
        .send({ user: user1._id })
        .expect(401, done);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'SuperUser' })
        .expect(/user field must be/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the user is not in the DB', (done) => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
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
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/liked successfully/i)
        .expect(200, done);
    });

    it('should return a 200 and a success message if the user has already liked the comment', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/unliked successfully/i)
        .expect(200, done);
    });
  });
});

describe('PUT /posts/:slug/comments/:commentID/dislike', () => {
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
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .type('form')
        .send({ user: user1._id })
        .expect(401, done);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'CoolUser' })
        .expect(/user field must be/i)
        .expect(400, done);
    });

    it('should return a 400 and an error message if the user is not in the DB', (done) => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
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
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/disliked successfully/i)
        .expect(200, done);
    });

    it('should return a 200 and a success message if the user has already disliked the comment', (done) => {
      request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/undisliked successfully/i)
        .expect(200, done);
    });
  });
});
