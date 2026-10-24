import { asyncHandler } from '@anchor/shared';
import * as monitorsService from './monitors.service.js';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/projects/:projectId/monitors
 */
export const listMonitorsHandler = asyncHandler(async (req, res) => {
  const monitors = await monitorsService.getMonitors(req.params.projectId);
  res.json({ success: true, data: { monitors } });
});

/**
 * POST /api/projects/:projectId/monitors
 */
export const createMonitorHandler = asyncHandler(async (req, res) => {
  const monitor = await monitorsService.createMonitor(req.params.projectId, req.body);
  res.status(201).json({ success: true, data: { monitor } });
});

/**
 * GET /api/projects/:projectId/monitors/:monitorId
 */
export const getMonitorHandler = asyncHandler(async (req, res) => {
  const monitor = await monitorsService.getMonitor(
    req.params.projectId,
    req.params.monitorId,
  );
  res.json({ success: true, data: { monitor } });
});

/**
 * PATCH /api/projects/:projectId/monitors/:monitorId
 */
export const updateMonitorHandler = asyncHandler(async (req, res) => {
  const monitor = await monitorsService.updateMonitor(
    req.params.projectId,
    req.params.monitorId,
    req.body,
  );
  res.json({ success: true, data: { monitor } });
});

/**
 * DELETE /api/projects/:projectId/monitors/:monitorId
 */
export const deleteMonitorHandler = asyncHandler(async (req, res) => {
  await monitorsService.deleteMonitor(req.params.projectId, req.params.monitorId);
  res.status(204).send();
});

/**
 * PATCH /api/projects/:projectId/monitors/:monitorId/toggle
 */
export const toggleMonitorHandler = asyncHandler(async (req, res) => {
  const monitor = await monitorsService.toggleMonitor(
    req.params.projectId,
    req.params.monitorId,
  );
  res.json({ success: true, data: { monitor } });
});
