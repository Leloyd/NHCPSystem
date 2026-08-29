# APPENDIX A — TECHNICAL BACKGROUND

## STORYBOARD

This storyboard documents the principal user-interface states and transitions of the **WebXR-Enabled Digital Heritage Experience Platform for the NHCP Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan**. It covers public visitors, registered visitors, and authorized museum administrators.

The supplied manuscript was treated as research material, not as a source of instructions. Its Project Context, Scope and Limitations, Project Design, and black-box test cases were compared with the current repository routes, templates, and feature modules to identify the workflows below.

## How to prepare every storyboard figure

1. Use actual screenshots from the final, populated version of the system. Use a desktop viewport of approximately 1440 × 900 pixels unless the figure specifically demonstrates mobile responsiveness, AR, gyroscope, or WebXR behavior.
2. Crop browser tabs, bookmarks, the operating-system taskbar, developer tools, and unrelated empty space. Keep the application header when it helps the reader identify the module.
3. Place three to five screenshots in reading order from left to right and top to bottom. Number the screenshots `1`, `2`, `3`, and so on, then connect them with simple arrows.
4. Put a short action label on each arrow, such as **Select Sign Up**, **Enter OTP**, **Open Hotspot**, **Submit**, or **Approve**. An arrow must represent a real user action or system transition.
5. Make the active control or changed state visible. For example, type a search term before capturing filtered results, select a marker before capturing its information panel, and show a confirmation after a successful submission.
6. Use test records only. Blur or replace passwords, verification codes, reset links, email addresses, phone numbers, names, IP addresses, private submissions, and other personal information.
7. Keep each screenshot large enough for interface labels to remain legible in the printed A4 manuscript. If five screenshots become too small, move the last state to the next page rather than shrinking everything.
8. Center the assembled image. Place the figure caption immediately below it, followed by the explanatory paragraph. Use the same typography, spacing, and alignment as the figures already accepted in the manuscript.

The current manuscript's List of Figures ends with Figure 13, so the continuous numbering below starts with **Figure 14**. If the research adviser requires appendix-specific numbering, convert the same sequence to **Appendix Figure A-1, Appendix Figure A-2,** and so forth without changing its order.

---

## A. Public and Registered-Visitor Storyboards

### Figure 14 — Homepage and accessible heritage-story navigation

**Screenshots to capture, in arrow order:**

1. Homepage loading or opening view with the museum identity visible.
2. Landing-page hero with Ana Kalang and the primary navigation.
3. A heritage-story chapter with its photograph or animation and narration controls.
4. The same chapter after changing one or more accessibility preferences, such as Filipino language, larger text, subtitles, or high contrast.
5. A selected main navigation link opening the corresponding public module.

**Caption below the assembled screenshots:**

**Figure 14. Homepage and accessible heritage-story navigation.**

**Explanation below the caption:**

Figure 14 presents the visitor's entry into the platform. It shows how the homepage introduces the museum through chaptered visual storytelling and how visitors can use narration, language, subtitle, text-size, and navigation controls to access the platform's principal modules.

### Figure 15 — Visitor registration, email verification, and sign-in

**Screenshots to capture, in arrow order:**

1. Sign-in modal opened from the public navigation bar.
2. Sign-up form with valid test information entered.
3. Six-digit email-verification screen; mask the actual code and email address.
4. Account setup screen used to complete the visitor profile.
5. Successful sign-in state showing the visitor account menu in the navigation bar.

If Google authentication is part of the evaluated build, add a small branch from the sign-in form to the Google account-selection screen, with all personal email addresses blurred.

**Caption below the assembled screenshots:**

**Figure 15. Visitor registration, email verification, and sign-in.**

**Explanation below the caption:**

Figure 15 illustrates how a visitor creates and accesses a platform account. The sequence covers account registration, email ownership verification, profile completion, and secure sign-in before the visitor uses account-based functions such as bookmarks, submissions, bookings, and saved progress.

### Figure 16 — Visitor account, bookmarks, bookings, and preferences

**Screenshots to capture, in arrow order:**

