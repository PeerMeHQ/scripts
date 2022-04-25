export type User = {
  address: string
  username: string | null
  name: string | null
  bio: string | null
  power: number
  hasProfileImage: boolean
  profileImageUrl: string
  follow: boolean | null
  followers: number
  followings: number
  connections: any[]
}
