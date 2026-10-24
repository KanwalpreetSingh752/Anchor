import { Incident, createLogger } from '@anchor/shared';

const logger = createLogger('incidents-service');

/**
 * Returns a paginated list of incidents for a given project.
 *
 * @param {string} projectId
 * @param {object} [options]
 * @param {'OPEN'|'RESOLVED'} [options.status]
 * @param {string} [options.monitorId]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @returns {Promise<{ incidents: object[], pagination: object }>}
 */
export async function getIncidents(projectId, { status, monitorId, page = 1, limit = 20 } = {}) {
  const query = { projectId };

  if (status) {
    query.status = status;
  }
  if (monitorId) {
    query.monitorId = monitorId;
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (currentPage - 1) * pageLimit;

  const [incidents, total] = await Promise.all([
    Incident.find(query)
      .populate('monitorId', 'name url')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(pageLimit),
    Incident.countDocuments(query),
  ]);

  return {
    incidents: incidents.map((inc) => inc.toJSON()),
    pagination: {
      page: currentPage,
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Returns a single incident by ID.
 *
 * @param {string} projectId
 * @param {string} incidentId
 * @returns {Promise<object>}
 */
export async function getIncident(projectId, incidentId) {
  const incident = await Incident.findOne({ _id: incidentId, projectId }).populate(
    'monitorId',
    'name url',
  );

  if (!incident) {
    const err = new Error('Incident not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return incident.toJSON();
}

/**
 * Acknowledges an open incident.
 *
 * @param {string} projectId
 * @param {string} incidentId
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
export async function acknowledgeIncident(projectId, incidentId, userId) {
  const incident = await Incident.findOne({ _id: incidentId, projectId });

  if (!incident) {
    const err = new Error('Incident not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  incident.timeline.push({
    ts: new Date(),
    event: 'ACKNOWLEDGED',
    note: userId ? `Acknowledged by user ${userId}` : 'Acknowledged',
  });

  await incident.save();
  logger.info({ incidentId, projectId, userId }, 'Incident acknowledged');

  return incident.toJSON();
}

/**
 * Resolves an open incident with an optional note.
 *
 * @param {string} projectId
 * @param {string} incidentId
 * @param {string} [note]
 * @returns {Promise<object>}
 */
export async function resolveIncident(projectId, incidentId, note) {
  const incident = await Incident.findOne({ _id: incidentId, projectId });

  if (!incident) {
    const err = new Error('Incident not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (incident.status === 'RESOLVED') {
    return incident.toJSON();
  }

  const now = new Date();
  incident.status = 'RESOLVED';
  incident.resolvedAt = now;
  if (incident.startedAt) {
    incident.duration = now.getTime() - incident.startedAt.getTime();
  }
  incident.timeline.push({
    ts: now,
    event: 'RESOLVED',
    note: note || 'Resolved by user',
  });

  await incident.save();
  logger.info({ incidentId, projectId }, 'Incident resolved');

  return incident.toJSON();
}
