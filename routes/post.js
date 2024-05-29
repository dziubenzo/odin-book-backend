import { Router } from 'express';

import { getAllPosts, createPost } from '../controllers/postController.js';
import { checkAuth } from '../config/middleware.js';

const router = Router();

// Make sure all routes are protected
router.use(checkAuth);

router.get('/', getAllPosts);

router.post('/', createPost);

export default router;
