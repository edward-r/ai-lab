Generating prompt ⠼
AI Prompt Generator
────────────────────
Generated prompt:

Role:
You are a senior full-stack engineer and mobile architect specializing in React Native + Expo applications. You are also an expert in API integration, offline-first architectures, and CI/CD for JavaScript/TypeScript projects. Your task is to design and implement a mobile-first travel app with itinerary planning, hotel search, and GPT-powered chat, integrating with an existing API gateway.

Context:

- The app is a mobile-first travel planner built with React Native and Expo.
- Core features:
  - Itinerary planning (create, edit, view, and manage trips).
  - Hotel search and deals browsing.
  - GPT-powered chat assistant for travel advice, itinerary refinement, and Q&A.
  - Budget reminders and budget tracking per trip.
  - Offline cache for key data (trips, itineraries, and possibly hotel search results).
- Existing backend:
  - API Gateway endpoints:
    - `GET/POST/PUT/DELETE /trips` for trip and itinerary management.
    - `GET /deals` for hotel deals and related offers.
  - Assume these endpoints return/accept JSON with reasonable, conventional shapes; if needed, define and document assumed request/response schemas.
- GPT-powered chat:
  - Use a modular abstraction so the chat provider (e.g., OpenAI, Azure OpenAI, etc.) can be swapped.
  - The chat should be context-aware of the user’s trips and budget when possible (e.g., suggest hotels within budget, adjust itineraries).
- Offline behavior:
  - The app should cache trips and relevant hotel data locally.
  - The app should be usable in read-only mode when offline (view existing trips, cached deals, and chat history where possible).
  - Implement a sync strategy for when the device comes back online.
- Budget reminders:
  - Allow users to set a budget per trip.
  - Track estimated spend based on itinerary items and/or selected hotels.
  - Provide reminders or alerts when approaching or exceeding budget.
- Target platform:
  - React Native + Expo (latest stable SDK).
  - TypeScript is preferred.
- You may assume:
  - Authentication is already handled or stubbed; focus on app features and structure.
  - Environment variables are available for API base URLs and GPT provider keys.

Constraints:

- Use React Native + Expo with TypeScript.
- Design the app as mobile-first with good UX patterns for small screens.
- Implement a clean, modular architecture:
  - Separation of concerns between UI components, hooks, services, and state management.
  - Clearly defined API client layer for `/trips` and `/deals`.
  - Clearly defined chat service abstraction for GPT-powered features.
- Include offline caching:
  - Use a suitable solution (e.g., AsyncStorage, SQLite, or a lightweight local DB) and explain your choice.
  - Implement basic caching logic and example code for syncing.
- Include budget reminder logic:
  - Data model for budgets.
  - Functions/hooks to compute remaining budget and trigger reminders.
- Code quality:
  - Use TypeScript types/interfaces for API responses, entities (Trip, ItineraryItem, Deal, Budget, ChatMessage, etc.).
  - Include basic error handling and loading states.
  - Follow idiomatic React Native patterns and hooks.
- CI/CD:
  - Propose a simple but realistic CI setup (e.g., GitHub Actions) that:
    - Installs dependencies.
    - Runs type-checking and tests.
    - Runs linting/formatting.
    - Optionally builds the Expo app (or at least validates the Expo config).
- Documentation:
  - Add inline comments where helpful.
  - Provide a short README-style overview of how to run and develop the app.

Output Format:
Produce a comprehensive answer with the following sections, in order:

1. **High-Level Architecture & Design**
   - Describe the overall architecture of the app.
   - Explain how itinerary planning, hotel search, GPT chat, budget reminders, and offline caching fit together.
   - Describe the state management approach (e.g., React Query, Zustand, Redux, or Context + hooks) and justify your choice.
   - Describe the offline strategy (what is cached, when, and how sync works conceptually).

2. **Suggested Tech Stack**
   - Confirm React Native + Expo and TypeScript.
   - Specify libraries for:
     - Navigation (e.g., React Navigation).
     - State management and data fetching (e.g., React Query, Zustand, Redux Toolkit, etc.).
     - HTTP client (e.g., axios or fetch wrapper).
     - Offline storage (e.g., AsyncStorage, SQLite, or other).
     - GPT/chat integration (e.g., using fetch/axios to call an LLM API).
     - Form handling and validation (if needed).
     - Testing (unit and component tests).
     - Linting/formatting (ESLint, Prettier).
   - Briefly justify key library choices.

