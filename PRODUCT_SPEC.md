# War Day Planner - Product Specification

## 1. App Purpose & Users
**Target Users:** Overthinkers, polymaths, and high-awareness young adults who resonate with the "War Mode" or "Enemy Mind" mindset.
**Core Goal:** To transform a user's day from a chaotic stream of thoughts into a tactical execution system. It focuses on high-leverage tasks, disciplined routines, and objective self-reflection.

---

## 2. Platform & General UX
- **Platform:** Responsive Web Application (Mobile-first priority).
- **Authentication:** Minimalist Auth (Email/Password or Magic Link).
- **Theme:** "Tactical Dark"
  - **Background:** `#f7f7f7` (Very light grey for content clarity).
  - **Panels/Cards:** `#050608` (Deep charcoal for high contrast).
  - **Accents:** `#51ff9f` (Neon Green - Success/Action), `#f6c453` (Warm Yellow - Labels/Warnings).
- **Typography:**
  - **Headings:** Space Grotesk (Bold, geometric).
  - **Body:** Inter (Clean, readable).
- **Vibe:** Mission Dashboard. No fluff, no "cute" icons. Sharp edges, high contrast.

---

## 3. Core Screens & Components

### A. "Today" Screen (Home)
The operational hub. Everything needed for the current 24-hour cycle.

#### Top Bar
- **Date Picker:** Centered, defaults to current date.
- **War Score Badge:** A circular or shield-shaped badge (0–3) indicating completed War Tasks.
- **Streak Indicator:** "Day X of current streak" in small, muted text.

#### War Tasks Section
- **Structure:** Three distinct rows (The "Rule of 3").
- **Inputs:** Text fields for task titles.
- **Suggestions:** A "Target" icon next to the input opens a categorized dropdown (Study, Money, Skill, Body, Mind).
- **Execution:** 
  - **Checkbox:** Large, neon green border when checked.
  - **Timer Icon:** Opens the Pomodoro panel specifically for that task.

#### Pomodoro / Timer Panel
- **Behavior:** Slide-up (mobile) or Side-panel (desktop).
- **Presets:** 25:00, 45:00, and a custom input.
- **Controls:** Start, Pause, Reset.
- **Completion:** Triggers a sharp notification sound and a "Mark Task as Done" CTA.

#### Command / Battle / Recovery Blocks
- **Command Block (Morning):** Focuses on the "Launch".
  - Items: Wake on time, No phone (X mins), Morning ritual.
- **Battle Block (Deep Work):** Focuses on "Volume".
  - Visual: Progress bar showing completed vs. target Pomodoro sessions.
- **Recovery Block (Night):** Focuses on "Reset".
  - Items: Movement/Workout, Shutdown routine, Sleep prep.

#### Reflection Strip (Bottom)
- **Enemy Note:** "Enemy move I fought today..." (Text area).
- **Victory Toggle:** Segmented control: `[ Enemy-Self Won | War-Self Won ]`.

---

### B. Week View Screen
- **Layout:** 7-day grid (Mon-Sun).
- **Visuals:** Each day shows a mini "War Score" (3 dots) and a "Block Master" icon if all 3 blocks were cleared.
- **Stats:** Top section displays "Current Streak" and "All-Time Best Streak".
- **Interaction:** Click a day to view/edit (past days are read-only).

---

### C. Rules Screen (No-Negotiation Rules)
- **Concept:** The baseline "Laws" of the user's life.
- **Cards:** Sleep, Phone, Body, Work/Study.
- **Function:** Simple text descriptions with an "Active" toggle. These serve as reminders on the Today screen.

---

### D. Settings / Profile
- **Profile:** Basic info and Timezone (critical for day resets).
- **Preferences:** Notification times for Morning/Evening reminders.
- **Data:** Export (JSON/CSV) and "Nuclear Option" (Clear all data).

---

## 4. Data Model (NoSQL / Firestore)

### `users` (Collection)
- `uid`: string (PK)
- `email`: string
- `displayName`: string
- `createdAt`: timestamp
- `settings`: { morningReminder: string, eveningReminder: string, pomodoroDefault: number }

### `rules` (Sub-collection under user)
- `type`: "sleep" | "phone" | "body" | "work"
- `text`: string
- `isActive`: boolean

### `days` (Sub-collection under user)
- `date`: string (YYYY-MM-DD - PK)
- `warTasks`: [
    { title: string, completed: boolean, category: string },
    { title: string, completed: boolean, category: string },
    { title: string, completed: boolean, category: string }
  ]
- `commandBlock`: { wakeDone: bool, phoneDone: bool, ritualDone: bool }
- `battleBlock`: { sessionsCompleted: number, sessionsTarget: number }
- `recoveryBlock`: { movementDone: bool, shutdownDone: bool, sleepPrepDone: bool }
- `enemyNote`: string
- `winner`: "enemy" | "war"
- `updatedAt`: timestamp

---

## 5. Pre-Made War Task Suggestions
- **Study:** "2 pomodoro deep research", "45m language practice".
- **Money:** "30m client outreach", "Review P&L statement".
- **Skill:** "45m copywriting practice", "Code 1 feature".
- **Body:** "20m HIIT session", "Mobility routine".
- **Mind:** "10m meditation", "Journaling session".

---

## 6. Recommended Tech Stack
- **Frontend:** React (Vite) or Next.js.
- **Styling:** Tailwind CSS (Utility-first for the tactical UI).
- **Animations:** Motion (framer-motion) for panel transitions and glow effects.
- **Backend:** Firebase (Auth + Firestore) for real-time sync and low latency.
- **State Management:** Zustand or React Context (Simple, performant).

---

## 7. Component Tree (React)
- `App`
  - `AuthProvider`
  - `Layout` (Navigation + Header)
    - `TodayView`
      - `WarScoreHeader`
      - `WarTaskList`
        - `WarTaskItem`
          - `SuggestionDropdown`
      - `TimerPanel` (Portal)
      - `RoutineBlocks`
        - `RoutineCard` (Command/Battle/Recovery)
      - `ReflectionStrip`
    - `WeekView`
      - `StatsHeader`
      - `DayGrid`
    - `RulesView`
      - `RuleCard`
    - `SettingsView`

---

## 8. Edge Cases & Considerations
1. **No Tasks Set:** If a user opens the app mid-day without tasks, show a "Mission Briefing Required" state.
2. **Offline Usage:** Use Firestore persistence or LocalStorage to allow ticking tasks while at the gym/commuting.
3. **Timer Persistence:** The timer should run in a Web Worker or use a timestamp-based calculation so it doesn't reset if the tab is throttled.
4. **Day Reset:** Logic must handle users who stay up past midnight (The "Day" should reset at a user-defined "Wake Time" rather than 00:00).
