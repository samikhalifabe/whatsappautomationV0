export interface Contact {
  id: string
  name: string
  number: string
  lastContact: Date
  groupId?: string
}

export interface ContactGroup {
  id: string
  name: string
  color: string
}
