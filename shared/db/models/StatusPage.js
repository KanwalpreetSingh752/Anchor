import mongoose from 'mongoose';

const statusPageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    monitors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Monitor',
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    customDomain: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

statusPageSchema.index({ projectId: 1 });
statusPageSchema.index({ customDomain: 1 }, { sparse: true });

statusPageSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const StatusPage = mongoose.model('StatusPage', statusPageSchema);
