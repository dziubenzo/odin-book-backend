import { Router } from 'express';
import { checkAuth } from '../config/passport';
import {
  createCategory,
  getAllCategories,
  getSingleCategory,
} from '../controllers/categoryController';

const router = Router();

// Make sure all routes are protected
router.use(checkAuth);

router.get('/', getAllCategories);

router.post('/', createCategory);

router.get('/:slug', getSingleCategory);

export default router;
