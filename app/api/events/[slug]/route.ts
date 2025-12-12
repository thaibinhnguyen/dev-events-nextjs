import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event, { EventDoc } from '@/database/event.model';

// Narrow type for params expected by Next.js route handlers in app directory
interface RouteParams {
  params: Promise<{
    slug?: string;
  }>;
}

// Runtime-safe check for a non-empty string consisting of URL-safe slug characters
const isValidSlug = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return false;
  // Accept typical slug characters: letters, numbers, hyphens and underscores, forward slashes not allowed here
  return true;
};

// Shape of the successful API response
interface EventResponse {
  success: true;
  data: EventDoc;
}

// Shape of the error API response
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR';
  };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams ?? {};

    // Validate slug presence and format
    if (!slug || !isValidSlug(slug)) {
      const body: ErrorResponse = {
        success: false,
        error: { message: 'A valid slug path parameter is required.', code: 'BAD_REQUEST' },
      };
      return new Response(JSON.stringify(body), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure DB connection is established
    await connectToDatabase();

    // Query by slug
    const event = await Event.findOne({ slug }).lean<EventDoc>().exec();

    if (!event) {
      const body: ErrorResponse = {
        success: false,
        error: { message: 'Event not found.', code: 'NOT_FOUND' },
      };
      return new Response(JSON.stringify(body), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: EventResponse = { success: true, data: event };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Do not leak internal error details in production response
    const body: ErrorResponse = {
      success: false,
      error: { message: 'Unexpected server error.', code: 'INTERNAL_ERROR' },
    };
    return new Response(JSON.stringify(body), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