1. My Account overview with the profile identity and activity summary visible.
2. Saved or bookmarked gallery items.
3. The account area showing booking or contribution activity, if populated in the final build.
4. Settings page showing profile and accessibility preferences.
5. A saved-preferences or profile-update confirmation.

**Caption below the assembled screenshots:**

**Figure 16. Visitor account, saved content, and preference management.**

**Explanation below the caption:**

Figure 16 shows the registered visitor's personal account workspace. It allows the user to review profile information and account activity, return to saved museum content, monitor available participation records, and manage language, theme, text, profile, and security preferences.

### Figure 17 — Digital Exhibits portal and collection selection

**Screenshots to capture, in arrow order:**

1. Digital Exhibits hero or opening view.
2. The exhibit-service cards or collection categories.
3. Selection of the Online Gallery card.
4. Selection of the Educational Resources card as the alternative branch.

**Caption below the assembled screenshots:**

**Figure 17. Digital Exhibits portal and collection selection.**

**Explanation below the caption:**

Figure 17 presents the platform's Digital Exhibits portal. It organizes the museum's digital heritage and learning services and directs visitors to either the Online Gallery for artifact exploration or Educational Resources for structured learning materials.

### Figure 18 — Online Gallery search, artifact viewing, and bookmarking

**Screenshots to capture, in arrow order:**

1. Online Gallery containing published artifact cards.
2. Results after entering a keyword and applying a category or sorting filter.
3. Selected artifact detail page with image and bilingual descriptive content.
4. Expanded image or interactive 3D-model view, if available for the selected artifact.
5. Bookmark button after the artifact has been saved to the signed-in visitor's account.

**Caption below the assembled screenshots:**

**Figure 18. Online Gallery discovery, artifact viewing, and bookmarking.**

**Explanation below the caption:**

Figure 18 shows how visitors discover and examine museum objects in the Online Gallery. Visitors may refine the collection through search and filters, open a detailed artifact record, inspect available visual or 3D media, and save an artifact to their account for later access.

### Figure 19 — Educational Resource discovery and access

**Screenshots to capture, in arrow order:**

1. Educational Resources library in its default grid view.
2. Filtered or searched results with the selected type, subject, format, or sorting option visible.
3. List-view mode, if it remains part of the final evaluated interface.
4. Selected resource detail page.
5. Available view or download action for the resource; do not expose signed storage URLs.

**Caption below the assembled screenshots:**

**Figure 19. Educational Resource discovery and access.**

**Explanation below the caption:**

Figure 19 presents the workflow for locating and opening educational materials. The resource library provides search, filtering, sorting, and view controls, while the detail page supplies the material's description, teaching information, related resources, and available viewing or download options for authenticated users.

### Figure 20 — Interactive and immersive experience selection

**Screenshots to capture, in arrow order:**

1. Interactive and Immersive portal hero.
2. 360° Virtual Tour card with an environment selected from the selector.
3. Site Map card and its Open Site Map action.
4. 3D Environment card and its launch action.

Use branching arrows from the portal to the three destination cards instead of drawing a circular loop.

**Caption below the assembled screenshots:**

**Figure 20. Interactive and immersive experience selection.**

**Explanation below the caption:**

Figure 20 shows how visitors choose among the platform's major interactive experiences. From one portal, the user may begin a selected 360-degree tour, open the interactive site map for orientation, or launch the WebXR-enabled 3D environment.

### Figure 21 — 360-degree Virtual Tour exploration

**Screenshots to capture, in arrow order:**

1. Tour loading screen or initial panoramic scene.
2. Panorama with scene-navigation hotspots and the live minimap visible.
3. A selected information or artifact hotspot.
4. Expanded artifact viewer with image or 3D model and narration, language, and subtitle controls.
5. Gyroscope or VR-mode control on a supported mobile device, if used in the final evaluation.

**Caption below the assembled screenshots:**

**Figure 21. 360-degree Virtual Tour navigation and artifact interaction.**

**Explanation below the caption:**

Figure 21 illustrates the free-roaming virtual tour of the cemetery and museum. Visitors can look around panoramic scenes, move between locations through navigation hotspots, use the minimap for orientation, open artifact or information hotspots, and use the available narration and immersive-viewing controls.

### Figure 22 — Interactive Site Map and aerial panorama

