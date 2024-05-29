import { Router } from 'express';

import { getAllCategories } from '../controllers/categoryController.js';
import { checkAuth } from '../config/middleware.js';

const router = Router();

// Make sure all routes are protected
router.use(checkAuth);

router.get('/', getAllCategories);

export default router;
