import { Router } from 'express';

import { createComment } from '../controllers/commentController.js';
import { checkAuth } from '../config/middleware.js';

const router = Router({ mergeParams: true });

// Make sure all routes are protected
router.use(checkAuth);

router.post('/', createComment);

export default router;
