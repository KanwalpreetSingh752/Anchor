import { Project, createLogger } from '@anchor/shared';

const logger = createLogger('project-access');

/** Role hierarchy — higher index = higher privilege */
const ROLE_HIERARCHY = ['viewer', 'admin', 'owner'];

function hasRole(userRole, requiredRole) {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

/**
 * Middleware factory that checks whether `req.user` has at least `requiredRole`
 * within the project specified by `req.params.projectId`.
 *
 * Attaches `req.project` on success so downstream handlers avoid a second query.
 *
 * @param {'viewer'|'admin'|'owner'} requiredRole - Minimum role required.
 */
export function requireProjectAccess(requiredRole = 'viewer') {
  return async (req, res, next) => {
    const { projectId } = req.params;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'projectId is required.' },
      });
    }

    try {
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found.' },
        });
      }

      // Owner always has full access
      if (project.ownerId.toString() === userId) {
        req.project = project;
        req.userRole = 'owner';
        return next();
      }

      // Check membership
      const member = project.members.find((m) => m.userId.toString() === userId);

      if (!member) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this project.' },
        });
      }

      if (!hasRole(member.role, requiredRole)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `This action requires the '${requiredRole}' role or higher.`,
          },
        });
      }

      req.project = project;
      req.userRole = member.role;
      next();
    } catch (err) {
      logger.error({ err, projectId, userId }, 'Error checking project access');
      next(err);
    }
  };
}
