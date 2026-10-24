import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectAccess } from '../../middleware/project-access.middleware.js';
import {
  listIncidentsHandler,
  getIncidentHandler,
  acknowledgeIncidentHandler,
  resolveIncidentHandler,
} from './incidents.controller.js';

export const incidentsRouter = Router({ mergeParams: true });

const projectAccess = requireProjectAccess('viewer');
const projectWriteAccess = requireProjectAccess('admin');

incidentsRouter.use(authenticate);

incidentsRouter.get(
  '/projects/:projectId/incidents',
  projectAccess,
  listIncidentsHandler,
);

incidentsRouter.get(
  '/projects/:projectId/incidents/:incidentId',
  projectAccess,
  getIncidentHandler,
);

incidentsRouter.patch(
  '/projects/:projectId/incidents/:incidentId/acknowledge',
  projectWriteAccess,
  acknowledgeIncidentHandler,
);

incidentsRouter.patch(
  '/projects/:projectId/incidents/:incidentId/resolve',
  projectWriteAccess,
  resolveIncidentHandler,
);
