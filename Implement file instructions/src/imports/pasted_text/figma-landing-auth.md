You are designing a modern, clean, and aesthetic Figma landing page and authentication flow for this existing website:

https://nhcp-digital-heritage.vercel.app

Project:
“Design and Development of a WebXR-Enabled Digital Heritage Experience Platform for the NHCP Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan.”

Main goal:
Improve the existing landing page and add a complete user account login/sign-up flow, similar to a polished Figma authentication experience. Keep the existing website information and sections as-is, but improve the visual layout, spacing, hierarchy, and interaction design.

Important:
Do not remove or rewrite the existing landing page content. Preserve the current sections:
- Hero section for Museo ng Libingan sa Ilalim ng Lupa / Nagcarlan Underground Cemetery Museum
- Current Exhibits & News
- Visitor Information
- About the Site
- Cemetery History
- House Rules
- Explore Our Platform
- Footer with Quick Links, Contact, and Visiting Hours

Design style:
- Modern, clean, immersive, and heritage-inspired
- Avoid looking like an old website
- Avoid too many nested rounded rectangles
- Use elegant spacing, soft shadows, glassmorphism only where appropriate, subtle gradients, and strong visual hierarchy
- Use warm heritage colors inspired by stone, brick, sepia, cream, dark brown, and muted gold
- Make the design feel like a digital museum experience, not a generic website
- Make it responsive for desktop, tablet, and mobile
- Keep accessibility in mind: readable text, clear button labels, high contrast, visible focus states, and keyboard-friendly modal behavior

Landing page update:
Add a placeholder character for “Ana Kalang” from Nagcarlan as a friendly digital tour guide.

Ana Kalang tour guide placeholder:
- Add a dedicated visual placeholder area in the hero or near the landing page introduction
- The placeholder should represent where a future 3D character model will be placed
- Do not create the final 3D model; just design the placeholder
- Label it clearly as: “Ana Kalang 3D Tour Guide Placeholder”
- The character should feel welcoming, educational, and connected to Nagcarlan heritage
- Add a small speech bubble or guide panel where Ana Kalang introduces the website
- Example speech bubble text:
  “Welcome! I’m Ana Kalang, your digital heritage guide. Let me help you explore the history, exhibits, accessibility features, and immersive experiences of the Nagcarlan Underground Cemetery.”
- The guide should not cover the existing content
- It should support the landing page experience, not distract from it

Top navigation update:
Add a user account button in the top navigation.

Button label options:
- “Account”
- “Sign In”
- Or an icon + text: “Account”

When the user clicks the Account button:
Show a clean authentication div/popup/modal.

Account modal default state: Login
The modal should include:
- Title: “Welcome Back”
- Subtitle: “Continue your digital heritage experience.”
- Button: “Continue with Google”
- Divider text: “or”
- Email input
- Password input
- Primary button: “Login”
- Link: “Forgot Password?”
- Text link: “Don’t have an account? Sign up”
- Close button / X icon
- Clear error state examples
- Loading state example for login button

Forgot Password state:
When the user clicks “Forgot Password?”
Show:
- Title: “Reset your password”
- Short instruction text
- Email input
- Button: “Send reset link”
- Link: “Back to Login”
- Success state: “Password reset link sent. Please check your inbox.”

Sign-up state:
When the user clicks “Sign up”
Show a sign-up version of the same modal.

Sign-up modal should include:
- Title: “Create Your Account”
- Subtitle: “Join the digital heritage experience.”
- Button: “Continue with Google”
- Divider text: “or”
- Required Email input
- Required Password input
- Optional Confirm Password input if it improves the UX
- Primary button: “Sign Up”
- Link: “Already have an account? Login”
- Include small helper text:
  “A verification email will be sent to confirm your account.”

After clicking Sign Up:
Show a verification/check inbox state.

Verification state:
- Title: “Check your inbox”
- Message:
  “We sent a verification email to qweqwe@gmail.com. Please open the email and click the verification button to continue.”
- Include email as dynamic text using the typed email value
- Button: “Resend verification email”
- Link: “Use another email”
- Link: “Back to Login”
- Add a small envelope illustration or icon
- Add loading and resent states:
  “Verification email resent.”

Email verification flow:
Design a simple representation of the email verification process:
- User receives verification email
- User clicks the verification button in the email
- User is redirected back to the website

After verification redirect:
Design a full-page onboarding screen, not a modal.

Onboarding page:
This appears after the user verifies their email.

Page title:
“Complete Your Profile”

Subtitle:
“Help us personalize your digital heritage experience.”

Fields:
1. Name
   - Required input
   - Placeholder: “Enter your full name”

2. How do you plan to use the website?
   - Use a textarea or selectable cards
   - Example options:
     - Explore museum information
     - Learn for school or research
     - Prepare for a visit
     - Access virtual tours and exhibits
     - Share feedback or stories
     - Use teaching or learning materials

3. Which roles best describe you?
   - Use multi-select chips or cards
   - Options:
     - Visitor
     - Student
     - Teacher
     - Researcher
     - Historian
     - Person with Disability
     - Senior Citizen
     - Museum Staff
     - Local Resident
     - Tourist
     - Other

Primary button:
“Finish Setup”

After clicking Finish Setup:
Redirect the user back to the landing page.

Logged-in landing page state:
Show the user is now logged in.
In the top nav:
- Replace “Account” / “Sign In” button with a user avatar or name
- Example: “Hi, Ana” or a small profile icon
- Include dropdown menu:
  - Profile
  - My Activity
  - Settings
  - Logout

Authentication design requirements:
Create these Figma frames:
1. Landing Page - Guest State
2. Landing Page - Account Modal Open
3. Login Modal
4. Forgot Password Modal
5. Sign Up Modal
6. Check Inbox / Verification Sent Modal
7. Email Verification Redirect Explanation Frame
8. Complete Profile / Onboarding Page
9. Landing Page - Logged-in State
10. Mobile versions of the main login/sign-up/onboarding screens

Interaction prototype:
Add prototype links:
- Account button → Login modal
- Sign up link → Sign-up modal
- Forgot password link → Forgot password modal
- Sign-up button → Check inbox modal
- Resend verification email → Resent success state
- Verification link simulation → Complete Profile page
- Finish Setup → Logged-in landing page
- Logout → Guest landing page

Accessibility requirements:
- Inputs must have visible labels, not only placeholders
- Buttons must be large enough for touch
- Maintain readable contrast
- Include focus states
- Modal should have a dimmed background overlay
- Modal must have close button
- Mobile layout should stack cleanly
- Use clear error and success messages
- Avoid relying only on color to communicate status

Content preservation:
Do not remove the current website content. The landing page must still include the original museum information, exhibit/news area, visitor information, about the site, cemetery history, house rules, platform features, quick links, contact details, and visiting hours.

Final output:
Create a polished Figma UI design with organized frames, clear component naming, reusable modal components, responsive layouts, and prototype interactions for the complete login, sign-up, email verification, onboarding, and logged-in user flow.