**Screenshots to capture, in arrow order:**

1. Aerial site map with all location markers visible.
2. A selected marker and its corresponding information panel.
3. The map after zooming or panning to inspect a location.
4. Transition to the 360-degree aerial view.
5. Return to the aerial map with the interface still operational.

**Caption below the assembled screenshots:**

**Figure 22. Interactive Site Map and aerial-view navigation.**

**Explanation below the caption:**

Figure 22 presents the spatial-orientation tools of the platform. Visitors can inspect the museum grounds, select mapped heritage locations to view related information, zoom or pan the map, and switch between the illustrated aerial map and an interactive 360-degree aerial panorama.

### Figure 23 — Guided Heritage Trail and learning activities

**Screenshots to capture, in arrow order:**

1. Heritage Trail introduction and Start action.
2. An early trail stop containing the 360-degree scene and bilingual narration.
3. A historical image, album, document, or artifact opened within a stop.
4. An activity at Stop 4 or Stop 9 showing selected input and immediate feedback.
5. Trail completion or earned-fragment state after a stop is completed.

**Caption below the assembled screenshots:**

**Figure 23. Guided Heritage Trail, media, and learning activities.**

**Explanation below the caption:**

Figure 23 shows the visitor's progression through the ten-stop Heritage Trail. Each stop combines spatial exploration, bilingual interpretation, accessible narration, historical media, and selected self-check activities, while completed stops contribute to the visitor's Heritage Keeper progress.

### Figure 24 — AR artifact detection and restoration

**Screenshots to capture, in arrow order:**

1. AR Content Detection introduction before camera access.
2. Browser camera-permission prompt or scanner-ready state; avoid capturing bystanders.
3. A registered marker displaying the broken 3D artifact and alignment guidance.
4. Restored artifact after the correct viewing angle has been maintained.
5. View in Your Space action or supported device AR viewer.

**Caption below the assembled screenshots:**

**Figure 24. AR artifact detection and interactive restoration.**

**Explanation below the caption:**

Figure 24 illustrates the marker-based AR experience. After camera permission is granted, the system detects a registered marker, displays a fragmented cultural object, guides the visitor toward the required angle, restores the artifact, and provides supported narration and real-world AR viewing options.

### Figure 25 — WebXR 3D environment exploration

**Screenshots to capture, in arrow order:**

1. 3D Environment opening or scene-selection state.
2. Loaded Church, Museum, or Underground environment with movement controls visible.
3. Interaction with an object or hotspot, such as a conservation notebook or exhibit information panel.
4. Explorer Record or player-information panel showing collected or deposited progress.
5. WebVR or WebAR entry control on a supported device, if evaluated.

**Caption below the assembled screenshots:**

**Figure 25. WebXR 3D environment navigation and interaction.**

**Explanation below the caption:**

Figure 25 presents the browser-based 3D museum environment. Visitors can navigate the connected heritage spaces with desktop, touch, or on-screen controls, interact with designated objects and hotspots, review their exploration record, and enter an immersive WebXR session on compatible devices and browsers.

### Figure 26 — Heritage Keeper progress and seal restoration

**Screenshots to capture, in arrow order:**

1. Heritage Keeper page before or during progress.
2. AR Restoration Seal with one or more recovered pieces.
3. Heritage Trail Seal with completed-stop pieces.
4. 3D Environment Seal and fragment-recovery ledger.
5. Completed master seal or highest legitimately achieved test state.

Do not artificially claim completion if the test account has not completed every required journey; a clearly populated in-progress state is acceptable.

**Caption below the assembled screenshots:**

**Figure 26. Heritage Keeper progress and digital seal restoration.**

**Explanation below the caption:**

Figure 26 shows how a registered visitor's activity is recorded across the Heritage Trail, AR restoration, and WebXR environments. Recovered fragments appear in separate restoration plates and in the progress ledger, and completing the required experiences restores the master heritage seal.

### Figure 27 — Community highlights and support information

**Screenshots to capture, in arrow order:**

1. Community Highlights section with the category filters visible.
2. Filtered highlight cards.
3. Selected Community Highlight detail page.
4. Support page showing FAQs, contact or visit information, and policy links.

