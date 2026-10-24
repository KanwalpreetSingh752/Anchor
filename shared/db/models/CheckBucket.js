import mongoose from 'mongoose';

/**
 * CheckBucket — bucket-pattern aggregation document.
 * One document per (monitor, hour) pair, accumulating up to 60 raw samples
 * and running statistics for efficient time-series queries.
 */
const sampleSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true },
    status: {
      type: String,
      enum: ['UP', 'DOWN', 'DEGRADED', 'UNKNOWN'],
      required: true,
    },
    latency: { type: Number },
    statusCode: { type: Number },
    error: { type: String },
  },
  { _id: false },
);

const checkBucketSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: true,
    },
    // Floored to the nearest hour boundary (e.g. 2024-01-15T14:00:00Z)
    hour: { type: Date, required: true },
    count: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    totalLatency: { type: Number, default: 0 },
    // All latency samples in this bucket for percentile (p50, p95, p99) computation
    latencySamples: { type: [Number], default: [] },
    statuses: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
      degraded: { type: Number, default: 0 },
    },
    // Up to 60 raw samples (one per minute within the hour)
    samples: { type: [sampleSchema], default: [] },
  },
  { timestamps: false },
);

checkBucketSchema.index({ monitorId: 1, hour: 1 }, { unique: true });
checkBucketSchema.index({ hour: 1 }); // TTL or range queries

checkBucketSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const CheckBucket = mongoose.model('CheckBucket', checkBucketSchema);
