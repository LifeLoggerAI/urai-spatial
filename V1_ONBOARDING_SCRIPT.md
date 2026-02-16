
# V1 Onboarding Script

**Goal:** To establish trust, clarify the app's purpose, and set expectations in a calm, non-intrusive manner. This flow is for the parent setting up the app for the first time.

**Tone:** Reassuring, respectful, clear.

--- 

### **Screen 1: Welcome**

*   **(UI):** A single, beautiful illustration of a quiet, sleeping Seedling. Minimal text.
*   **Header:** `Welcome to the Garden.`
*   **Body:** `A quiet place for your child to explore feelings through creativity.`
*   **Button:** `[ Begin ]`

### **Screen 2: The No Manipulation Guarantee**

*   **(UI):** A clean, text-focused screen. No illustrations.
*   **Header:** `Our Promise to You.`
*   **Body:** (The full text of the "No Manipulation Guarantee" is displayed here, non-scrollable and fully visible.)
    *   *This tool does not predict your future...*
    *   *It is designed to speak less over time — not more...*
*   **Button:** `[ I Understand ]`

### **Screen 3: How It Works**

*   **(UI):** Simple, animated icons illustrating the core loop.
*   **Header:** `How the Garden Grows`
*   **Point 1 (Icon: Seedling):** `Your child becomes the Caretaker, helping a small Seedling grow.`
*   **Point 2 (Icon: Feeling Canvas):** `They explore feelings through simple, creative story quests.`
*   **Point 3 (Icon: Fading Moon):** `The goal is autonomy. Over time, the app will gently fade into the background.`
*   **Button:** `[ Continue ]`

### **Screen 4: Setting the Pace**

*   **(UI):** The first interactive controls. The Session Pacing UI from the Parent Dashboard is presented here.
*   **Header:** `You Set the Pace.`
*   **Body:** `You are in control of how often the garden is tended.`
*   **(Controls):**
    *   Slider for `Max Session Length` (Default: 10 mins).
    *   Dropdown for `Sessions Per Day` (Default: 1).
*   **Button:** `[ Create the Garden ]`

### **Screen 5: Final Confirmation**

*   **(UI):** A simple confirmation screen.
*   **Header:** `The Garden is Ready.`
*   **Body:** `You can change the pace at any time from the Parent's Toolshed.`
*   **Button:** `[ Enter the Garden ]`

--- 

**Onboarding Complete.** The app then transitions to the main `garden_screen.dart` for the very first quest, "The Worry Scribble." The parent then hands the device to the child. The entire onboarding process should take less than 60 seconds. It is designed to be intentional, respectful, and to build a foundation of trust before the child even meets the Seedling.
