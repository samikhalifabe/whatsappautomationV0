export interface Contact {
    id: string;
    name: string;
    phoneNumber: string;
    category?: string;
    lastContactDate?: Date;
    notes?: string;
  }