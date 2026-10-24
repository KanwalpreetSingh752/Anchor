import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { requireProjectAccess } from '../../middleware/project-access.middleware.js';
import { createMonitorSchema, updateMonitorSchema } from './monitors.validator.js';
import {
  listMonitorsHandler,
  createMonitorHandler,
  getMonitorHandler,
  updateMonitorHandler,
  deleteMonitorHandler,
  toggleMonitorHandler,
} from './monitors.controller.js';

export const monitorsRouter = Router({ mergeParams: true });

// All monitor routes require authentication and at least viewer access to the project
const projectAccess = requireProjectAccess('viewer');
const projectWriteAccess = requireProjectAccess('admin');

monitorsRouter.use(authenticate);

monitorsRouter.get(
  '/projects/:projectId/monitors',
  projectAccess,
  listMonitorsHandler,
);

monitorsRouter.post(
  '/projects/:projectId/monitors',
  projectWriteAccess,
  validate(createMonitorSchema),
  createMonitorHandler,
);

monitorsRouter.get(
  '/projects/:projectId/monitors/:monitorId',
  projectAccess,
  getMonitorHandler,
);

monitorsRouter.patch(
  '/projects/:projectId/monitors/:monitorId',
  projectWriteAccess,
  validate(updateMonitorSchema),
  updateMonitorHandler,
);

monitorsRouter.delete(
  '/projects/:projectId/monitors/:monitorId',
  projectWriteAccess,
  deleteMonitorHandler,
);

monitorsRouter.patch(
  '/projects/:projectId/monitors/:monitorId/toggle',
  projectWriteAccess,
  toggleMonitorHandler,
);
