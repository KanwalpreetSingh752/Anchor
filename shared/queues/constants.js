/** Names of BullMQ queues used throughout Anchor. */
export const QUEUE_NAMES = {
  MONITOR_CHECKS: 'monitor-checks',
  ALERT_DISPATCH: 'alert-dispatch',
  DATA_AGGREGATION: 'data-aggregation',
};

/** Names of individual BullMQ jobs. */
export const JOB_NAMES = {
  MONITOR_CHECK: 'monitor-check',
  ALERT_SEND: 'alert-send',
  HOURLY_AGGREGATE: 'data-hourly-aggregate',
};
