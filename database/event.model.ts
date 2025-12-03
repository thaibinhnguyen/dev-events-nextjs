import mongoose, { Document, Model, Schema } from 'mongoose';

// Event domain types
export type EventMode = 'online' | 'offline' | 'hybrid';

export interface EventAttrs {
  title: string;
  slug?: string; // generated from title
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // stored in ISO date format (YYYY-MM-DD)
  time: string; // stored in HH:mm (24h) format
  mode: EventMode | string; // allow string to be flexible yet typed via EventMode
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
}

export interface EventDoc extends Document, EventAttrs {
  createdAt: Date;
  updatedAt: Date;
}

// Helper: trim and assert non-empty strings
const assertNonEmpty = (value: unknown, field: string): string => {
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const v = value.trim();
  if (!v) throw new Error(`${field} is required`);
  return v;
};

// Helper: simple slugify (URL-friendly, lowercase, alphanumeric with hyphens)
const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/['`]/g, '') // remove quotes
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> '-'
    .replace(/(^-|-$)+/g, ''); // trim leading/trailing '-'

// Normalize date to ISO (YYYY-MM-DD). Accepts common inputs like 2025-03-10 or Date.
const normalizeDate = (value: string | Date): string => {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) throw new Error('date is invalid');
  // Format as YYYY-MM-DD without time component
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Normalize time to HH:mm (24-hour)
const normalizeTime = (value: string): string => {
  const v = value.trim();
  // Accept variants like HH:mm, H:mm, HHmm, with optional am/pm
  const ampmMatch = v.match(/^\s*(\d{1,2})(?::?(\d{2}))?\s*([ap]m)?\s*$/i);
  if (!ampmMatch) throw new Error('time is invalid');
  let hours = parseInt(ampmMatch[1], 10);
  const minutes = parseInt(ampmMatch[2] ?? '0', 10);
  const ampm = (ampmMatch[3] ?? '').toLowerCase();
  if (ampm) {
    if (hours === 12) hours = 0;
    if (ampm === 'pm') hours += 12;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error('time is invalid');
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const EventSchema = new Schema<EventDoc, Model<EventDoc>>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true }, // unique index for SEO-friendly URLs
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // normalized to YYYY-MM-DD in pre-save
    time: { type: String, required: true }, // normalized to HH:mm in pre-save
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true, default: [] },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true, default: [] },
  },
  {
    timestamps: true, // createdAt, updatedAt
    versionKey: false,
    strict: 'throw', // throw on unknown fields for safety in production
  }
);

// Pre-save: generate slug from title, only when title changes. Also normalize date/time and validate required fields.
EventSchema.pre('save', function (next) {
  try {
    // Validate and sanitize required strings
    this.title = assertNonEmpty(this.title, 'title');
    this.description = assertNonEmpty(this.description, 'description');
    this.overview = assertNonEmpty(this.overview, 'overview');
    this.image = assertNonEmpty(this.image, 'image');
    this.venue = assertNonEmpty(this.venue, 'venue');
    this.location = assertNonEmpty(this.location, 'location');
    this.mode = assertNonEmpty(this.mode, 'mode');
    this.audience = assertNonEmpty(this.audience, 'audience');
    this.organizer = assertNonEmpty(this.organizer, 'organizer');

    if (!Array.isArray(this.agenda) || this.agenda.length === 0)
      throw new Error('agenda is required');
    if (!Array.isArray(this.tags) || this.tags.length === 0) throw new Error('tags are required');

    // Slug generation: only when title is modified
    if (this.isModified('title') || !this.slug) {
      this.slug = slugify(this.title);
    }

    // Normalize date/time formats
    this.date = normalizeDate(this.date);
    this.time = normalizeTime(this.time);

    return next();
  } catch (err) {
    return next(err as Error);
  }
});

// Explicit unique index on slug (in addition to unique: true for robustness)
EventSchema.index({ slug: 1 }, { unique: true });

export const Event: Model<EventDoc> =
  (mongoose.models.Event as Model<EventDoc>) || mongoose.model<EventDoc>('Event', EventSchema);

export default Event;
