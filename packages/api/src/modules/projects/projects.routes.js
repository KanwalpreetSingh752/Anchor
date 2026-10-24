import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { requireProjectAccess } from '../../middleware/project-access.middleware.js';
import { createProjectSchema, updateProjectSchema } from './projects.validator.js';
import {
  createProjectHandler,
  listProjectsHandler,
  getProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from './projects.controller.js';

export const projectsRouter = Router();

// All project routes require authentication
projectsRouter.use(authenticate);

projectsRouter.post('/projects', validate(createProjectSchema), createProjectHandler);
projectsRouter.get('/projects', listProjectsHandler);

// Single-project routes — basic access check done in controller / service
projectsRouter.get('/projects/:id', getProjectHandler);

// Mutations require at least admin role
projectsRouter.patch(
  '/projects/:id',
  (req, _res, next) => { req.params.projectId = req.params.id; next(); },
  requireProjectAccess('admin'),
  validate(updateProjectSchema),
  updateProjectHandler,
);

// Only the owner may delete
projectsRouter.delete(
  '/projects/:id',
  (req, _res, next) => { req.params.projectId = req.params.id; next(); },
  requireProjectAccess('owner'),
  deleteProjectHandler,
);
