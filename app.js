import express from 'express';
import 'dotenv/config.js';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import RateLimit from 'express-rate-limit';
import './config/mongoDB.js';

// Authentication imports
import passport from 'passport';
import { jwtStrategy } from './config/passport.js';

// Route imports
import indexRouter from './routes/index.js';
import userRouter from './routes/user.js';
import categoryRouter from './routes/category.js';
import postRouter from './routes/post.js';
import commentRouter from './routes/comment.js';

// Frontend URL
const FRONTEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://dziubenzo-odin-book.netlify.app'
    : 'http://localhost:5173';

// CORS options - allowed site(s)
// No '/' at the end
const corsOptions = {
  origin: FRONTEND_URL,
};

const app = express();
app.use(cors(corsOptions));

// Rate limiter: maximum of forty requests per minute
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  validate: { xForwardedForHeader: false },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(helmet());
app.use(limiter);

// JWT authentication
passport.use(jwtStrategy);

// Routes
app.use('/', indexRouter);
app.use('/users', userRouter);
app.use('/categories', categoryRouter);
app.use('/posts', postRouter);
app.use('/posts/:slug/comments', commentRouter);

// Error handler
app.use((err, req, res, next) => {
  return res.status(500).json({
    message: `ERROR: ${err.message}`,
  });
});

// Server listener
app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}...`);
});
