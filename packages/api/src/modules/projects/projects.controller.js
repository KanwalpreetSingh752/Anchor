import { asyncHandler } from '@anchor/shared';
import * as projectsService from './projects.service.js';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/projects
 */
export const createProjectHandler = asyncHandler(async (req, res) => {
  const project = await projectsService.createProject(req.user.id, req.body);
  res.status(201).json({ success: true, data: { project } });
});

/**
 * GET /api/projects
 */
export const listProjectsHandler = asyncHandler(async (req, res) => {
  const projects = await projectsService.listProjects(req.user.id);
  res.json({ success: true, data: { projects } });
});

/**
 * GET /api/projects/:id
 */
export const getProjectHandler = asyncHandler(async (req, res) => {
  const project = await projectsService.getProject(req.params.id, req.user.id);
  res.json({ success: true, data: { project } });
});

/**
 * PATCH /api/projects/:id
 */
export const updateProjectHandler = asyncHandler(async (req, res) => {
  const project = await projectsService.updateProject(req.params.id, req.body);
  res.json({ success: true, data: { project } });
});

/**
 * DELETE /api/projects/:id
 */
export const deleteProjectHandler = asyncHandler(async (req, res) => {
  await projectsService.deleteProject(req.params.id);
  res.status(204).send();
});
