import { notFound } from "next/navigation";
import Image from "next/image"
import BookEvent from "@/components/BookEvent";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

const EventDetailsItem = ({ icon, alt, label }: { icon: string, alt: string, label: string}) => (
  <div className="flex-row-gap-2 items-center">
    <Image src={icon} alt={alt} width={17} height={17} />
    <p>{label}</p>
  </div>
)

const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
  <div className="agenda">
    <h2>Agenda</h2>
    <ul>
      {agendaItems.map((item => (
        <li key={item}>{item}</li>
      )))}
    </ul>
  </div>
)

const EventTags = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-row gap-1.5 flex-wrap">
    {tags.map((tag: string) => (
      <div className="pill" key={tag}>{tag}</div>
    ))}
  </div>
)

const EventDetailsPage = async ({ params }: { params: Promise<{ slug: string}>}) => {
  const { slug } = await params;
  const response = await fetch(`${BASE_URL}/api/events/${slug}`);
  const result = await response.json();

  if (!result.success || !result.data) return notFound();

  const { description, image, overview, date, time, location, mode, agenda, audience, tags, organizer } = result.data;

  const bookings = 10;
  return (
    <section id='event'>
      <div className="header">
        <h1>Event Description</h1>
        <p>{description}</p> 
      </div>

      <div className="details">
        {/* Leftside - Event Content */}
        <div className="content">
          <Image src={image} alt="Event Banner" width={300} height={300} className="banner" />

          <section className="flex-col-gap-2">
            <h2>Overview</h2>
            <p>{overview}</p>
          </section>

          <section className="flex-col-gap-2">
            <h2>Event Details</h2>
            <EventDetailsItem icon="/icons/calendar.svg" alt="calendar" label={date} />
            <EventDetailsItem icon="/icons/clock.svg" alt="clock" label={time} />
            <EventDetailsItem icon="/icons/pin.svg" alt="pin" label={location} />
            <EventDetailsItem icon="/icons/mode.svg" alt="mode" label={mode} />
            <EventDetailsItem icon="/icons/audience.svg" alt="audience" label={audience} />
          </section>

          <EventAgenda agendaItems={JSON.parse(agenda[0])} />

          <section className="flex-col-gap-2">
            <h2>About the Organizer</h2>
            <p>{organizer}</p>
          </section>

          <EventTags tags={JSON.parse(tags)} />
        </div>
        {/* Rightside - Booking Form */}
        <aside className="booking">
          <div className="signup-card">
            <h2>Book Your Spot</h2>
            { bookings > 0 ? (
              <p className="text-sm">
                Join {bookings} people who have already booked
              </p>
            ) : (
              <p className="text-sm">Be the first to book your spot</p>
            )}
            <BookEvent />
          </div>
        </aside>
      </div>
    </section>
  )
}

export default EventDetailsPage