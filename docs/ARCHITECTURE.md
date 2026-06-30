# TeachersHelper Architecture Guidelines

## Core principle

Keep files small and workflows separated. The app should be built as small feature modules, not one large dashboard file.

This matters because:

- each workflow is easier to reason about
- connector updates are safer
- bugs are easier to isolate
- future mobile work will be easier to share with web logic
- the dashboard will not become a dumping ground

## Recommended frontend structure

```txt
src/
  app/
    App.jsx
    routes.jsx

  features/
    auth/
      SignIn.jsx
      session.js

    onboarding/
      OnboardingFlow.jsx
      CreateClassStep.jsx
      LearnerListStep.jsx
      learnerListParser.js

    dashboard/
      Dashboard.jsx
      DashboardHero.jsx
      StatsGrid.jsx

    classes/
      ClassSwitcher.jsx
      ArchiveClassButton.jsx
      classApi.js

    learners/
      LearnerList.jsx
      AddLearnerForm.jsx
      learnerApi.js

    observations/
      ObservationCapture.jsx
      ObservationList.jsx
      observationApi.js

    reports/
      ReportPanel.jsx
      reportApi.js

  shared/
    apiClient.js
    Button.jsx
    Card.jsx
    EmptyState.jsx
    FormField.jsx
```

## App responsibility

`App.jsx` should only decide which major flow to show:

- signed out landing/sign-in
- first-time onboarding
- dashboard

It should not contain form logic, parsing logic, report generation logic, learner list rendering, or observation capture details.

## Feature rules

Each feature should own its own UI and small helper functions.

Examples:

- onboarding owns class setup and learner list upload
- observations owns typed/voice note capture
- reports owns report draft display and generation controls
- learners owns learner list display and manual learner creation

## API rules

Frontend API calls should go through small API helpers, not directly from every component.

Example:

```txt
features/classes/classApi.js
features/learners/learnerApi.js
features/observations/observationApi.js
features/reports/reportApi.js
```

Those helpers can call the shared API client.

## Backend function rules

Netlify functions should stay small where possible.

Preferred direction:

```txt
netlify/functions/
  classes.js
  learners.js
  observations.js
  reports.js
  dashboard.js
```

Avoid one very large `app-data.js` function over time. It is acceptable for early POC work, but should be split before the tester build grows too much.

## File size guideline

Aim for:

- under 150 lines for most components
- under 250 lines for larger feature containers
- helper files should do one thing only

If a file starts needing sections, it probably needs splitting.

## Current priority

The next structural change should be to move onboarding into:

```txt
src/features/onboarding/
```

The dashboard should remain focused on daily observation capture and report generation.
