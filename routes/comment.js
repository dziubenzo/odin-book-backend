import { Router } from 'express';

import {
  createComment,
  likeComment,
  dislikeComment,
} from '../controllers/commentController.js';
import { checkAuth } from '../config/middleware.js';

const router = Router({ mergeParams: true });

// Make sure all routes are protected
router.use(checkAuth);

router.post('/', createComment);

router.put('/:commentID/like', likeComment);

router.put('/:commentID/dislike', dislikeComment);

export default router;
