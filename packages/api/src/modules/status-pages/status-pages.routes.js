import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { requireProjectAccess } from '../../middleware/project-access.middleware.js';
import {
  createStatusPageSchema,
  updateStatusPageSchema,
} from './status-pages.validator.js';
import {
  getPublicStatusPageHandler,
  getProjectStatusPageHandler,
  createProjectStatusPageHandler,
  updateProjectStatusPageHandler,
  deleteProjectStatusPageHandler,
} from './status-pages.controller.js';

export const statusPagesRouter = Router({ mergeParams: true });

const projectAccess = requireProjectAccess('viewer');
const projectWriteAccess = requireProjectAccess('admin');

// ─── Public Status Page (No Authentication) ──────────────────────────────────
statusPagesRouter.get('/status/:slug', getPublicStatusPageHandler);

// ─── Project Management Routes (Authenticated) ───────────────────────────────
statusPagesRouter.get(
  '/projects/:projectId/status-page',
  authenticate,
  projectAccess,
  getProjectStatusPageHandler,
);

statusPagesRouter.post(
  '/projects/:projectId/status-page',
  authenticate,
  projectWriteAccess,
  validate(createStatusPageSchema),
  createProjectStatusPageHandler,
);

statusPagesRouter.patch(
  '/projects/:projectId/status-page',
  authenticate,
  projectWriteAccess,
  validate(updateStatusPageSchema),
  updateProjectStatusPageHandler,
);

statusPagesRouter.delete(
  '/projects/:projectId/status-page',
  authenticate,
  projectWriteAccess,
  deleteProjectStatusPageHandler,
);
