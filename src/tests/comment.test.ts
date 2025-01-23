import 'dotenv/config.js';
import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import request from 'supertest';
import { startMongoMemoryServer } from '../config/mongoDBTesting';
import { jwtStrategy } from '../config/passport';
import Category from '../models/Category';
import Comment from '../models/Comment';
import Post from '../models/Post';
import User from '../models/User';
import commentRouter from '../routes/comment';
import postRouter from '../routes/post';
import userRouter from '../routes/user';
import {
  category1,
  comment2,
  idComment2,
  longDescription,
  passwordUser1,
  post1,
  user1,
} from './mocks';

const app = express();
passport.use(jwtStrategy);
await startMongoMemoryServer();

app.use(express.urlencoded({ extended: false }));
app.use('/users', userRouter);
app.use('/posts', postRouter);
app.use('/posts/:slug/comments', commentRouter);

describe('POST /posts/:slug/comments', () => {
  describe('no auth', () => {
    it('should return a 401', async () => {
      await request(app)
        .post(`/posts/${post1.slug}/comments`)
        .type('form')
        .send({ author: user1._id.toString(), content: 'Comment!' })
        .expect(401);
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
      it('should return a 200 and the updated post with all necessary fields that includes the new comment as well ', async () => {
        await request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: user1._id.toString(), content: 'Comment 1' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body.author).toBeDefined();
            expect(res.body.author).toHaveProperty('username', user1.username);
            expect(res.body.author).toHaveProperty('avatar', user1.avatar);
            expect(res.body.category).toBeDefined();
            expect(res.body.category).toHaveProperty('name', category1.name);
            expect(res.body.category).toHaveProperty('slug', category1.slug);
            expect(res.body.comments[0]).toHaveProperty(
              'author._id',
              user1._id.toString()
            );
            expect(res.body.likes).toHaveLength(0);
            expect(res.body.comments[0]).toHaveProperty('content', 'Comment 1');
          })
          .expect(200);
      });
    });

    describe('invalid comment', async () => {
      it('should return a 400 and an error message if the author is not a valid MongoDB ID', async () => {
        await request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({
            author: 'Bad author!',
            content: 'Good comment for a change',
          })
          .expect(/author field must be/i)
          .expect(400);
      });

      it('should return a 400 and an error message if the content is too short', async () => {
        await request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: user1._id.toString(), content: 'Bz' })
          .expect(/comment content must contain/i)
          .expect(400);
      });

      it('should return a 400 and an error message if the content is too long', async () => {
        await request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: user1._id.toString(), content: longDescription })
          .expect(/comment content must contain/i)
          .expect(400);
      });

      it('should return a 400 and an error message if the author does not exist in the DB', async () => {
        const validMongoID = new mongoose.Types.ObjectId().toString();

        await request(app)
          .post(`/posts/${post1.slug}/comments`)
          .auth(token, { type: 'bearer' })
          .type('form')
          .send({ author: validMongoID, content: 'Happy comment!' })
          .expect(/error while/i)
          .expect(400);
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
    it('should return a 401', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .type('form')
        .send({ user: user1._id })
        .expect(401);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'SuperUser' })
        .expect(/user field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the user is not in the DB', async () => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: validMongoID })
        .expect(/error while/i)
        .expect(400);
    });
  });

  describe('valid user', () => {
    it('should return a 200 and a success message', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/liked successfully/i)
        .expect(200);
    });

    it('should return a 200 and a success message if the user has already liked the comment', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/unliked successfully/i)
        .expect(200);
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
    it('should return a 401', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .type('form')
        .send({ user: user1._id })
        .expect(401);
    });
  });

  describe('invalid user', async () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'CoolUser' })
        .expect(/user field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the user is not in the DB', async () => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: validMongoID })
        .expect(/error while/i)
        .expect(400);
    });
  });

  describe('valid user', () => {
    it('should return a 200 and a success message', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/disliked successfully/i)
        .expect(200);
    });

    it('should return a 200 and a success message if the user has already disliked the comment', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/comments/${idComment2}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/undisliked successfully/i)
        .expect(200);
    });
  });
});
