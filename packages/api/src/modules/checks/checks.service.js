import mongoose from 'mongoose';
import { Monitor, CheckBucket, createLogger } from '@anchor/shared';

const logger = createLogger('checks-service');

/**
 * Calculates start Date based on time range string.
 * @param {'24h'|'7d'|'30d'} [range='24h']
 * @returns {Date}
 */
function getStartDateForRange(range = '24h') {
  const now = Date.now();
  switch (range) {
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now - 24 * 60 * 60 * 1000);
  }
}

/**
 * Computes a given percentile value from a sorted array of numbers.
 * @param {number[]} sortedArray
 * @param {number} percentile (0 to 100)
 * @returns {number}
 */
function calculatePercentile(sortedArray, percentile) {
  if (!sortedArray || sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

/**
 * Retrieves raw check samples for a monitor within a time range, paginated.
 *
 * @param {string} projectId
 * @param {string} monitorId
 * @param {object} [options]
 * @param {'24h'|'7d'|'30d'} [options.range='24h']
 * @param {number} [options.page=1]
 * @param {number} [options.limit=50]
 * @returns {Promise<{ checks: object[], pagination: object }>}
 */
export async function getMonitorChecks(
  projectId,
  monitorId,
  { range = '24h', page = 1, limit = 50 } = {},
) {
  const monitor = await Monitor.findOne({ _id: monitorId, projectId });
  if (!monitor) {
    const err = new Error('Monitor not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const startDate = getStartDateForRange(range);
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (currentPage - 1) * pageLimit;

  const objectId = new mongoose.Types.ObjectId(monitorId);

  const [aggregateResult] = await CheckBucket.aggregate([
    {
      $match: {
        monitorId: objectId,
        hour: { $gte: startDate },
      },
    },
    { $unwind: '$samples' },
    { $sort: { 'samples.ts': -1 } },
    {
      $facet: {
        checks: [
          { $skip: skip },
          { $limit: pageLimit },
          {
            $project: {
              _id: 0,
              ts: '$samples.ts',
              status: '$samples.status',
              latency: '$samples.latency',
              statusCode: '$samples.statusCode',
              error: '$samples.error',
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const checks = aggregateResult?.checks || [];
  const total = aggregateResult?.totalCount?.[0]?.count || 0;

  return {
    checks,
    pagination: {
      page: currentPage,
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
    },
  };
}

/**
 * Calculates monitor uptime, latency percentiles, and hourly series.
 *
 * @param {string} projectId
 * @param {string} monitorId
 * @param {'24h'|'7d'|'30d'} [range='24h']
 * @returns {Promise<object>}
 */
export async function getMonitorStats(projectId, monitorId, range = '24h') {
  const monitor = await Monitor.findOne({ _id: monitorId, projectId });
  if (!monitor) {
    const err = new Error('Monitor not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const startDate = getStartDateForRange(range);
  const buckets = await CheckBucket.find({
    monitorId,
    hour: { $gte: startDate },
  }).sort({ hour: 1 });

  let totalChecks = 0;
  let totalFailures = 0;
  let totalLatency = 0;
  const allLatencies = [];

  const series = buckets.map((bucket) => {
    totalChecks += bucket.count;
    totalFailures += bucket.failures;
    totalLatency += bucket.totalLatency || 0;

    const bucketLatencies = (bucket.latencySamples || [])
      .filter((l) => typeof l === 'number' && !isNaN(l))
      .sort((a, b) => a - b);

    allLatencies.push(...bucketLatencies);

    const bucketUptime =
      bucket.count > 0
        ? Number((((bucket.count - bucket.failures) / bucket.count) * 100).toFixed(2))
        : 100;

    const bucketAvgLatency =
      bucket.count > 0 ? Math.round((bucket.totalLatency || 0) / bucket.count) : 0;

    return {
      hour: bucket.hour,
      count: bucket.count,
      failures: bucket.failures,
      uptime: bucketUptime,
      avgLatency: bucketAvgLatency,
      p95Latency: calculatePercentile(bucketLatencies, 95),
      statuses: bucket.statuses,
    };
  });

  allLatencies.sort((a, b) => a - b);

  const uptime =
    totalChecks > 0
      ? Number((((totalChecks - totalFailures) / totalChecks) * 100).toFixed(3))
      : 100;

  const avgLatency =
    totalChecks > 0 ? Math.round(totalLatency / totalChecks) : 0;

  return {
    range,
    totalChecks,
    totalFailures,
    uptime,
    avgLatency,
    p50: calculatePercentile(allLatencies, 50),
    p95: calculatePercentile(allLatencies, 95),
    p99: calculatePercentile(allLatencies, 99),
    series,
  };
}
