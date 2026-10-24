import mongoose from 'mongoose';

const timelineEntrySchema = new mongoose.Schema(
  {
    ts: { type: Date, default: Date.now },
    event: {
      type: String,
      enum: ['OPENED', 'UPDATED', 'RESOLVED', 'ACKNOWLEDGED'],
      required: true,
    },
    note: { type: String },
  },
  { _id: false },
);

const incidentSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED'],
      default: 'OPEN',
    },
    cause: {
      type: String,
      enum: ['DOWN', 'DEGRADED', 'SSL_EXPIRY'],
      required: true,
    },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    // Duration in milliseconds (populated when resolved)
    duration: { type: Number },
    rootCause: { type: String },
    affectedChecks: { type: Number, default: 0 },
    timeline: { type: [timelineEntrySchema], default: [] },
  },
  { timestamps: true },
);

incidentSchema.index({ monitorId: 1, status: 1 });
incidentSchema.index({ projectId: 1, status: 1 });
incidentSchema.index({ startedAt: -1 });

incidentSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Incident = mongoose.model('Incident', incidentSchema);
