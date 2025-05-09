# WhatsApp Automation Project Custom Instructions

## Project Overview
- Two-part application for WhatsApp automation:
  1. Express.js server for WhatsApp API integration (/Users/sami/Journey/Dev/whatsapp-server)
  2. Next.js frontend application (/Users/sami/Journey/Dev/whatsappautomationV0)
- Focuses on vehicle-related communication and contact management
- Uses Supabase for database and authentication

## Key Technologies
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Shadcn/ui
- Backend: Express.js, whatsapp-web.js library
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Communication: WhatsApp Web API via Puppeteer

## Main Functionalities
1. WhatsApp Message Automation
2. Vehicle Management and Tracking
3. Contact Management and History
4. Multi-sender Capabilities with Anti-spam Features
5. Conversation Tracking and Management
6. Message Templates with Variables

## Project Structure

### WhatsApp Server (/Users/sami/Journey/Dev/whatsapp-server)
- `server.js`: Main Express server with WhatsApp client integration
- `create_messages_table.js`: Utility to create messages table in Supabase
- `get_vehicles.js`: Utility to fetch vehicles from Supabase
- Key dependencies:
  - whatsapp-web.js: Library for WhatsApp Web automation
  - express: Web server framework
  - @supabase/supabase-js: Supabase client
  - qrcode-terminal: QR code generation for WhatsApp authentication

### Next.js Frontend (/Users/sami/Journey/Dev/whatsappautomationV0)
- `/app`: Main routes and API endpoints
- `/components`: UI and core application components
- `/hooks`: State management and data fetching
- `/lib/supabase.ts`: Supabase configuration
- `/services/messageService.ts`: Message handling logic
- `/types`: TypeScript type definitions

## Key Components
- `WhatsAppContext.tsx`: Manages global WhatsApp connection state
- `WhatsAppInterface.tsx`: Main interface for sending individual messages
- `WhatsAppConversations.tsx`: Interface for viewing and managing conversations
- `MultiSender.tsx`: Interface for sending messages to multiple vehicles
- `VehicleManager.tsx`: Interface for managing vehicle information
- `ContactManager.tsx`: Interface for managing contacts

## Custom Hooks
- `useAuth.ts`: Authentication state and methods
- `useContacts.ts`: Contact data management
- `useVehicles.ts`: Vehicle-related data operations
- `useContactHistory.ts`: Track contact interaction history

## Database Structure
- `vehicles`: Stores vehicle information (brand, model, price, year, phone, etc.)
- `contact_records`: Tracks contact history with vehicles
- `contact_history`: Stores individual contact events
- `messages`: Stores WhatsApp messages

## WhatsApp Integration
- Uses whatsapp-web.js library with Puppeteer
- QR code authentication flow
- Message sending with rate limiting and anti-spam features
- Conversation tracking and management
- Automatic contact status updates

## Development Notes
- Server must be running for WhatsApp functionality
- WhatsApp Web session is stored in session-whatsapp-api directory
- Use custom hooks for state management
- Leverage Supabase for authentication and data storage
- Implement anti-spam measures (random delays, message variations)

## Deployment Considerations
- Ensure Supabase environment variables are correctly set
- Configure WhatsApp API credentials
- Set up proper authentication flows
- Consider headless browser configuration for production
- Implement proper error handling and logging

## API Endpoints (WhatsApp Server)

### WhatsApp Connection
- `GET /api/whatsapp/status`: Check WhatsApp connection status
- `GET /api/whatsapp/qrcode`: Get QR code for WhatsApp authentication

### Messaging
- `POST /api/whatsapp/send`: Send a WhatsApp message
- `GET /api/messages`: Get recent WhatsApp messages
- `GET /api/whatsapp/all-conversations`: Get all WhatsApp conversations
- `GET /api/whatsapp/messages/vehicle/:vehicleId`: Get messages for a specific vehicle
- `GET /api/whatsapp/messages/contact/:contactId`: Get messages for a specific contact

### Vehicle Management
- `GET /api/whatsapp/update-contacted-vehicles`: Update contact status for vehicles

## Frontend Routes
- `/`: Home page with WhatsApp interface
- `/conversations`: Manage and view conversations
- `/whatsapptest`: Testing WhatsApp functionality

## Performance and Scalability
- Utilize React hooks for efficient state management
- Implement lazy loading and code splitting
- Optimize Supabase queries
- Use TypeScript for compile-time type checking
- Implement rate limiting for WhatsApp messages

## Security Considerations
- Implement proper authentication flows
- Secure WhatsApp API credentials
- Use Supabase Row Level Security (RLS)
- Validate and sanitize user inputs
- Implement anti-spam measures
