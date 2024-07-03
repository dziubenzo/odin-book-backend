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
  goodYouTubeLink,
  badYouTubeLink,
} from './mocks.js';
import mongoose from 'mongoose';
import fetch from 'node-fetch';

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
    it('should return a 401', async () => {
      await request(app).get('/posts').expect(401);
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
      it('should return a 200 and an array of all post objects in descending order', async () => {
        await request(app)
          .get('/posts')
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body).toHaveLength(2);
            expect(
              res.body[0].created_at > res.body[1].created_at
            ).toBeTruthy();
          })
          .expect(200);
      });

      it('should return post objects with populated author and category fields', async () => {
        await request(app)
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
          .expect(200);
      });
    });

    describe('with limit query parameter', () => {
      it('should return a 200 and an array of post objects equal to the limit query parameter', async () => {
        const limit = 1;

        await request(app)
          .get(`/posts?limit=${limit}`)
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect((res) => {
            expect(res.body).toHaveLength(limit);
          })
          .expect(200);
      });

      it('should return a 400 and an error message if the limit query parameter is not an integer', async () => {
        const limit = 'yay!';

        await request(app)
          .get(`/posts?limit=${limit}`)
          .auth(token, { type: 'bearer' })
          .expect('Content-Type', /json/)
          .expect(/must be an integer/i)
          .expect(400);
      });
    });
  });
});

