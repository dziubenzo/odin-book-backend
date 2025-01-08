import compression from 'compression';
import cors from 'cors';
import 'dotenv/config.js';
import type { Request, Response } from 'express';
import express from 'express';
import RateLimit from 'express-rate-limit';
import helmet from 'helmet';
import passport from 'passport';
import { isProduction } from './config/helpers';
import './config/mongoDB';
import { jwtStrategy } from './config/passport';

// Route imports
import categoryRouter from './routes/category.js';
import commentRouter from './routes/comment.js';
import indexRouter from './routes/index.js';
import postRouter from './routes/post.js';
import userRouter from './routes/user.js';

// Frontend URL
const FRONTEND_URL = isProduction()
  ? 'https://dziubenzo-messaging-app.netlify.app'
  : ['http://localhost:5173', 'http://192.168.0.13:5173'];

// CORS options - allowed site(s)
// No '/' at the end
const corsOptions = {
  origin: FRONTEND_URL,
};

// Rate limiter: maximum of forty requests per minute
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  validate: { xForwardedForHeader: false },
});

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(helmet());

if (isProduction()) app.use(limiter);

// JWT authentication
passport.use(jwtStrategy);

// Routes
app.use('/', indexRouter);
app.use('/users', userRouter);
app.use('/categories', categoryRouter);
app.use('/posts', postRouter);
app.use('/posts/:slug/comments', commentRouter);

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  res.status(500).json({
    message: `ERROR: ${err.message}`,
  });
});

// Server listener
if (isProduction()) {
  app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}...`);
  });
} else {
  app.listen(parseInt(process.env.PORT!), '192.168.0.13', () => {
    console.log(`Server listening on port ${process.env.PORT}...`);
  });
}