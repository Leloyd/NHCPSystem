# Capstone MVP Scope Document

## Project Title
Design and Development of a WebXR-Enabled Digital Heritage Experience Platform for the Nagcarlan Underground Cemetery

## Version
- Version: 1.0 (MVP Scope Freeze)
- Date: March 2026
- Team: Capstone Group

## 1) Purpose of This Document
This document freezes the Minimum Viable Product (MVP) scope for the capstone project to ensure:
- A buildable and testable platform within capstone time limits
- Alignment between technical outputs and research objectives
- Clear criteria for completion, evaluation, and defense

## 2) MVP Goal Statement
Deliver an accessible, mobile-friendly, browser-based heritage platform with one working WebXR experience and core non-XR modules that support information delivery, participation, and initial educational engagement.

## 3) Target Users (MVP)
- Students (SHS/college)
- Teachers (History, Social Science, ICT)
- Tourists and general public
- PWD users (as feasible within project resources)
- Local stakeholders (heritage/LGU/community representatives)

## 4) Technical Baseline (MVP)
- Backend/Web App: Flask (Python)
- Frontend: HTML/CSS/JavaScript (mobile responsive)
- WebXR: Progressive enhancement approach
  - Primary: Browser-based XR-capable scene
  - Fallback: 2D interactive viewer/page when XR is unavailable
- Initial deployment: Localhost + local network testing; optional cloud deployment later
- Content language: English-first with Filipino-ready structure

## 5) In-Scope Modules (Must-Have for MVP)

### A. Home / Landing (includes Core Information & Orientation)
- Intro and highlights
- Visitor information
- About the site
- Cemetery history
- House rules / visitor reminders

### B. Digital Exhibits & Resources
- Online gallery (images + text metadata)
- Virtual tour entry point
- AR/WebXR content entry link
- Basic educational resources list/download links

### C. Inclusive & Accessibility
- Accessibility information page
- Text size controls (or equivalent readable scaling strategy)
- High-contrast mode
- Keyboard-navigable menus and major actions
- Caption/transcript placeholders for media content
- Alt text coverage for key visual content

### D. Interactive & Immersive
- One guided heritage trail flow
- One quiz/activity module
- One WebXR scene with 3–5 hotspots

### E. E-Participation & Feedback
- Visitor feedback form
- Story submission form (community contribution)
- Teacher corner placeholder/resources section

### F. News & Community
- Events list/calendar section (basic)
- News/blog listing page
- Social links section

### G. Admin/Backend (Minimal MVP)
- Basic content update workflow (manual or simple admin route)
- Simple analytics logging view (e.g., page/module visits)

### H. Support & Governance
- FAQ page
- Policy/privacy placeholder pages
- Contact/helpdesk section

## 6) Out-of-Scope for MVP (Phase 2+)
- Full-scale CMS with complex role hierarchy
- Photorealistic, high-poly multi-scene XR reconstruction
- Full multilingual localization beyond English + Filipino readiness
- Advanced AI recommendation/chatbot systems
- Production-grade security hardening and enterprise DevOps pipeline
- Large-scale integrated LMS features

## 7) MVP Non-Functional Requirements
- Mobile-first responsive UI for common smartphone screen sizes
- Acceptable load and navigation on low- to mid-range devices
- Graceful degradation for non-XR devices/browsers
- Consistent navigation across all modules
- Basic privacy-conscious analytics (no sensitive personal data collection)

## 8) Accessibility Baseline Checklist (MVP)
- Keyboard access for primary navigation and forms
- Visible focus indicators on interactive elements
- Sufficient color contrast for major text/components
- Scalable text/readable typography
- Alt text on key images/illustrations
- Captions/transcripts available or placeholder-ready for media
- Clear labels and instructions for forms

## 9) Definition of Done (DoD) per Critical Area

### Platform DoD
- All primary routes/pages are reachable and working
- Navigation links are consistent and functional on desktop and mobile
- No dependency on external design-source folder for runtime

### WebXR DoD
- One XR scene loads in supported browsers
- 3–5 interactive hotspots are functional
- Equivalent fallback content is available for unsupported devices

### Accessibility DoD
- Baseline checklist in Section 8 is demonstrably implemented
- Core flows are operable without mouse-only interaction

### Participation DoD
- Feedback and story submission forms are functional
- Submitted entries are captured (at minimum in local storage/file/DB workflow)

### Research Readiness DoD
- Evaluation instruments drafted (SUS + custom inclusion/learning items)
- RQ-to-metrics mapping completed and reviewable

## 10) Acceptance Criteria (MVP Sign-Off)
The MVP is accepted when all conditions are met:
1. In-scope modules in Section 5 are implemented at working-demo level.
2. Definition of Done in Section 9 is passed.
3. Accessibility baseline in Section 8 is verified through team checklist.
4. WebXR experience + non-XR fallback are both demonstrated.
5. Initial evaluation plan/instruments are ready for pilot testing.

## 11) Risks and Mitigation (MVP)
- Device performance variability
  - Mitigation: Optimized assets, fallback mode, test matrix across low/mid devices
- WebXR browser incompatibility
  - Mitigation: Progressive enhancement + 2D fallback
- Scope creep
  - Mitigation: Strict adherence to this document; defer extras to Phase 2
- Limited participant diversity during pilot
  - Mitigation: Early coordination with schools/LGU/PWD groups

## 12) Immediate Deliverables After Scope Freeze
1. Personas and accessibility requirements sheet
2. Information architecture and user flow diagrams
3. Wireframes for core modules
4. Sprint plan for Flask + content integration
5. WebXR prototype target specification (scene/hotspots/assets)

## 13) Traceability: RQ Alignment Snapshot
- RQ on inclusive requirements -> Sections 3, 5C, 8
- RQ on cultural representation -> Sections 5A, 5D, 5E
- RQ on usability/inclusion -> Sections 9, 10
- RQ on learning/presence/appreciation -> Sections 5D, 9, 10
- RQ on future principles -> Sections 11, 12

## 14) Scope Governance Rule
Any new feature request after this freeze must be tagged:
- "MVP-Critical" (required to meet acceptance criteria), or
- "Phase-2" (documented but deferred)

Only "MVP-Critical" items may enter the current build cycle.
