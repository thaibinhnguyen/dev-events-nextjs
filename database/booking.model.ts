import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { Event } from './event.model';

export interface BookingAttrs {
  eventId: Types.ObjectId;
  slug: string,
  email: string;
}

export interface BookingDoc extends Document, BookingAttrs {
  createdAt: Date;
  updatedAt: Date;
}

// Simple email validation regex (balanced strictness vs. practicality)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<BookingDoc, Model<BookingDoc>>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => emailRegex.test(v),
        message: 'email is invalid',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  }
);

// Pre-save: ensure event exists and normalize fields.
BookingSchema.pre('save', async function (next) {
  try {
    // Verify referenced event exists to avoid orphan bookings
    const exists = await Event.exists({ _id: this.eventId });
    if (!exists) throw new Error('Referenced event does not exist');
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

export const Booking: Model<BookingDoc> =
  (mongoose.models.Booking as Model<BookingDoc>) ||
  mongoose.model<BookingDoc>('Booking', BookingSchema);

export default Booking;
