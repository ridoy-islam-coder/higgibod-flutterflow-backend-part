import {  Types, Document } from 'mongoose';


export interface IFollow extends Document {
  follower: Types.ObjectId;
  organizer: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}