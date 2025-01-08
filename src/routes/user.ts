import { Router } from 'express';
import {
  authUser,
  createUser,
  getAllUsers,
  getUser,
  loginUser,
  updateFollowedCategories,
  updateFollowedUsers,
  updateUser,
} from '../controllers/userController.js';

const router = Router();

router.get('/', getAllUsers);

router.post('/', createUser);

router.post('/login', loginUser);

router.post('/auth', authUser);

router.put('/:username/update', updateUser);

router.put('/:username/update_category', updateFollowedCategories);

router.put('/:username/update_user', updateFollowedUsers);

router.get('/:username', getUser);

export default router;
