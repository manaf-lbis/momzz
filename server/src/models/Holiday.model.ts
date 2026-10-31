import mongoose, { Schema, Document } from 'mongoose';

export interface IHoliday extends Document {
  date: Date;
  title: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema: Schema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IHoliday>('Holiday', HolidaySchema);