3. **API Integration Design**
   - Define TypeScript interfaces/types for:
     - Trip, ItineraryItem, Deal, Budget, ChatMessage, ChatSession, etc.
   - Show example request/response shapes for:
     - `/trips` (list, create, update, delete).
     - `/deals` (list/filter).
   - Provide example API client functions for these endpoints.
   - Show how the GPT chat service is abstracted (e.g., `ChatService` interface) and an example implementation that calls a generic LLM endpoint.

4. **Detailed Folder & File Structure**
   - Propose a clear, scalable folder structure for an Expo + React Native + TypeScript app.
   - Include at least:
     - `app/` or `src/` root.
     - Screens (e.g., `screens/Trips`, `screens/TripDetail`, `screens/Deals`, `screens/Chat`, `screens/Settings`).
     - Components (reusable UI components).
     - Navigation (stack/tab navigators).
     - Services (API clients, chat service, offline storage).
     - Hooks (custom hooks for data fetching, budget logic, offline sync).
     - Store/state (if using a centralized store).
     - Types/models.
     - Utils/helpers.
     - Config (env, constants).
     - Tests.
   - Present this as a tree-like structure, with brief descriptions of key files/folders.

5. **Core Feature Implementations (Code Examples)**
   Provide representative TypeScript/React Native code snippets for:
   - **Itinerary Planning:**
     - A screen to list trips and navigate to a trip detail.
     - A trip detail screen showing itinerary items and allowing add/edit/delete.
     - Hooks or functions to fetch and mutate trips via `/trips`.
   - **Hotel Search & Deals:**
     - A screen to search/browse deals from `/deals`.
     - Hook or service function to fetch deals with filters (e.g., location, dates, budget).
   - **GPT-Powered Chat:**
     - A chat screen UI (message list + input).
     - Hook or service to send a message to the GPT provider and receive a response.
     - Example of including trip and budget context in the prompt payload.
   - **Budget Reminders:**
     - Data model and hook to compute remaining budget for a trip.
     - Example of triggering a reminder/alert when approaching or exceeding budget.
   - **Offline Cache & Sync:**
     - Example of caching trips and deals locally.
     - Example of reading from cache when offline.
     - Example of a simple sync routine that pushes local changes when back online.

6. **Offline-First & Error Handling Considerations**
   - Explain how the app behaves when:
     - The user is offline and opens the app.
     - The user goes offline while using the app.
     - The user comes back online (how sync is triggered).
   - Describe strategies for conflict resolution (e.g., last-write-wins, timestamps).
   - Show example patterns for error handling and user feedback (e.g., toasts, banners, retry buttons).

7. **CI/CD Setup**
   - Propose a CI configuration (e.g., GitHub Actions YAML) that:
     - Checks out the repo.
     - Installs dependencies (with caching).
     - Runs:
       - TypeScript type-checking.
       - Tests (e.g., Jest).
       - Linting (ESLint) and formatting check (Prettier).
     - Optionally runs an Expo build or at least `expo doctor` / `expo prebuild` / `expo lint` to validate the project.
   - Provide the actual YAML example for a GitHub Actions workflow file (e.g., `.github/workflows/ci.yml`).

8. **Developer Onboarding & Usage Instructions**
   - Provide a concise README-style section that explains:
     - How to set up the project locally (prerequisites, environment variables).
     - How to run the app in development with Expo.
     - How to run tests, linting, and type-checking.
     - How to trigger or use the CI pipeline.

Throughout your answer:

- Use clear headings and subheadings.
- Use TypeScript in all code examples.
- Make reasonable assumptions where details are missing, and clearly state those assumptions.
- Focus on clarity, maintainability, and scalability of the code and architecture.
  Generated prompt ✓
  Polished prompt ✓⠇

Polished prompt
────────────────────
Intent:
Please help me craft a prompt to build code for my travel app.

