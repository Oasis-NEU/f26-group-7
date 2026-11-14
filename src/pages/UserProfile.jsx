import { useParams } from 'react-router'
import PagePlaceholder from '../components/PagePlaceholder'

export default function UserProfile() {
  // The :username part of /u/:username
  const { username } = useParams()
  return (
    <PagePlaceholder
      title={`@${username}`}
      description="Someone else's profile: bio, interests, friends and the events they're going to."
      step={10}
    />
  )
}
