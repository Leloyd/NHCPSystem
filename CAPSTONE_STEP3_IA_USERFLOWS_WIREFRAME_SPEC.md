# Step 3: Information Architecture, User Flows, and Wireframe Specification

## Project
Design and Development of a WebXR-Enabled Digital Heritage Experience Platform for the Nagcarlan Underground Cemetery

## Version
- Version: 1.0
- Date: March 2026
- Depends on:
  - `CAPSTONE_MVP_SCOPE_DOCUMENT.md`
  - `CAPSTONE_STEP2_PERSONAS_ACCESSIBILITY_REQUIREMENTS.md`

## 1) Purpose
This document translates the approved MVP scope and personas into:
1. A clear information architecture (IA)
2. Priority user flows for implementation and testing
3. Low-fidelity wireframe specifications (desktop + mobile)

It serves as the design handoff for Step 4 development.

## 2) IA Principles (MVP)
- Content-first, low-cognitive-load navigation
- Mobile-first layout and progressive enhancement
- Accessibility by default (keyboard paths, readable typography, clear landmarks)
- Consistent global header/footer across modules
- WebXR as optional enhancement, never the only access path

## 3) Sitemap / Information Architecture

## 3.1 Top-Level Navigation
1. Home
2. Digital Exhibits
3. Accessibility
4. Interactive
5. E-Participation
6. News & Community
7. Support

## 3.2 Page Tree (MVP)
- `/` Home / Landing
  - Intro highlights
  - Core information and orientation (visitor info, about the site, cemetery history, house rules)
  - Quick links to all modules
- `/digital-exhibits`
  - Gallery index
  - Virtual tour entry
  - WebXR/AR entry
  - Educational resources
- `/accessibility`
  - Accessibility options and guide
  - Content accessibility notes
- `/interactive`
  - Guided heritage trail
  - Quiz / activity
  - XR entry + non-XR fallback
- `/participation`
  - Visitor feedback form
  - Story submission form
  - Teacher corner
- `/news`
  - Events list
  - News/blog listing
  - Community highlights/social links
- `/support`
  - FAQ
  - Policies
  - Contact/helpdesk

## 3.3 Secondary Utility Navigation
- Language switch placeholder (EN | FIL)
- Accessibility quick controls:
  - High contrast toggle
  - Text size controls
- Skip-to-content link

## 4) Route and Module Mapping (Build Handoff)
| Module | Primary Route | Key Components |
|---|---|---|
| Home | `/` | Hero, highlights, core information blocks, module cards, CTA buttons |
| Digital Exhibits | `/digital-exhibits` | Gallery cards, virtual tour CTA, WebXR CTA |
| Accessibility | `/accessibility` | A11Y options panel, assistive guidance, standards notes |
| Interactive | `/interactive` | Trail steps, quiz UI, XR launch + fallback |
| E-Participation | `/participation` | Feedback form, story form, teacher resources |
| News & Community | `/news` | Event cards, news cards, community metrics |
| Support | `/support` | FAQ accordion, policy links, contact form |

## 5) Priority User Flows (MVP)

## 5.1 Flow F1: Student Learning Path
**Persona:** P1 Student Explorer
1. Land on Home
2. Select Digital Exhibits
3. Open Interactive > Guided Trail
4. Enter WebXR scene or fallback
5. Complete quiz
6. View score/feedback and suggested next page

**Success Criteria:**
- Completed in <= 15 minutes
- No dead-end navigation
- Quiz completion state visible

## 5.2 Flow F2: Accessible Visit Path
**Persona:** P4/P5 Accessibility personas
1. Land on Home
2. Use skip-to-content
3. Open Accessibility page
4. Enable high contrast / adjust text size
5. Navigate to media with transcript/captions
6. Submit feedback form

**Success Criteria:**
- Entire flow keyboard-operable
- Media has equivalent textual access
- Form errors/success are clearly communicated

## 5.3 Flow F3: Teacher Resource Path
**Persona:** P2 Teacher Facilitator
1. Open Home
2. Go to Digital Exhibits > Educational Resources
3. Go to Participation > Teacher Corner
4. Access resource item / activity guide

**Success Criteria:**
- Key resource found in <= 5 minutes
- Links and labels are clear and consistent