describe('POST /posts', () => {
  let token = '';

  beforeAll(async () => {
    vi.mock('node-fetch');
    
    vi.mock('../config/cloudinary.js', () => {
      return {
        handlePostImageUpload: vi
          .fn()
          .mockResolvedValue({ secure_url: 'amazing_post_image.jpeg' }),
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
        .post('/posts/?type=text')
        .type('form')
        .send(post3)
        .expect(401);
    });
  });

  describe('query parameter', () => {
    it('should return a 400 an an error message if the query parameter is invalid', async () => {
      await request(app)
        .post('/posts/?type=sound')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect(/invalid post type/i)
        .expect(400);
    });

    it('should return a 400 an an error message if the query parameter is missing', async () => {
      await request(app)
        .post('/posts/')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect(/invalid post type/i)
        .expect(400);
    });
  });

  describe('valid post - text and general', () => {
    it('should return a 200 and the new post that is liked by the post author', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect((res) => {
          expect(res.body).toHaveProperty('author', post3.author);
          expect(res.body).toHaveProperty('content', post3.content);
          expect(res.body.likes).toHaveLength(1);
          expect(res.body.likes).toContain(post3.author);
        })
        .expect(200);
    });
  });

  describe('invalid post - text and general', () => {
    it('should return a 400 and an error message if the author is not a valid MongoDB ID', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, author: 'Me!' })
        .expect(/author field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the author field is missing', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, author: undefined })
        .expect(/author field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the title is too short', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, title: 'ti' })
        .expect(/post title must contain/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the title field is missing', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, title: undefined })
        .expect(/post title must contain/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the title is too long', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({
          ...post3,
          title:
            'I am a rather very very very very very very very very long title, yep!',
        })
        .expect(/post title must contain/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the content is too short', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, content: 'Shorty' })
        .expect(/post content must contain/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the content field is missing', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, content: undefined })
        .expect(/post content must contain/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the category is not a valid MongoDB ID', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, category: 'SliceOfLife' })
        .expect(/category field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the category field is missing', async () => {
      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, category: undefined })
        .expect(/category field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the author is not in the DB', async () => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, author: validMongoID })
        .expect(/error while/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the category is not in the DB', async () => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      await request(app)
        .post('/posts/?type=text')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, category: validMongoID })
        .expect(/error while/i)
        .expect(400);
    });
  });

  describe('valid post - image file', () => {
    const file = Buffer.from('Trust me - I am, indeed, a file');

    it('should return a 200 and the image in an <img> tag with the uploaded image URL as the src attribute', async () => {
      await request(app)
        .post('/posts/?type=image')
        .auth(token, { type: 'bearer' })
        .field('author', user1._id.toString())
        .field('title', post3.title)
        .field('content', post3.content)
        .field('category', post3.category)
        .attach('uploaded_image', file, {
          filename: 'amazing_post_image.jpeg',
          contentType: 'image/jpeg',
        })
        .expect((res) => {
          expect(res.body.content).toMatch(/src="amazing_post_image.jpeg"/i);
          expect(res.body.content).toMatch(/class="post-image"/i);
          expect(res.body.content).toMatch(
            new RegExp(`alt="Image for the ${post3.title} post"`, 'i')
          );
          expect(res.body.content.startsWith('<img')).toBe(true);
        })
        .expect(200);
    });
  });

  describe('invalid post - image file', () => {
    const file = Buffer.from('I am not a bad file, I have my uses!');

    it('should return a 400 and an error message if the file is in incorrect format', async () => {
      await request(app)
        .post('/posts/?type=image')
        .auth(token, { type: 'bearer' })
        .field('author', user1._id.toString())
        .field('title', post3.title)
        .field('content', post3.content)
        .field('category', post3.category)
        .attach('uploaded_image', file, {
          filename: 'amazing_post_image.jpeg',
          contentType: 'image/apng',
        })
        .expect(/unsupported file format/i)
        .expect(400);
    });
  });

  describe('valid post - image URL', () => {
    it('should return a 200 and the image in an <img> tag with the uploaded image URL as the src attribute', async () => {
      // Mock fetch with proper response
      const response = new Response(post3.content, {
        headers: new Headers({
          'content-type': 'image/gif',
        }),
      });
      fetch.mockResolvedValue(Promise.resolve(response));

      await request(app)
        .post('/posts/?type=image')
        .auth(token, { type: 'bearer' })
        .field('author', user1._id.toString())
        .field('title', post3.title)
        .field('content', post3.content)
        .field('category', post3.category)
        .expect((res) => {
          expect(res.body.content).toMatch(/src="amazing_post_image.jpeg"/i);
          expect(res.body.content).toMatch(/class="post-image"/i);
          expect(res.body.content).toMatch(
            new RegExp(`alt="Image for the ${post3.title} post"`, 'i')
          );
          expect(res.body.content.startsWith('<img')).toBe(true);
        })
        .expect(200);
    });
  });

  describe('invalid post - image URL', () => {
    it('should return a 400 and an error message if the image URL is in incorrect format', async () => {
      // Mock fetch with improper response
      const response = new Response(post3.content, {
        headers: new Headers({
          'content-type': 'text/css',
        }),
      });
      fetch.mockResolvedValue(Promise.resolve(response));

      await request(app)
        .post('/posts/?type=image')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect(/unsupported file format/i)
        .expect(400);
    });

    it('should return a 400 and an error message if there is something wrong with fetching an image from the image URL', async () => {
      // Mock fetch failure
      fetch.mockResolvedValue(Promise.resolve({ ok: false }));

      await request(app)
        .post('/posts/?type=image')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send(post3)
        .expect(/error while/i)
        .expect(400);
    });
  });

  describe('valid post - video URL', () => {
    it('should return a 200 and the video in an <iframe> tag with the video URL as the src attribute', async () => {
      await request(app)
        .post('/posts/?type=video')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, content: goodYouTubeLink })
        .expect((res) => {
          expect(res.body.content).toMatch(
            new RegExp(`src="${goodYouTubeLink}"`, 'i')
          );
          expect(res.body.content).toMatch(/class="yt-video-player"/i);
          expect(res.body.content).toMatch(
            new RegExp(
              `title="YouTube video player for the ${post3.title} post"`,
              'i'
            )
          );
          expect(res.body.content.startsWith('<iframe')).toBe(true);
        })
        .expect(200);
    });
  });

  describe('invalid post - video URL', () => {
    it('should return a 400 and an error message if the video URL is incorrect', async () => {
      await request(app)
        .post('/posts/?type=video')
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ ...post3, content: badYouTubeLink })
        .expect(/error while/i)
        .expect(400);
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
    it('should return a 401', async () => {
      await request(app).get(`/posts/${post1.slug}`).expect(401);
    });
  });

  describe('post exists', () => {
    it('should return a 200 and the requested post object with populated author and category fields', async () => {
      await request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('title', post1.title);
          expect(res.body).toHaveProperty('author.username', user1.username);
          expect(res.body).toHaveProperty('category.name', category1.name);
        })
        .expect(200);
    });
  });

  describe('post does not exist', () => {
    it('should return a 404 and an error message', async () => {
      await request(app)
        .get(`/posts/i-do-not-exist`)
        .auth(token, { type: 'bearer' })
        .expect(/post not found/i)
        .expect(404);
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
    it('should return a 401', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/like`)
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(401);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'Valid user, surely!' })
        .expect(/user field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the user is not in the DB', async () => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      await request(app)
        .put(`/posts/${post1.slug}/like`)
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
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/liked successfully/i)
        .expect(200);
    });

    it('should add a like to the likes array and remove a dislike from the dislikes array', async () => {
      await request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.likes).toContain(user1._id.toString());
          expect(res.body.dislikes).not.toContain(user1._id.toString());
        })
        .expect(200);
    });

    it('should return a 200 and a success message if the user has already liked the post', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/like`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/unliked successfully/i)
        .expect(200);
    });

    it('should remove a like from the likes array', async () => {
      await request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.likes).not.toContain(user1._id.toString());
        })
        .expect(200);
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
    it('should return a 401', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .type('form')
        .send({ user: user1._id })
        .expect(401);
    });
  });

  describe('invalid user', () => {
    it('should return a 400 and an error message if the user is not a valid MongoDB ID', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: 'Valid user, yep!' })
        .expect(/user field must be/i)
        .expect(400);
    });

    it('should return a 400 and an error message if the user is not in the DB', async () => {
      const validMongoID = new mongoose.Types.ObjectId().toString();

      await request(app)
        .put(`/posts/${post1.slug}/dislike`)
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
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/disliked successfully/i)
        .expect(200);
    });

    it('should add a dislike to the dislikes array and remove a like from the likes array', async () => {
      await request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.dislikes).toContain(user1._id.toString());
          expect(res.body.likes).not.toContain(user1._id.toString());
        })
        .expect(200);
    });

    it('should return a 200 and a success message if the user has already disliked the post', async () => {
      await request(app)
        .put(`/posts/${post1.slug}/dislike`)
        .auth(token, { type: 'bearer' })
        .type('form')
        .send({ user: user1._id.toString() })
        .expect(/undisliked successfully/i)
        .expect(200);
    });

    it('should remove a dislike from the dislikes array', async () => {
      await request(app)
        .get(`/posts/${post1.slug}`)
        .auth(token, { type: 'bearer' })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.dislikes).not.toContain(user1._id.toString());
        })
        .expect(200);
    });
  });
});