- Must support itinerary planning, hotel search, GPT-powered chat.
- Mobile-first React Native + Expo.
- Existing API gateway (`/trips` and `/deals`).
- Budget reminders + offline cache.
- Deliverables must include suggested folder structure and CI steps.
  EOF

---

Generated prompt candidate:
Role:
You are a senior full-stack engineer and mobile architect specializing in React Native + Expo applications. You are also an expert in API integration, offline-first architectures, and CI/CD for JavaScript/TypeScript projects. Your task is to design and implement a mobile-first travel app with itinerary planning, hotel search, and GPT-powered chat, integrating with an existing API gateway.

Context:

- The app is a mobile-first travel planner built with React Native and Expo.
- Core features:
  - Itinerary planning (create, edit, view, and manage trips).
  - Hotel search and deals browsing.
  - GPT-powered chat assistant for travel advice, itinerary refinement, and Q&A.
  - Budget reminders and budget tracking per trip.
  - Offline cache for key data (trips, itineraries, and hotel search results where appropriate).
- Existing backend:
  - API Gateway endpoints:
    - `GET/POST/PUT/DELETE /trips` for trip and itinerary management.
    - `GET /deals` for hotel deals and related offers.
  - Assume these endpoints return/accept JSON with conventional, reasonable shapes; where needed, define and document assumed request/response schemas.
- GPT-powered chat:
  - Use a modular abstraction so the chat provider (e.g., OpenAI, Azure OpenAI, etc.) can be swapped without changing UI code.
  - The chat should be context-aware of the user’s trips and budget when possible (e.g., suggest hotels within budget, adjust itineraries).
- Offline behavior:
  - Cache trips and relevant hotel data locally.
  - The app must be usable in read-only mode when offline (view existing trips, cached deals, and chat history where possible).
  - Implement and describe a sync strategy for when the device comes back online.
- Budget reminders:
  - Allow users to set a budget per trip.
  - Track estimated spend based on itinerary items and/or selected hotels.
  - Provide reminders or alerts when approaching or exceeding budget.
- Target platform:
  - React Native + Expo (latest stable SDK).
  - TypeScript is preferred.
- You may assume:
  - Authentication is already handled or stubbed; focus on app features and structure.
  - Environment variables are available for API base URLs and GPT provider keys.

Constraints:

- Use React Native + Expo with TypeScript.
- Design the app as mobile-first with good UX patterns for small screens.
- Implement a clean, modular architecture:
  - Clear separation of concerns between UI components, hooks, services, and state management.
  - Clearly defined API client layer for `/trips` and `/deals`.
  - Clearly defined chat service abstraction for GPT-powered features.
- Include offline caching:
  - Use a suitable solution (e.g., AsyncStorage, SQLite, or a lightweight local DB) and explain your choice.
  - Implement basic caching logic and example code for syncing.
- Include budget reminder logic:
  - Data model for budgets.
  - Functions/hooks to compute remaining budget and trigger reminders.
- Code quality:
  - Use TypeScript types/interfaces for API responses and entities (Trip, ItineraryItem, Deal, Budget, ChatMessage, etc.).
  - Include basic error handling and loading states.
  - Follow idiomatic React Native patterns and hooks.
- CI/CD:
  - Propose a simple but realistic CI setup (e.g., GitHub Actions) that:
    - Installs dependencies.
    - Runs type-checking and tests.
    - Runs linting/formatting.
    - Optionally builds the Expo app (or at least validates the Expo config).
- Documentation:
  - Add inline comments where helpful.
  - Provide a short README-style overview of how to run and develop the app.

Output Format:
Produce a comprehensive answer with the following sections, in order:

1. **High-Level Architecture & Design**
   - Describe the overall architecture of the app.
   - Explain how itinerary planning, hotel search, GPT chat, budget reminders, and offline caching fit together.
   - Describe the state management approach (e.g., React Query, Zustand, Redux, or Context + hooks) and justify your choice.
   - Describe the offline strategy (what is cached, when, and how sync works conceptually).

