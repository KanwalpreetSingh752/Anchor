import mongoose from 'mongoose';

const alertLogSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: true,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AlertChannel',
      required: true,
    },
    type: {
      type: String,
      enum: ['DOWN', 'RECOVERED', 'SSL_EXPIRY'],
      required: true,
    },
    sentAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['SENT', 'FAILED'],
      default: 'SENT',
    },
    // Populated when status is FAILED
    error: { type: String },
  },
  { timestamps: false },
);

alertLogSchema.index({ monitorId: 1 });
alertLogSchema.index({ incidentId: 1 });
alertLogSchema.index({ sentAt: -1 });

alertLogSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const AlertLog = mongoose.model('AlertLog', alertLogSchema);
