import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  loginUser,
  authUser,
  updateUser,
  updateFollowedCategories,
  updateFollowedUsers,
} from '../controllers/userController.js';

const router = Router();

router.get('/', getAllUsers);

router.post('/', createUser);

router.post('/login', loginUser);

router.post('/auth', authUser);

router.put('/:username/update', updateUser);

router.put('/:username/update_category', updateFollowedCategories);

router.put('/:username/update_user', updateFollowedUsers);

export default router;
