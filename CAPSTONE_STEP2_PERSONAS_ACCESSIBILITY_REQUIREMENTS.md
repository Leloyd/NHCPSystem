# Step 2: Personas and Accessibility Requirements Document

## Project
Design and Development of a WebXR-Enabled Digital Heritage Experience Platform for the Nagcarlan Underground Cemetery

## Version
- Version: 1.0
- Date: March 2026
- Depends on: `CAPSTONE_MVP_SCOPE_DOCUMENT.md`

## 1) Purpose
This document defines the prioritized user personas and accessibility requirements that will guide design, development, and evaluation of the MVP platform.

## 2) Persona Set (MVP)

### Persona P1: Student Explorer (Primary)
- Profile: SHS/college learner using mobile data and mid-range smartphone
- Goals:
  - Understand cemetery history in engaging way
  - Complete interactive learning activity/quiz
- Constraints:
  - Intermittent connectivity
  - Limited device performance
- Success criteria:
  - Can complete one guided trail and one quiz in under 15 minutes

### Persona P2: Teacher Facilitator (Primary)
- Profile: History/social science/ICT teacher using laptop or phone
- Goals:
  - Access curriculum-aligned content quickly
  - Use resources for classroom or blended learning
- Constraints:
  - Limited preparation time
  - Needs printable or shareable materials
- Success criteria:
  - Can find and use educational resources in under 5 minutes

### Persona P3: Tourist/Public Visitor (Primary)
- Profile: General public user, mixed digital literacy
- Goals:
  - Get site orientation, visitor info, and highlights
  - Experience virtual tour/WebXR preview
- Constraints:
  - May not be familiar with XR controls
- Success criteria:
  - Can navigate core sections without onboarding support

### Persona P4: PWD User - Low Vision / Blind (Primary Accessibility Persona)
- Profile: Screen reader and/or zoom user
- Goals:
  - Access equivalent informational content
  - Navigate independently through core pages and forms
- Constraints:
  - Visual-heavy content can block understanding
- Success criteria:
  - Can complete navigation and form tasks using keyboard + assistive tech

### Persona P5: PWD User - Deaf / Hard of Hearing (Primary Accessibility Persona)
- Profile: Relies on text captions/transcripts/visual cues
- Goals:
  - Consume multimedia content with equivalent access
- Constraints:
  - Audio-only guidance is inaccessible
- Success criteria:
  - All essential audio/video content has caption or transcript equivalent

### Persona P6: Community Contributor (Secondary)
- Profile: Local resident/cultural bearer, often mobile-first
- Goals:
  - Submit story/memory/feedback
- Constraints:
  - May need simple language and short forms
- Success criteria:
  - Can submit contribution in under 5 minutes with clear confirmation

## 3) Priority User Journeys (MVP)

### Journey J1: Learn and Explore
1. Open Home page
2. Go to Digital Exhibits
3. Open guided trail/WebXR scene or fallback
4. Complete one quiz
5. View result/feedback

### Journey J2: Accessible Visit
1. Open Accessibility page
2. Enable high contrast / larger text
3. Navigate using keyboard
4. Access transcript/caption-enabled media
5. Submit feedback form

### Journey J3: Contribute to Community
1. Open E-Participation
2. Read contribution guidelines
3. Submit story
4. Receive acknowledgement message

## 4) Accessibility Requirements (MVP)

## 4.1 Must-Have Functional Requirements (FR)
- `FR-A11Y-01`: Provide keyboard-accessible navigation for all primary pages and forms.
- `FR-A11Y-02`: Provide visible focus indicators on interactive elements.
- `FR-A11Y-03`: Provide high-contrast display mode toggle.
- `FR-A11Y-04`: Provide scalable text/readable typography strategy.
- `FR-A11Y-05`: Provide descriptive alt text for all key non-decorative images.
- `FR-A11Y-06`: Provide captions/transcripts (or placeholders in MVP) for multimedia.
- `FR-A11Y-07`: Provide clear labels, helper text, and error messaging for forms.
- `FR-A11Y-08`: Provide skip-to-content or equivalent fast navigation.
- `FR-A11Y-09`: For WebXR scenes, provide equivalent 2D fallback content and hotspot descriptions.

## 4.2 Must-Have Non-Functional Requirements (NFR)
- `NFR-A11Y-01`: Core tasks must remain usable on low- to mid-range mobile devices.
- `NFR-A11Y-02`: Page content should remain understandable at 200% zoom.
- `NFR-A11Y-03`: UI should avoid color-only meaning for critical information.
- `NFR-A11Y-04`: Loading states and errors should be announced clearly (textual status visible).

## 4.3 Recommended WCAG Alignment Targets
- Perceivable: text alternatives, captions, adaptable text size, contrast
- Operable: keyboard access, focus visibility, predictable navigation
- Understandable: clear labels, readable language, consistent interaction patterns
- Robust: compatibility-conscious markup and semantic structure

## 5) Device and Connectivity Requirements
- Mobile-first layout for common Android phone resolutions
- Works on desktop Chrome/Edge + mobile Chrome/Samsung Internet (MVP target)
- XR-capable browser path + non-XR fallback path
- Content-first rendering for low bandwidth (prioritize text and compressed assets)

## 6) Content Accessibility Requirements
- Bilingual-ready content structure (English-first + Filipino placeholders)
- Plain-language summaries for key historical sections
- Media entries must include metadata:
  - Title
  - Description
  - Date/source (if available)
  - Accessibility notes (caption/transcript/alt status)

## 7) Form and Participation Requirements
- Feedback form fields:
  - Visit mode (physical/virtual)
  - Usability/accessibility rating
  - Open comment
- Story submission fields:
  - Contributor name/pseudonym
  - Story text
  - Consent acknowledgement
- All forms must provide:
  - Required field markers
  - Inline validation messages
  - Clear success/failure confirmation

## 8) WebXR-Specific Inclusion Requirements
- XR scene must include 3–5 hotspots with text equivalents
- Hotspots should have concise, culturally sensitive descriptions
- If XR unsupported, automatically offer a fallback experience link
- Guided mode should reduce control complexity for first-time users

## 9) Evaluation Mapping (Step 2 Draft)
- Usability: SUS score + task completion time
- Accessibility perception: custom inclusion/accessibility Likert items
- Learning/cultural appreciation: pre/post short quiz + reflection item
- Presence/engagement: short self-report items after XR/fallback activity

## 10) Acceptance Checklist for Step 2 Completion
Step 2 is considered complete when:
1. Persona set is approved by team/adviser.
2. Priority journeys are mapped to planned modules.
3. Accessibility requirements are tagged as must-have in backlog.
4. WebXR fallback requirements are explicitly included.
5. Evaluation mapping is ready for instrument drafting.

## 11) Implementation Handoff Notes (for Step 3 and Step 4)
- Step 3 (IA/Flows/Wireframes) must explicitly reference persona journeys J1–J3.
- Step 4 (Build) must tag stories with IDs `FR-A11Y-*` and `NFR-A11Y-*`.
- Any requirement not possible in MVP must be labeled `Phase-2` per governance rule.
