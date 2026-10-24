import { asyncHandler } from '@anchor/shared';
import * as incidentsService from './incidents.service.js';

/**
 * GET /api/projects/:projectId/incidents
 */
export const listIncidentsHandler = asyncHandler(async (req, res) => {
  const { status, monitorId, page, limit } = req.query;
  const result = await incidentsService.getIncidents(req.params.projectId, {
    status,
    monitorId,
    page,
    limit,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/projects/:projectId/incidents/:incidentId
 */
export const getIncidentHandler = asyncHandler(async (req, res) => {
  const incident = await incidentsService.getIncident(
    req.params.projectId,
    req.params.incidentId,
  );

  res.json({
    success: true,
    data: { incident },
  });
});

/**
 * PATCH /api/projects/:projectId/incidents/:incidentId/acknowledge
 */
export const acknowledgeIncidentHandler = asyncHandler(async (req, res) => {
  const incident = await incidentsService.acknowledgeIncident(
    req.params.projectId,
    req.params.incidentId,
    req.user?.id,
  );

  res.json({
    success: true,
    data: { incident },
  });
});

/**
 * PATCH /api/projects/:projectId/incidents/:incidentId/resolve
 */
export const resolveIncidentHandler = asyncHandler(async (req, res) => {
  const incident = await incidentsService.resolveIncident(
    req.params.projectId,
    req.params.incidentId,
    req.body?.note,
  );

  res.json({
    success: true,
    data: { incident },
  });
});
