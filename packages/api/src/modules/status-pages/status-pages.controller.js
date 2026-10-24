import { asyncHandler } from '@anchor/shared';
import * as statusPagesService from './status-pages.service.js';

/**
 * GET /api/status/:slug
 */
export const getPublicStatusPageHandler = asyncHandler(async (req, res) => {
  const statusPage = await statusPagesService.getPublicStatusPage(req.params.slug);
  res.json({
    success: true,
    data: { statusPage },
  });
});

/**
 * GET /api/projects/:projectId/status-page
 */
export const getProjectStatusPageHandler = asyncHandler(async (req, res) => {
  const statusPage = await statusPagesService.getStatusPage(req.params.projectId);
  res.json({
    success: true,
    data: { statusPage },
  });
});

/**
 * POST /api/projects/:projectId/status-page
 */
export const createProjectStatusPageHandler = asyncHandler(async (req, res) => {
  const statusPage = await statusPagesService.createStatusPage(
    req.params.projectId,
    req.body,
  );
  res.status(201).json({
    success: true,
    data: { statusPage },
  });
});

/**
 * PATCH /api/projects/:projectId/status-page
 */
export const updateProjectStatusPageHandler = asyncHandler(async (req, res) => {
  const statusPage = await statusPagesService.updateStatusPage(
    req.params.projectId,
    req.body,
  );
  res.json({
    success: true,
    data: { statusPage },
  });
});

/**
 * DELETE /api/projects/:projectId/status-page
 */
export const deleteProjectStatusPageHandler = asyncHandler(async (req, res) => {
  await statusPagesService.deleteStatusPage(req.params.projectId);
  res.status(204).send();
});
