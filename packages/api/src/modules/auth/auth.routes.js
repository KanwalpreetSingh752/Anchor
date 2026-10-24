import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { registerSchema, loginSchema } from './auth.validator.js';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
} from './auth.controller.js';

export const authRouter = Router();

// Public routes
authRouter.post('/register', validate(registerSchema), registerHandler);
authRouter.post('/login', validate(loginSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);

// Protected routes
authRouter.post('/logout', authenticate, logoutHandler);
authRouter.get('/me', authenticate, getMeHandler);
