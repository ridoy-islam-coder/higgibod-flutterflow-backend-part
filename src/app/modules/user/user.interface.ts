/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model } from 'mongoose';
export enum UserRole {
  USER = 'USER',
  admin = 'admin',
  influencer = 'influencer',
}
export enum status {
  pending = 'pending',
  active = 'active',
  blocked = 'blocked',
}

// export enum Gender {
//   Male = 'Male',
//   Female = 'Female',
// }
 interface Verification {
  otp: string | number;
  expiresAt: Date;
  status: boolean;
}
interface image {
  id: string | number;
  url: string;
}
export interface TUser {
  [x: string]: any;
  id?: string;
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  website: string;
  categore: string;
  image: image;
  needsPasswordChange: boolean;
  passwordChangedAt?: Date;
  role: UserRole;
  status?: status;
  isVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  verification: Verification;
  accountType?: 'emailvarifi' | 'google' | 'facebook' | 'linkedin' | 'apple';
  country: string;
  fcmToken?: string;
  howDidYouHear?: string;
  subscribeToEmails?: boolean;
  termsAccepted?: boolean;
}


export interface UserModel extends Model<TUser> {
  isUserExist(email: string): Promise<TUser>;
  isUserExistByNumber(countryCode: string, phoneNumber: string): Promise<TUser>;
  IsUserExistbyId(id: string): Promise<TUser>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}