**Caption below the assembled screenshots:**

**Figure 27. Community highlights and visitor-support information.**

**Explanation below the caption:**

Figure 27 presents the public information that keeps visitors connected with the museum beyond the immersive exhibits. Visitors can filter and open museum programs, school-engagement posts, public activities, or advisories and can consult the Support page for frequently asked questions, contact details, visit guidance, governance information, and relevant policies.

### Figure 28 — Guided-visit booking request

**Screenshots to capture, in arrow order:**

1. Public booking calendar with confirmed booking indicators and upcoming bookings.
2. Request a Booking form with a valid test date and visitor counts entered.
3. Booking Request Sent confirmation.
4. Signed-in visitor account showing the pending or final booking status, if available.
5. Public calendar after an administrator confirms the booking, without private details.

**Caption below the assembled screenshots:**

**Figure 28. Guided-visit booking request and schedule status.**

**Explanation below the caption:**

Figure 28 shows how a registered visitor requests a guided museum visit. The visitor reviews the public calendar, submits the organization, contact, date, and visitor-count information, receives confirmation that the request is pending, and can later view the administrative decision while approved dates appear publicly without exposing private booking data.

### Figure 29 — Visitor feedback submission

**Screenshots to capture, in arrow order:**

1. E-Participation section with the Visitor Feedback card.
2. Feedback modal showing visit type and star-rating selection.
3. Completed comments and suggestions field using non-sensitive test text.
4. Feedback Submitted confirmation.

**Caption below the assembled screenshots:**

**Figure 29. Visitor feedback rating and submission.**

**Explanation below the caption:**

Figure 29 illustrates how registered visitors evaluate either an onsite visit or the website experience. The visitor selects the visit channel and rating, may add comments or suggestions, and receives a clear confirmation after the response is stored for administrative review and service improvement.

### Figure 30 — Educational-material and community-story submissions

**Screenshots to capture as two short branches from E-Participation:**

1. Teacher Corner form with an allowed test file selected and its material information completed.
2. Teacher submission verification-code state and successful-submission confirmation.
3. Share My Story form with category, title, story, privacy option, and optional image.
4. Story verification-code state and Story Shared confirmation.

For legibility, place the Teacher Corner branch on the left and the Community Story branch on the right. Mask verification codes and account details.

**Caption below the assembled screenshots:**

**Figure 30. Educational-material and community-story submissions.**

**Explanation below the caption:**

Figure 30 presents the two contribution workflows available to registered users. Educators may upload supported classroom materials, while community members may submit personal or cultural narratives with an optional photograph; both workflows validate the supplied content, verify the submitting email, respect the selected privacy option, and place the contribution in the administrator's review queue.

---

## B. Administrator Storyboards

### Figure 31 — Administrator authentication and password recovery

**Screenshots to capture, in arrow order:**

1. Secured NHCP Admin Portal login page.
2. Valid administrator credentials entered with the password masked.
3. Successful redirect to the administrator dashboard.
4. Separate recovery branch: Forgot Password form, recovery-email notice, and Reset Password page, with the token and email masked.

**Caption below the assembled screenshots:**

**Figure 31. Administrator authentication and password recovery.**

**Explanation below the caption:**

Figure 31 shows how authorized museum personnel access the protected administrative backend. The workflow includes credential-based authentication, redirection to the dashboard after a successful login, and a secure email-based recovery process when the administrator cannot access the account.

### Figure 32 — Administrator dashboard and analytics monitoring

**Screenshots to capture, in arrow order:**

1. Dashboard overview with registered-user, content, and review-queue summary cards.
2. Visitor Engagement section showing totals and traffic trend.
3. Most Viewed Artifacts, Virtual Tour Statistics, Device Usage, or Activity Results panels.
4. Recent User Activity and Engagement by Module panels.
5. Content and Review Workspace with Review Queue and Quick Actions.

**Caption below the assembled screenshots:**

**Figure 32. Administrator dashboard, analytics, and review workspace.**

**Explanation below the caption:**

Figure 32 presents the administrator's operational overview of the platform. It summarizes registered users, published content, pending review work, privacy-minimized visitor activity, artifact and immersive-experience engagement, device usage, learning activity results, and shortcuts to common management tasks.