2. **Suggested Tech Stack**
   - Confirm React Native + Expo and TypeScript.
   - Specify libraries for:
     - Navigation (e.g., React Navigation).
     - State management and data fetching (e.g., React Query, Zustand, Redux Toolkit, etc.).
     - HTTP client (e.g., axios or a typed fetch wrapper).
     - Offline storage (e.g., AsyncStorage, SQLite, or other).
     - GPT/chat integration (e.g., using fetch/axios to call an LLM API).
     - Form handling and validation (if needed).
     - Testing (unit and component tests).
     - Linting/formatting (ESLint, Prettier).
   - Briefly justify key library choices.

3. **API Integration Design**
   - Define TypeScript interfaces/types for:
     - Trip, ItineraryItem, Deal, Budget, ChatMessage, ChatSession, etc.
   - Show example request/response shapes for:
     - `/trips` (list, create, update, delete).
     - `/deals` (list/filter).
   - Provide example API client functions for these endpoints.
   - Show how the GPT chat service is abstracted (e.g., `ChatService` interface) and an example implementation that calls a generic LLM endpoint.

4. **Detailed Folder & File Structure**
   - Propose a clear, scalable folder structure for an Expo + React Native + TypeScript app.
   - Include at least:
     - `app/` or `src/` root.
     - Screens (e.g., `screens/Trips`, `screens/TripDetail`, `screens/Deals`, `screens/Chat`, `screens/Settings`).
     - Components (reusable UI components).
     - Navigation (stack/tab navigators).
     - Services (API clients, chat service, offline storage).
     - Hooks (custom hooks for data fetching, budget logic, offline sync).
     - Store/state (if using a centralized store).
     - Types/models.
     - Utils/helpers.
     - Config (env, constants).
     - Tests.
   - Present this as a tree-like structure, with brief descriptions of key files/folders.

5. **Core Feature Implementations (Code Examples)**
   Provide representative TypeScript/React Native code snippets for:
   - **Itinerary Planning:**
     - A screen to list trips and navigate to a trip detail.
     - A trip detail screen showing itinerary items and allowing add/edit/delete.
     - Hooks or functions to fetch and mutate trips via `/trips`.
   - **Hotel Search & Deals:**
     - A screen to search/browse deals from `/deals`.
     - Hook or service function to fetch deals with filters (e.g., location, dates, budget).
   - **GPT-Powered Chat:**
     - A chat screen UI (message list + input).
     - Hook or service to send a message to the GPT provider and receive a response.
     - Example of including trip and budget context in the prompt payload.
   - **Budget Reminders:**
     - Data model and hook to compute remaining budget for a trip.
     - Example of triggering a reminder/alert when approaching or exceeding budget.
   - **Offline Cache & Sync:**
     - Example of caching trips and deals locally.
     - Example of reading from cache when offline.
     - Example of a simple sync routine that pushes local changes when back online.

6. **Offline-First & Error Handling Considerations**
   - Explain how the app behaves when:
     - The user is offline and opens the app.
     - The user goes offline while using the app.
     - The user comes back online (how sync is triggered).
   - Describe strategies for conflict resolution (e.g., last-write-wins, timestamps).
   - Show example patterns for error handling and user feedback (e.g., toasts, banners, retry buttons).

7. **CI/CD Setup**
   - Propose a CI configuration (e.g., GitHub Actions YAML) that:
     - Checks out the repo.
     - Installs dependencies (with caching).
     - Runs:
       - TypeScript type-checking.
       - Tests (e.g., Jest).
       - Linting (ESLint) and formatting check (Prettier).
     - Optionally runs an Expo build or at least `expo doctor` / `expo prebuild` / `expo lint` to validate the project.
   - Provide the actual YAML example for a GitHub Actions workflow file (e.g., `.github/workflows/ci.yml`).

8. **Developer Onboarding & Usage Instructions**
   - Provide a concise README-style section that explains:
     - How to set up the project locally (prerequisites, environment variables).
     - How to run the app in development with Expo.
     - How to run tests, linting, and type-checking.
     - How to trigger or use the CI pipeline.

Throughout your answer:

- Use clear headings and subheadings.
- Use TypeScript in all code examples.
- Make reasonable assumptions where details are missing, and clearly state those assumptions.
- Focus on clarity, maintainability, and scalability of the code and architecture.

---

Return the polished prompt text, preserving exact sections.

(Model: gpt-5.1)
17:21:45 ~/Projects/ai-lab/apps/prompt-maker-cli main $
