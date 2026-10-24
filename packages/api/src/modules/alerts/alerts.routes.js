import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { requireProjectAccess } from '../../middleware/project-access.middleware.js';
import {
  createAlertChannelSchema,
  updateAlertChannelSchema,
} from './alerts.validator.js';
import {
  listAlertChannelsHandler,
  createAlertChannelHandler,
  getAlertChannelHandler,
  updateAlertChannelHandler,
  deleteAlertChannelHandler,
  testAlertChannelHandler,
} from './alerts.controller.js';

export const alertsRouter = Router({ mergeParams: true });

const projectAccess = requireProjectAccess('viewer');
const projectWriteAccess = requireProjectAccess('admin');

alertsRouter.use(authenticate);

alertsRouter.get(
  '/projects/:projectId/alert-channels',
  projectAccess,
  listAlertChannelsHandler,
);

alertsRouter.post(
  '/projects/:projectId/alert-channels',
  projectWriteAccess,
  validate(createAlertChannelSchema),
  createAlertChannelHandler,
);

alertsRouter.get(
  '/projects/:projectId/alert-channels/:channelId',
  projectAccess,
  getAlertChannelHandler,
);

alertsRouter.patch(
  '/projects/:projectId/alert-channels/:channelId',
  projectWriteAccess,
  validate(updateAlertChannelSchema),
  updateAlertChannelHandler,
);

alertsRouter.delete(
  '/projects/:projectId/alert-channels/:channelId',
  projectWriteAccess,
  deleteAlertChannelHandler,
);

alertsRouter.post(
  '/projects/:projectId/alert-channels/:channelId/test',
  projectWriteAccess,
  testAlertChannelHandler,
);
