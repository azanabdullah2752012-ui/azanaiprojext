# Contributing Guidelines

Thank you for contributing to **AmbientSpaces & CivilOS**! To keep our codebase clean, readable, and easy to maintain, we follow these standards.

---

## 1. Branch Strategy

We use a simple Git branching model to ensure the `main` branch is always stable.

```
       [feature branch]  ───> [develop]  ───> [main] (vX.Y.Z)
       (feature/movement)
```

- **`main`**: Production-ready branch. Always stable. Only merges from `develop` when a milestone is completed, verified, and ready for release tagging.
- **`develop`**: The primary working integration branch. New features are merged here.
- **Feature Branches (`feature/name`)**: Used for building individual milestones and features (e.g. `feature/movement`, `feature/ollama`). Always branch off `develop` and merge back to `develop` via pull request/code review.
- **Bugfix Branches (`bugfix/name`)**: Used for addressing issues in testing.

---

## 2. Commit Message Guidelines

We use clear, descriptive commit messages prefixed with the category and optional component scope:

```
<type>(<scope>): <short description>
```

### Allowed Types:
- `feat`: A new feature (e.g. `feat(movement): implement pathfinding`)
- `fix`: A bug fix (e.g. `fix(collision): correct boundary offset checking`)
- `docs`: Documentation edits (e.g. `docs(architecture): update database diagrams`)
- `style`: Code formatting changes (CSS structure, spacing)
- `refactor`: Restructuring code logic without changing external behavior

---

## 3. Semantic Versioning

We track releases using standard semantic versioning: **`vMAJOR.MINOR.PATCH`** (e.g., `v0.1.0`).

- **`PATCH`** increments: Bug fixes and performance patches (e.g., `v0.1.0` -> `v0.1.1`).
- **`MINOR`** increments: Introducing new features or milestones in the roadmap (e.g., `v0.1.0` -> `v0.2.0`).
- **`MAJOR`** increments: Shifting project specifications or launching production builds (e.g., `v0.9.0` -> `v1.0.0`).

---

## 4. Coding Standards

- **Core Tech**: React (Vite frontend) and Express (Node server) in pure JavaScript.
- **Styling**: Vanilla CSS inside `App.css`. Use CSS custom properties for color tokens.
- **State Management**: React state hooks or local engines. Keep game canvas rendering state distinct from React UI states.
- **Decoupled Logic**: Keep AI intention separate from Simulation validation rules.

---

## 5. Definition of Done (DoD)

Before any feature is merged into `develop` or a version is tagged on `main`, it must meet these criteria:
1. Code compiles successfully with zero React/Vite errors (`npm run build`).
2. Run manually and verify that the target feature works (WASD moves, chat broadcasts, or database saves).
3. Update the `walkthrough.md` in the project archives to reflect the modifications.
