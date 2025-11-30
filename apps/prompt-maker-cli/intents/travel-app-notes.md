Please help me craft a prompt to build code for my travel app, notes below:

Role:
You are a senior full-stack engineer and solution architect specializing in React Native (Expo), TypeScript, Node.js/Express (or NestJS), and Prisma. You are also experienced with mobile UX for travel apps and integrating GPT-powered chat features. Your task is to design and scaffold a production-ready travel app codebase and architecture based on the requirements below.

Context:
I am building a mobile-first travel app that supports:

- Itinerary planning
- Hotel search
- GPT-powered chat assistant for travel help
- Budget reminders and notifications
- Offline caching of key data (itineraries, hotel selections, messages, etc.)

Technical context and constraints:

- Frontend: React Native with Expo, TypeScript, and modern React patterns (hooks, context, or state management library as appropriate).
- Backend: Node.js (Express or NestJS; you choose and justify), TypeScript, and Prisma as the ORM.
- Database: Assume PostgreSQL.
- Existing API gateway: There is an existing API gateway that exposes at least:
  - `GET/POST /trips`
  - `GET /deals`
    You may design additional internal services/endpoints, but these must integrate cleanly with the existing gateway paths.
- GPT-powered chat:
  - Use an abstracted “LLM service” layer that could be backed by OpenAI or similar.
  - Design the interface and integration points; you do not need to include real API keys.
- Offline cache:
  - Use a robust strategy for offline-first behavior on mobile (e.g., React Query + persistent storage, or another well-justified approach).
  - Support syncing when the device comes back online.
- Budget reminders:
  - Users can set trip budgets and receive reminders/alerts when approaching or exceeding budget.
  - Include basic logic for tracking expenses against budget per trip.
- Authentication:
  - Assume JWT-based auth or OAuth-based auth; choose one and justify.
  - Include where auth fits in the architecture and how it is enforced on routes.

Constraints:

1. Code and architecture must be mobile-first and optimized for React Native + Expo.
2. Use TypeScript across both frontend and backend.
3. Integrate with the existing API gateway paths `/trips` and `/deals`:
   - Show how the frontend will call these endpoints.
   - Show how the backend services and Prisma models map to these resources.
4. Include Prisma data models for:
   - User
   - Trip (with itinerary items, dates, destinations)
   - Hotel (or Accommodation)
   - Booking (linking trips and hotels)
   - Budget and Expense (per trip)
   - ChatSession and ChatMessage (for GPT-powered chat history)
5. Provide a clear, detailed folder structure for:
   - Frontend (React Native + Expo)
   - Backend (Node.js + Prisma)
   - Shared types/interfaces (if any)
6. Include CI steps:
   - Linting, type-checking, tests, and build steps for both frontend and backend.
   - Example GitHub Actions (or similar) workflow configuration outline.
7. Focus on clarity and practicality:
   - Prefer patterns that are maintainable and scalable.
   - Avoid over-engineering, but design for a real-world production app.
8. All code examples should be syntactically correct and consistent with the chosen stack.
9. When you need to make assumptions, state them explicitly and proceed with a reasonable default.

Output Format:
Provide your answer in the following structured format:

1. **High-Level Architecture Overview**
   - Describe the overall system architecture (frontend, backend, database, API gateway, LLM service).
   - Explain how itinerary planning, hotel search, GPT chat, budget reminders, and offline caching fit together.
   - Justify your choice of backend framework (Express vs NestJS) and state management / data fetching strategy on the frontend.

2. **Tech Stack Summary**
   - List the chosen technologies and major libraries for:
     - Frontend
     - Backend
     - Database & ORM
     - LLM integration
     - Offline caching
     - Testing
     - Tooling (linting, formatting, etc.)

3. **Detailed Folder / File Structure**
   - Provide a detailed folder structure for:
     - `/frontend` (React Native + Expo)
     - `/backend` (Node.js + Prisma)
     - `/infrastructure` or `/ci` (if applicable)
   - For each major folder, briefly describe its purpose.
   - Include where shared types/interfaces would live if used.