## 5.4 Flow F4: Community Contribution Path
**Persona:** P6 Community Contributor
1. Open Participation
2. Read contribution guidance
3. Fill story submission form
4. Submit successfully
5. Receive confirmation and next steps

**Success Criteria:**
- Form can be completed in <= 5 minutes
- Validation and consent are clear

## 6) Wireframe Specification (Low-Fidelity)

## 6.1 Global Layout Pattern (All Pages)
- Header:
  - Logo + site title
  - Main nav links
  - Accessibility quick controls
  - Mobile menu button
- Main content:
  - Page title + intro
  - Content blocks/cards/forms depending on module
- Footer:
  - Quick links
  - Contact summary
  - Visiting hours
  - Policy links

## 6.2 Home Wireframe
### Desktop
- Hero band: title + subtitle + 2 CTAs
- Highlights row: 3 cards (history, virtual tour, events)
- Module grid: 6–8 cards linking to major modules
- Community/news teaser section

### Mobile
- Stacked hero text + CTA buttons
- Single-column highlights
- Single-column module cards

## 6.3 Home-Embedded Core Information Wireframe
### Desktop
- Sequential content blocks below hero (visitor info/about/history/rules)
- Optional anchor links for quick jump within Home page

### Mobile
- Stacked content cards/sections with clear headings
- Optional compact anchor menu for faster navigation

## 6.4 Digital Exhibits Wireframe
### Desktop
- Filter/search row (placeholder-ready)
- 2–3 column exhibit cards
- Featured virtual tour banner
- WebXR launch tile with fallback note

### Mobile
- Search/filter collapsed controls
- Single-column exhibit cards
- Virtual tour and XR CTA stacked

## 6.5 Accessibility Wireframe
### Desktop
- A11Y controls panel at top
- Accessibility guide cards (visual/hearing/mobility/cognitive)
- Help/contact block

### Mobile
- Controls as horizontal compact row
- Stacked guide cards

## 6.6 Interactive Wireframe
### Desktop
- Guided trail stepper component
- Main activity pane
- Quiz card + score panel
- XR/fallback launcher block

### Mobile
- Vertical stepper
- Full-width activity/quiz blocks

## 6.7 Participation Wireframe
### Desktop
- Two-column layout:
  - Left: feedback form
  - Right: story submission + teacher corner quick links

### Mobile
- Feedback and story forms in accordion/stack sequence

## 6.8 News & Community Wireframe
### Desktop
- Featured event banner
- News card grid
- Community stats strip

### Mobile
- Featured banner
- Single-column cards
- Stats as stacked pills/cards

## 6.9 Support Wireframe
### Desktop + Mobile
- FAQ accordion
- Policy link list
- Contact/helpdesk form

## 7) Component Inventory (for Dev Reuse)
- `HeaderNav`
- `MobileMenu`
- `A11yControlsBar`
- `SectionHero`
- `ContentCard`
- `FeatureBanner`
- `TimelineBlock`
- `QuizCard`
- `FormField` + `FormError`
- `SuccessNotice`
- `Footer`

## 8) Accessibility-by-Design Requirements in Wireframes
- Landmark order: header -> main -> footer
- Minimum touch target-friendly control sizing for mobile
- Strong heading hierarchy (`h1` to `h3`)
- Focus order follows visual order
- Form labels always visible (no placeholder-only labels)
- Avoid information conveyed by color only

## 9) Analytics Event Points (MVP)
- `nav_click` (module destination)
- `a11y_toggle` (contrast/text size)
- `xr_launch_attempt` (supported vs fallback)
- `quiz_start` / `quiz_complete`
- `feedback_submit`
- `story_submit`

## 10) Acceptance Checklist for Step 3 Completion
Step 3 is complete when:
1. Sitemap/routes are approved and mapped to MVP modules.
2. Priority flows F1–F4 are documented with measurable success criteria.
3. Wireframe specs exist for desktop and mobile per major module.
4. Accessibility-by-design rules are embedded in layout/component guidance.
5. Reusable component inventory is ready for Step 4 implementation.

## 11) Step 4 Implementation Starter Sequence
1. Build global layout shell (`HeaderNav`, `MobileMenu`, `Footer`)
2. Implement Home route with embedded core information sections
3. Implement Digital Exhibits + Accessibility routes
4. Implement Interactive (trail + quiz scaffold)
5. Implement Participation + News + Support routes
6. Integrate analytics event hooks and test
