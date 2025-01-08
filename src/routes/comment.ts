import { Router } from 'express';
import { checkAuth } from '../config/passport';
import {
  createComment,
  dislikeComment,
  likeComment,
} from '../controllers/commentController';

const router = Router({ mergeParams: true });

// Make sure all routes are protected
router.use(checkAuth);

router.post('/', createComment);

router.put('/:commentID/like', likeComment);

router.put('/:commentID/dislike', dislikeComment);

export default router;