4. **Prisma Schema Design**
   - Provide a `schema.prisma` snippet (or multiple snippets) that defines models for:
     - `User`
     - `Trip`
     - `ItineraryItem`
     - `Hotel` (or `Accommodation`)
     - `Booking`
     - `Budget`
     - `Expense`
     - `ChatSession`
     - `ChatMessage`
   - Include relations, enums (if useful), and basic indexing where appropriate.
   - Show how these models support:
     - `/trips` and `/deals` endpoints
     - Budget tracking and reminders
     - Chat history for GPT-powered assistant

5. **Backend API Design**
   - Describe the main REST endpoints, including but not limited to:
     - `/trips` (CRUD, itinerary management)
     - `/deals` (read-only, hotel/flight deals)
     - `/chat` (for GPT-powered chat sessions and messages)
     - `/budget` or budget-related endpoints
   - For each endpoint group, provide:
     - Example route definitions (TypeScript, Express or NestJS).
     - Example request/response DTOs or TypeScript interfaces.
     - How authentication and authorization are applied.
   - Explain how these endpoints integrate with the existing API gateway (e.g., as upstream services or internal routes).

6. **Frontend Architecture & Key Screens**
   - Describe the main screens and navigation structure:
     - Trip list and trip detail (with itinerary)
     - Hotel search and hotel detail
     - GPT chat screen
     - Budget overview and expense entry
     - Settings / profile (if needed for auth and preferences)
   - Show example React Native + Expo components and hooks for:
     - Fetching trips from `/trips`
     - Fetching deals from `/deals`
     - Interacting with the GPT chat endpoint
     - Managing offline cache (e.g., React Query setup with persistence)
   - Include an example of how you would structure context or state management for:
     - Auth
     - Trips
     - Budget

7. **Offline Caching Strategy**
   - Explain the chosen offline-first strategy (e.g., React Query + AsyncStorage).
   - Show example code snippets for:
     - Setting up query client and persistence.
     - Handling sync when the device comes back online.
     - Caching trips, deals, and chat history for offline access.

8. **Budget Reminders Logic**
   - Describe how budget reminders work end-to-end:
     - Data model usage (Budget, Expense).
     - Backend logic for computing budget usage.
     - Any scheduled jobs or push notification triggers (describe conceptually).
   - Provide example backend logic (TypeScript) for:
     - Calculating remaining budget and threshold checks.
   - Provide example frontend logic for:
     - Displaying budget status.
     - Triggering local notifications (if applicable).

9. **GPT-Powered Chat Integration**
   - Describe the architecture for GPT chat:
     - ChatSession and ChatMessage models.
     - Backend service layer that calls the LLM provider.
     - How messages are stored and retrieved.
   - Provide example backend code for:
     - Creating a chat session.
     - Sending a user message and receiving a model response.
   - Provide example frontend code for:
     - A chat screen component.
     - Hook or service for sending/receiving messages.
   - Include considerations for:
     - Rate limiting.
     - Error handling and fallbacks.

10. **CI/CD and Quality Gates**
    - Propose a CI pipeline (e.g., GitHub Actions) that includes:
      - Install dependencies (frontend & backend).
      - Linting (ESLint).
      - Formatting check (Prettier).
      - Type-checking (TypeScript).
      - Running tests (Jest or other).
      - Building the frontend (Expo) and backend.
    - Provide an example GitHub Actions workflow YAML (or similar) that:
      - Runs on pull requests and main branch pushes.
      - Uses a matrix or separate jobs for frontend and backend.
    - Mention any additional quality gates (e.g., coverage thresholds, PR checks).

11. **Assumptions & Future Extensions**
    - List key assumptions you made.
    - Suggest possible future extensions (e.g., multi-currency support, advanced recommendation engine, collaborative trip planning).
    - Note any areas where you intentionally simplified the implementation for this initial version.

Throughout your answer:

- Be explicit and concrete with code examples (TypeScript).
- Keep explanations concise but clear.
- Ensure all parts are consistent with each other (models, endpoints, frontend usage, CI).