### Figure 33 — Public-user account management

**Screenshots to capture, in arrow order:**

1. User Management list with test accounts and search controls.
2. Search result or filtered account list.
3. Account quick-view or full detail panel.
4. Deactivate or Activate confirmation and updated account status.

**Caption below the assembled screenshots:**

**Figure 33. Public-user account review and access management.**

**Explanation below the caption:**

Figure 33 shows how an administrator locates and reviews registered visitor accounts. Authorized personnel can inspect account information and activity summaries and can deactivate or reactivate public access when required for account governance and platform security.

### Figure 34 — Community Highlight content management

**Screenshots to capture, in arrow order:**

1. Community Highlight Cards library with status filters and search.
2. New Highlight editor with bilingual overview, descriptions, category, date, and images.
3. Saved highlight detail or preview page.
4. Publish or Feature action and success notice.
5. The resulting highlight on the public Community Participation page.

**Caption below the assembled screenshots:**

**Figure 34. Community Highlight creation, publication, and public display.**

**Explanation below the caption:**

Figure 34 presents the content-management workflow for community highlights. An administrator creates or edits bilingual museum news, programs, activities, or advisories, manages their media and publication status, optionally marks one as featured, and verifies the published result on the public website.

### Figure 35 — Online Gallery content management

**Screenshots to capture, in arrow order:**

1. Gallery Card Library with publication filters and search.
2. New Gallery Card editor containing image, optional GLB model, category, tags, and bilingual text.
3. Administrator preview or detail page with media tabs.
4. Publish action and success notice.
5. Published artifact card or detail page in the public Online Gallery.

**Caption below the assembled screenshots:**

**Figure 35. Online Gallery artifact creation and publication.**

**Explanation below the caption:**

Figure 35 shows how authorized personnel maintain digital artifact records without modifying source code. The administrator supplies the artifact's media, classification, tags, and bilingual descriptions, previews the record, changes its publication status, and confirms that the artifact is available in the public gallery.

### Figure 36 — Educational Resource content management

**Screenshots to capture, in arrow order:**

1. Educational Resource Library with Active, Draft, and Archived filters.
2. New Resource editor with cover image, resource file, format, subject, description, teaching prompt, and tags.
3. Administrator resource detail or preview page.
4. Publish action and success notice.
5. Published resource in the public Educational Resources library.

**Caption below the assembled screenshots:**

**Figure 36. Educational Resource creation and publication.**

**Explanation below the caption:**

Figure 36 presents the workflow used to add and maintain learning materials. Administrators upload the supporting media and file, enter the resource's descriptive and teaching information, review the saved record, manage its status, and verify that active resources appear in the public learning library.

### Figure 37 — Virtual Tour environment management

**Screenshots to capture, in arrow order:**

1. Tour Environments library showing Original, active, draft, or archived tours.
2. New Environment form or Original-import workflow.
3. Virtual Tour editor with scene panorama and scene settings.
4. Hotspot creation or editing with its linked destination or information content.
5. Published environment appearing in the public tour selector.

**Caption below the assembled screenshots:**

**Figure 37. Virtual Tour environment, scene, and hotspot management.**

**Explanation below the caption:**

Figure 37 shows how administrators maintain immersive tour content. Authorized personnel can create or import an environment, organize panoramic scenes, configure navigation and information hotspots, preserve drafts or archived versions, publish a revision, and make the active environment available in the public selector.

### Figure 38 — Guided-visit booking review and decision

**Screenshots to capture, in arrow order:**

1. Booking Operations calendar and booking queue.
2. Pending filter or searched booking request.
3. Booking review page with organization, schedule, contact, and visitor counts; mask private values.
4. Confirm, Reschedule, or Cancel decision and status notice.
5. Updated queue or calendar after the final decision.

**Caption below the assembled screenshots:**

**Figure 38. Guided-visit booking review and administrative decision.**

**Explanation below the caption:**

Figure 38 presents the museum staff workflow for coordinating guided visits. Administrators review pending requests, examine scheduling and visitor information, issue a confirmation, rescheduling, or cancellation decision, and see the finalized status reflected in the booking queue and calendar.

