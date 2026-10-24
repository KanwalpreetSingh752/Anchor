import { asyncHandler } from '@anchor/shared';
import * as alertsService from './alerts.service.js';

/**
 * GET /api/projects/:projectId/alert-channels
 */
export const listAlertChannelsHandler = asyncHandler(async (req, res) => {
  const channels = await alertsService.getAlertChannels(req.params.projectId);
  res.json({ success: true, data: { channels } });
});

/**
 * POST /api/projects/:projectId/alert-channels
 */
export const createAlertChannelHandler = asyncHandler(async (req, res) => {
  const channel = await alertsService.createAlertChannel(
    req.params.projectId,
    req.body,
  );
  res.status(201).json({ success: true, data: { channel } });
});

/**
 * GET /api/projects/:projectId/alert-channels/:channelId
 */
export const getAlertChannelHandler = asyncHandler(async (req, res) => {
  const channel = await alertsService.getAlertChannel(
    req.params.projectId,
    req.params.channelId,
  );
  res.json({ success: true, data: { channel } });
});

/**
 * PATCH /api/projects/:projectId/alert-channels/:channelId
 */
export const updateAlertChannelHandler = asyncHandler(async (req, res) => {
  const channel = await alertsService.updateAlertChannel(
    req.params.projectId,
    req.params.channelId,
    req.body,
  );
  res.json({ success: true, data: { channel } });
});

/**
 * DELETE /api/projects/:projectId/alert-channels/:channelId
 */
export const deleteAlertChannelHandler = asyncHandler(async (req, res) => {
  await alertsService.deleteAlertChannel(
    req.params.projectId,
    req.params.channelId,
  );
  res.status(204).send();
});

/**
 * POST /api/projects/:projectId/alert-channels/:channelId/test
 */
export const testAlertChannelHandler = asyncHandler(async (req, res) => {
  const result = await alertsService.testChannel(
    req.params.projectId,
    req.params.channelId,
  );
  res.json({ success: true, data: result });
});
