import { asyncHandler } from '@anchor/shared';
import * as checksService from './checks.service.js';

/**
 * GET /api/projects/:projectId/monitors/:monitorId/checks
 */
export const getMonitorChecksHandler = asyncHandler(async (req, res) => {
  const { projectId, monitorId } = req.params;
  const { range, page, limit } = req.query;

  const result = await checksService.getMonitorChecks(projectId, monitorId, {
    range,
    page,
    limit,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/projects/:projectId/monitors/:monitorId/stats
 */
export const getMonitorStatsHandler = asyncHandler(async (req, res) => {
  const { projectId, monitorId } = req.params;
  const { range } = req.query;

  const stats = await checksService.getMonitorStats(projectId, monitorId, range);

  res.json({
    success: true,
    data: { stats },
  });
});
