import mongoose, { Schema, Document } from 'mongoose';

export interface IGarageHoliday extends Document {
  date: string; // YYYY-MM-DD
  title: string;
  isPaid: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GarageHolidaySchema: Schema = new Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IGarageHoliday>('GarageHoliday', GarageHolidaySchema);
