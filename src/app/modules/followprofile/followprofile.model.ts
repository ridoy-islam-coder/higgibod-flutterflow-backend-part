import { model, Schema } from 'mongoose';
import { IFollow } from './followprofile.interface';



const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

FollowSchema.index({ follower: 1, organizer: 1 }, { unique: true });

export const Follow = model<IFollow>('Follow', FollowSchema);