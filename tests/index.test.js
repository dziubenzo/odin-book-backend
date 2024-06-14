import indexRouter from '../routes/index.js';

import request from 'supertest';
import express from 'express';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use('/', indexRouter);

test('GET / works', async () => {
  await request(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect({ project: 'Odin-Book', author: 'dziubenzo' })
    .expect(200);
});
