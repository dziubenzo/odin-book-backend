import { Router } from 'express';
import { checkAuth } from '../config/passport';
import {
  createPost,
  dislikePost,
  getAllPosts,
  getSinglePost,
  likePost,
} from '../controllers/postController.js';

const router = Router();

// Make sure all routes are protected
router.use(checkAuth);

router.get('/', getAllPosts);

router.post('/', createPost);

router.get('/:slug', getSinglePost);

router.put('/:slug/like', likePost);

router.put('/:slug/dislike', dislikePost);

export default router;
