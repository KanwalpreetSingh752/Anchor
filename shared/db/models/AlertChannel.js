import mongoose from 'mongoose';

const alertChannelSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['EMAIL', 'WEBHOOK', 'SLACK'],
      required: true,
    },
    /**
     * Channel-specific configuration stored as Mixed.
     * EMAIL: { address: string }
     * WEBHOOK: { url: string, secret?: string }
     * SLACK: { webhookUrl: string, channel?: string }
     */
    config: { type: mongoose.Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

alertChannelSchema.index({ projectId: 1 });
alertChannelSchema.index({ projectId: 1, type: 1 });

alertChannelSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const AlertChannel = mongoose.model('AlertChannel', alertChannelSchema);
