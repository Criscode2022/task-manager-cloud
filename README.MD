# Task Cloud

Task Cloud is an Ionic + Angular Progressive Web App for personal task management with offline support and cloud sync.

## Features

- Create, edit, complete, and delete tasks
- Filter tasks by status
- Offline support with Ionic Storage
- Cloud synchronization across devices
- Responsive UI built with Ionic and Tailwind CSS

## Live App

- Production URL: [https://task-cloud.netlify.app](https://task-cloud.netlify.app)

## Tech Stack

- Angular 19
- Ionic 8
- Tailwind CSS
- Supabase
- Jasmine + Karma
- ESLint

## Getting Started

1. Clone the repository.

```bash
git clone https://github.com/Criscode2022/task-manager-ionic.git
cd task-manager-ionic
```

2. Install dependencies.

```bash
npm install
```

3. Start the development server.

```bash
npm start
```

## Useful Scripts

- `npm start`: Start local development server
- `npm run build`: Build production app
- `npm run lint`: Run ESLint checks
- `npm run test`: Run tests in watch mode
- `npm run test:ci`: Run tests once in headless Chrome (for CI)
- `npm run lint:ci`: Run lint checks for CI

## Testing and Linting

Run quality checks locally before pushing:

```bash
npm run lint
npm run test:ci
```

## GitHub CI

This repository includes a GitHub Actions workflow that runs on every push and pull request to `main`:

- Install dependencies with `npm ci`
- Run `npm run lint:ci`
- Run `npm run test:ci`

Workflow file: `.github/workflows/ci.yml`

## Supabase Setup

See `SUPABASE_SETUP.md` and the migration files in the project root for backend setup details.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request with clear context and testing notes.

## Contact

For questions or suggestions: [cristiancode2023@gmail.com](mailto:cristiancode2023@gmail.com)
