# URAI V1 - Full Technical Specification

## 1. Overview & Core Principles

*   **Application Goal:** A local-first, safety-oriented mobile application for children that uses narrative adventure modules to teach core emotional skills through constrained creative interactions.
*   **Core Principles:**
    *   **Local-First:** No user data is sent to a server. All processing and storage happens on the device. No cloud accounts are required.
    *   **Safety & Privacy:** The app collects no analytics or telemetry. It does not access device sensors or data outside of its sandbox. Voice input is processed in real-time and immediately discarded.
    *   **Predictability:** The user experience is based on scripted, pre-defined content. There is no generative AI or unpredictable algorithmic behavior.
    *   **Ethical Design:** The app is designed to reduce reliance over time. It avoids manipulative patterns, dopamine loops, and judgmental feedback.

---

## 2. Architecture

*   **Platform:** Flutter (iOS & Android).
*   **Dependencies:**
    *   `flutter_secure_storage`: For encrypted on-device storage.
    *   `flutter_tts`: For text-to-speech narration from the Companion.
    *   `mic_stream` (or similar): For real-time microphone input for the Sound Tool visualization.
*   **Modules:** The application will be architected in distinct, decoupled modules:
    *   `AdventureEngine`: Manages the state and progression of the narrative modules.
    *   `CreativeTools`: Contains the constrained Drawing, Sound, and Rhythm widgets.
    *   `ParentDashboard`: A separate screen for parental controls and viewing the Story Box.
    *   `LocalStore`: A service class that handles all data persistence using `flutter_secure_storage`.

---

## 3. Data Model

All data will be stored as a single serialized JSON object in encrypted storage. The key will be `urai_v1_data`.

```json
{
  "schemaVersion": "1.0",
  "sessionSettings": {
    "maxDailyMinutes": 30,
    "quietTimeStartHour": 20,
    "quietTimeEndHour": 8
  },
  "storyBox": [
    {
      "id": "uuid-1",
      "module": "WhisperingWoods",
      "type": "drawing",
      "artifact": "<SVG_PATH_DATA_STRING>",
      "name": "Silly Whisper-Wind"
    },
    {
      "id": "uuid-2",
      "module": "GrumpyBear",
      "type": "sound_shape",
      "artifact": "<SVG_PATH_DATA_STRING>"
    },
    {
      "id": "uuid-3",
      "module": "LonelyFirefly",
      "type": "rhythm_star"
    }
  ],
  "adventureLog": [
    {
      "moduleId": "WhisperingWoods",
      "completedAt": "YYYY-MM-DDTHH:MM:SSZ"
    }
  ]
}
```

---

## 4. Feature Implementation Details

### 4.1. Adventure Modules

*   **Content Source:** The narrative, prompts, and logic for each module will be defined in a structured format (e.g., JSON or Dart classes) within the app bundle. See `V1_ADVENTURE_MODULES.md` for content.
*   **State Management:** The `AdventureEngine` will manage the current `moduleId` and `stepIndex` for the active adventure. User interactions will advance the state.

### 4.2. Creative Toolkit

*   **Drawing Widget:** See `V1_CREATIVE_TOOLKIT.md`. It will capture touch input, convert it to a path, and pass the path data back to the `AdventureEngine`. It will render a simple, single-color line.
*   **Sound Widget:** See `V1_CREATIVE_TOOLKIT.md`. It will use a microphone stream to generate a real-time path visualization. It will NOT record audio. The successful path data is saved.
*   **Rhythm Widget:** See `V1_CREATIVE_TOOLKIT.md`. A simple `GestureDetector` widget will handle taps. The logic for rhythm matching will be forgiving, with a wide success margin (e.g., +/- 200ms).

### 4.3. Parent Dashboard

*   **Access:** The dashboard will be accessible via a simple, text-based button (e.g., "Parental Controls") held for 3 seconds to prevent accidental child access.
*   **UI:** The dashboard will display the `adventureLog` and `storyBox` data in a simple, scrollable view, per the `V1_PARENT_DASHBOARD.md` specification.
*   **Controls:** The Session Limiter and Quiet Time settings will directly update the `sessionSettings` object in the JSON data model.

### 4.4. Session Management

*   A global timer will check `maxDailyMinutes` against a locally persisted session duration counter.
*   At app startup, a check against the `quietTime` settings will determine if the app should be accessible.

---

## 5. Build & Deployment

*   **Build Flags:** The production build configuration will have flags to permanently disable any potential for network requests or analytics libraries (e.g., `const bool kEnableAnalytics = false;`).
*   **Permissions:** The `AndroidManifest.xml` and `Info.plist` will only request the `RECORD_AUDIO` permission. The app will clearly explain why this is needed (for the Grumpy Bear module) and reassure the user that nothing is ever recorded.
*   **Store Listing:** The app store description will prominently feature the "No Ads, No Subscriptions, No Server" policy and link to a web page containing the "No Manipulation Guarantee."
