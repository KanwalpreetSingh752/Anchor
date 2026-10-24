import {
  StatusPage,
  Monitor,
  CheckBucket,
  Incident,
  redisConnection,
  createLogger,
} from '@anchor/shared';

const logger = createLogger('status-pages-service');

const CACHE_TTL_SECONDS = 60;

/**
 * Fetches public status page data by slug, with Redis caching (60s TTL).
 *
 * @param {string} slug
 * @returns {Promise<object>}
 */
export async function getPublicStatusPage(slug) {
  const normalizedSlug = slug.toLowerCase();
  const cacheKey = `status-page:${normalizedSlug}`;

  // 1. Try cache
  try {
    const cached = await redisConnection.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn({ err, slug }, 'Redis cache read failed; falling back to DB');
  }

  // 2. Query status page
  const page = await StatusPage.findOne({
    slug: normalizedSlug,
    isPublic: true,
  }).populate('monitors', 'name url lastStatus lastLatency lastCheckedAt isActive');

  if (!page) {
    const err = new Error('Status page not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // 3. Collect monitor stats and open incidents
  const monitorData = await Promise.all(
    page.monitors.map(async (monitor) => {
      const [buckets7d, activeIncidents] = await Promise.all([
        CheckBucket.find({
          monitorId: monitor._id,
          hour: { $gte: since7d },
        }).select('hour count failures'),
        Incident.find({
          monitorId: monitor._id,
          status: 'OPEN',
        })
          .select('startedAt cause rootCause affectedChecks timeline')
          .sort({ startedAt: -1 }),
      ]);

      let total24h = 0;
      let fail24h = 0;
      let total7d = 0;
      let fail7d = 0;

      for (const b of buckets7d) {
        total7d += b.count;
        fail7d += b.failures;
        if (b.hour >= since24h) {
          total24h += b.count;
          fail24h += b.failures;
        }
      }

      const uptime24h =
        total24h > 0
          ? Number((((total24h - fail24h) / total24h) * 100).toFixed(2))
          : 100;

      const uptime7d =
        total7d > 0
          ? Number((((total7d - fail7d) / total7d) * 100).toFixed(2))
          : 100;

      return {
        id: monitor._id.toString(),
        name: monitor.name,
        lastStatus: monitor.lastStatus,
        lastLatency: monitor.lastLatency,
        lastCheckedAt: monitor.lastCheckedAt,
        isActive: monitor.isActive,
        uptime24h,
        uptime7d,
        activeIncidents: activeIncidents.map((inc) => inc.toJSON()),
      };
    }),
  );

  // Overall system status
  let overallStatus = 'OPERATIONAL';
  const hasDown = monitorData.some((m) => m.lastStatus === 'DOWN');
  const hasDegraded = monitorData.some((m) => m.lastStatus === 'DEGRADED');

  if (hasDown) {
    overallStatus = 'MAJOR_OUTAGE';
  } else if (hasDegraded) {
    overallStatus = 'DEGRADED_PERFORMANCE';
  }

  const result = {
    title: page.title,
    slug: page.slug,
    description: page.description,
    customDomain: page.customDomain,
    isPublic: page.isPublic,
    overallStatus,
    updatedAt: page.updatedAt,
    monitors: monitorData,
  };

  // 4. Cache result
  try {
    await redisConnection.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      CACHE_TTL_SECONDS,
    );
  } catch (err) {
    logger.warn({ err, slug }, 'Redis cache write failed');
  }

  return result;
}

/**
 * Returns project status page configuration.
 *
 * @param {string} projectId
 * @returns {Promise<object>}
 */
export async function getStatusPage(projectId) {
  const page = await StatusPage.findOne({ projectId }).populate(
    'monitors',
    'name url lastStatus lastLatency lastCheckedAt',
  );

  if (!page) {
    const err = new Error('Status page not configured for this project.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return page.toJSON();
}

/**
 * Creates a new status page for a project.
 *
 * @param {string} projectId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createStatusPage(projectId, data) {
  const existing = await StatusPage.findOne({ projectId });
  if (existing) {
    const err = new Error('A status page already exists for this project.');
    err.statusCode = 409;
    err.code = 'ALREADY_EXISTS';
    throw err;
  }

  const slug = data.slug.toLowerCase();
  const slugExists = await StatusPage.findOne({ slug });
  if (slugExists) {
    const err = new Error('This status page slug is already in use.');
    err.statusCode = 409;
    err.code = 'SLUG_CONFLICT';
    throw err;
  }

  const page = await StatusPage.create({
    projectId,
    ...data,
    slug,
  });

  logger.info({ statusPageId: page._id, projectId, slug }, 'Status page created');
  return page.toJSON();
}

/**
 * Updates an existing status page for a project.
 *
 * @param {string} projectId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateStatusPage(projectId, data) {
  const page = await StatusPage.findOne({ projectId });
  if (!page) {
    const err = new Error('Status page not found for this project.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const oldSlug = page.slug;

  if (data.slug) {
    const newSlug = data.slug.toLowerCase();
    if (newSlug !== oldSlug) {
      const slugExists = await StatusPage.findOne({
        slug: newSlug,
        _id: { $ne: page._id },
      });
      if (slugExists) {
        const err = new Error('This status page slug is already in use.');
        err.statusCode = 409;
        err.code = 'SLUG_CONFLICT';
        throw err;
      }
      data.slug = newSlug;
    }
  }

  Object.assign(page, data);
  await page.save();

  // Invalidate cache
  try {
    await redisConnection.del(`status-page:${oldSlug}`);
    if (data.slug && data.slug !== oldSlug) {
      await redisConnection.del(`status-page:${data.slug}`);
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to clear status page Redis cache');
  }

  logger.info({ statusPageId: page._id, projectId }, 'Status page updated');
  return page.toJSON();
}

/**
 * Deletes status page for a project.
 *
 * @param {string} projectId
 */
export async function deleteStatusPage(projectId) {
  const page = await StatusPage.findOneAndDelete({ projectId });
  if (!page) {
    const err = new Error('Status page not found for this project.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  try {
    await redisConnection.del(`status-page:${page.slug}`);
  } catch (err) {
    logger.warn({ err }, 'Failed to clear status page Redis cache on delete');
  }

  logger.info({ statusPageId: page._id, projectId }, 'Status page deleted');
}
