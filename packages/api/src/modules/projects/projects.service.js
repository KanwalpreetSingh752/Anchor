import { Project, createLogger } from '@anchor/shared';

const logger = createLogger('projects-service');

/**
 * Converts a project name into a URL-safe lowercase slug.
 * Appends a random suffix to guarantee uniqueness.
 * @param {string} name
 * @returns {string}
 */
function buildSlug(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

/**
 * Creates a new project owned by `ownerId`.
 * @param {string} ownerId
 * @param {{ name: string }} data
 * @returns {object} Created project document (toJSON)
 */
export async function createProject(ownerId, data) {
  // Generate a unique slug — retry on collision (extremely rare)
  let slug;
  let attempts = 0;
  while (attempts < 5) {
    slug = buildSlug(data.name);
    const exists = await Project.findOne({ slug });
    if (!exists) break;
    attempts++;
  }

  const project = await Project.create({
    name: data.name,
    slug,
    ownerId,
    members: [],
  });

  logger.info({ projectId: project._id, ownerId }, 'Project created');
  return project.toJSON();
}

/**
 * Returns all projects where `userId` is the owner or a member.
 * @param {string} userId
 * @returns {object[]}
 */
export async function listProjects(userId) {
  const projects = await Project.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  }).sort({ createdAt: -1 });

  return projects.map((p) => p.toJSON());
}

/**
 * Returns a single project by ID, verifying `userId` has access.
 * @param {string} projectId
 * @param {string} userId
 * @returns {object}
 */
export async function getProject(projectId, userId) {
  const project = await Project.findById(projectId);

  if (!project) {
    const err = new Error('Project not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const isOwner = project.ownerId.toString() === userId;
  const isMember = project.members.some((m) => m.userId.toString() === userId);

  if (!isOwner && !isMember) {
    const err = new Error('You do not have access to this project.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return project.toJSON();
}

/**
 * Updates the name of a project (owner or admin only — enforced by middleware).
 * @param {string} projectId
 * @param {{ name: string }} data
 * @returns {object} Updated project
 */
export async function updateProject(projectId, data) {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $set: { name: data.name } },
    { new: true, runValidators: true },
  );

  if (!project) {
    const err = new Error('Project not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  logger.info({ projectId }, 'Project updated');
  return project.toJSON();
}

/**
 * Deletes a project and all associated resources.
 * Only the owner may delete (enforced by middleware).
 * @param {string} projectId
 */
export async function deleteProject(projectId) {
  const project = await Project.findByIdAndDelete(projectId);

  if (!project) {
    const err = new Error('Project not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  logger.info({ projectId }, 'Project deleted');
}
