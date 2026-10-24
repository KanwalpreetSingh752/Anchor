import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectAccess } from '../../middleware/project-access.middleware.js';
import {
  getMonitorChecksHandler,
  getMonitorStatsHandler,
} from './checks.controller.js';

export const checksRouter = Router({ mergeParams: true });

const projectAccess = requireProjectAccess('viewer');

checksRouter.use(authenticate);

checksRouter.get(
  '/projects/:projectId/monitors/:monitorId/checks',
  projectAccess,
  getMonitorChecksHandler,
);

checksRouter.get(
  '/projects/:projectId/monitors/:monitorId/stats',
  projectAccess,
  getMonitorStatsHandler,
);
