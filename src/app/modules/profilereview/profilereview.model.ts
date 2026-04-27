import { model, Schema } from 'mongoose';
import { IReport, IReview } from './profilereview.interface';

const imageSchema = new Schema({
  id: { type: String, required: true },
  url: { type: String, required: true },
});

// ── Reply Schema ──────────────────────────────────────────────────────────────
const replySchema = new Schema(
  {
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const ReviewSchema = new Schema<IReview>(
  {
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    image: { type: imageSchema, required: false },
    isAnonymous: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    // ── Organizer Reply ───────────────────────────────────────
    reply: { type: replySchema, default: null },
  },
  { timestamps: true }
);

// ✅ this.find() → this.where() — findById কে block করবে না
ReviewSchema.pre('find', function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

ReviewSchema.pre('findOne', function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const ReportSchema = new Schema<IReport>(
  {
    review: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: [
        'Just to let you know this might be a problem',
        'Disrespectful and harmful behavior',
        "Violating platform's harassment policy",
      ],
      required: true,
    },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

export const Review = model<IReview>('Review', ReviewSchema);
export const Report = model<IReport>('Report', ReportSchema);