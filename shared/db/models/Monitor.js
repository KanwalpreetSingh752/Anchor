import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      default: 'GET',
    },
    // Store custom request headers as a Map (key-value pairs)
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    body: { type: String },
    // Check interval in seconds. Minimum 30 seconds.
    interval: { type: Number, min: 30, default: 60 },
    // Request timeout in milliseconds
    timeout: { type: Number, default: 10000 },
    // HTTP status code considered a successful response
    expectedStatus: { type: Number, default: 200, min: 100, max: 599 },
    // Optional substring that must appear in the response body
    expectedBodyContains: { type: String },
    // Whether to verify SSL certificate validity
    checkSSL: { type: Boolean, default: true },
    // Days before SSL expiry that triggers an alert
    sslExpiryThreshold: { type: Number, default: 14 },
    // Alert channels to notify for this monitor
    alertChannels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AlertChannel',
      },
    ],
    isActive: { type: Boolean, default: true },
    // Populated after each check run
    lastCheckedAt: { type: Date },
    lastStatus: {
      type: String,
      enum: ['UP', 'DOWN', 'DEGRADED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    lastLatency: { type: Number },
    lastError: { type: String },
  },
  { timestamps: true },
);

monitorSchema.index({ projectId: 1, isActive: 1 });
monitorSchema.index({ isActive: 1 });

monitorSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    // Convert headers Map to a plain object for JSON
    if (ret.headers instanceof Map) {
      ret.headers = Object.fromEntries(ret.headers);
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Monitor = mongoose.model('Monitor', monitorSchema);
