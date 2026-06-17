import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingRegistration extends Document {
  email: string;
  otp: string;
  otpExpires: Date;
  payload: any;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

// ✅ OTP expire হলে MongoDB auto delete করবে
pendingRegistrationSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

const PendingRegistration = mongoose.model<IPendingRegistration>(
  'PendingRegistration',
  pendingRegistrationSchema,
);

export default PendingRegistration;
