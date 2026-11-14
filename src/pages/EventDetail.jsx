import { useParams } from 'react-router'
import PagePlaceholder from '../components/PagePlaceholder'

export default function EventDetail() {
  // The :id part of /events/:id
  const { id } = useParams()
  return (
    <PagePlaceholder
      title={`Event ${id}`}
      description="Everything about one event: details, who's going, RSVP, save, share and directions."
      step={5}
    />
  )
}
