import express from 'express';
import request from 'supertest';
import indexRouter from '../routes/index';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter);

test('GET / works', async () => {
  await request(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect({ project: 'Aurora', author: 'dziubenzo' })
    .expect(200);
});