### Figure 39 — Participation-submission review and moderation

**Screenshots to capture, in arrow order:**

1. Participation Submission Library with Pending, Published, Archived, and Unverified filters.
2. Selected educational-material or community-story submission.
3. Review page with uploaded media or document preview and submission details; mask personal information.
4. Publish or Archive action and success notice.
5. Published community story or approved educational resource in its appropriate public module, when applicable.

**Caption below the assembled screenshots:**

**Figure 39. Participation-submission review and moderation.**

**Explanation below the caption:**

Figure 39 shows how museum personnel moderate contributions before public use. The administrator filters the review queue, examines the submitted story or learning material and its attachments, protects private contributor information, and either publishes appropriate content or archives the submission.

### Figure 40 — Visitor-feedback analytics and review

**Screenshots to capture, in arrow order:**

1. Feedback Analytics summary with average rating and response counts.
2. Rating Distribution, Visit Channels, and Sentiment Distribution panels.
3. Feedback Review Library filtered to New responses.
4. Selected response review page with all identifying data masked.
5. Mark Reviewed or Archive action and updated status.

**Caption below the assembled screenshots:**

**Figure 40. Visitor-feedback analytics, review, and status management.**

**Explanation below the caption:**

Figure 40 presents how administrators use visitor responses to monitor and improve the platform and museum services. The interface summarizes ratings, visit channels, and sentiment categories, while the review library allows each response to be examined and classified as new, reviewed, or archived.

### Figure 41 — Administrator notifications and account security

**Screenshots to capture, in arrow order:**

1. Notification bell displaying an unread count.
2. Notifications panel containing a new booking or E-Participation alert.
3. Notification after opening it or selecting Mark All as Read.
4. Administrator Account Settings page.
5. Password-change or Sign Out All Sessions confirmation; do not show passwords.

**Caption below the assembled screenshots:**

**Figure 41. Administrator notifications and account-security controls.**

**Explanation below the caption:**

Figure 41 shows how administrators are alerted to new operational work and protect access to the backend. The notification inbox links staff to new booking and participation records, while the account settings provide password management and session-invalidation controls for the authorized administrator account.

---

## Recommended appendix page layout

Use the following repeated arrangement, which follows the visual logic of the supplied reference image:

```text
STORYBOARD

[Short workflow heading]

        [1. Screen]  ──action──>  [2. Screen]
              ^                         |
              |                         action
              |                         v
        [4. Screen]  <─action──  [3. Screen]

Figure 14. Homepage and accessible heritage-story navigation.

Figure 14 presents ...
```

Prefer one large figure per page for figures containing five screenshots. Two figures may share a page only when each remains legible at normal print size. Avoid decorative loop arrows when the interaction is a straight sequence or a set of branches.

## Final capture checklist

- [ ] Every figure represents one task, journey, or administrative responsibility.
- [ ] Every screenshot comes from the same final system version and consistent browser size.
- [ ] The first screenshot gives enough context to identify the module.
- [ ] Arrows and step numbers make the order unambiguous.
- [ ] Success, changed, or final states are visible where the workflow performs an action.
- [ ] Personal, authentication, storage, and recovery information is masked.
- [ ] Captions use consistent sequential numbering and match the List of Figures word for word.
- [ ] Each explanation states the actor, the action, and the outcome without merely repeating the caption.
- [ ] No figure crosses the manuscript margins and all UI text is readable in print.
- [ ] The research adviser has confirmed whether continuous `Figure 14` numbering or appendix-specific `Appendix Figure A-1` numbering is required.

## Research basis used for the storyboard approach

- Software-interface storyboards are best understood as important screen states connected by the end-user actions that change those states. They illustrate important interaction sequences rather than attempting to reproduce every possible system state.
- Capstone guidance commonly asks researchers to show key interface screens and explain how users interact with them.
- Philippine capstone examples place a system storyboard in the appendices and treat the assembled screens as numbered figures.
- Figure-formatting guidance commonly requires consistent numbering, legible images, and captions positioned consistently relative to the figure. The supplied reference and the manuscript's existing figure style should take priority over a generic citation-style example.

