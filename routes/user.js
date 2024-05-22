import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  loginUser,
  authUser
} from '../controllers/userController.js';

const router = Router();

router.get('/', getAllUsers);

router.post('/', createUser);

router.post('/login', loginUser);

router.post('/auth', authUser);

export default router;
