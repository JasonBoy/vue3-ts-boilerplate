# Vue 3 + TypeScript + Vite Boilerplate

> Node.js >= 18.16

Based on `npm create vite@latest`, with additional libs preconfigured for real projects

## ✨Highlight

- All the essential library preconfigured for quick start(`npm create vite@latest` only has Vue and TS configured)
  - `Vue-Router` for route/page handling
  - `Pinia` for store management
  - `TailwindCSS` for quick styling
  - `ESLint`, `Prettier`, `Git Hooks(husky, lint-staged)` for auto code linting and formatting
  - `dayjs` for date handling
  - Pre-added `.env` files for different modes/envs
- Built in `HttpClient`(with native `fetch` API) for quick api requests
  - Simplified `get`,`post`... methods for normal usage
  - Built-in `upload`, `download` file methods
  - Default `json` response handling
  - Support quick `application/json` and `application/x-www-form-urlencoded` body mode:
    - with only an `form: true` option to enable the latter one without changing `post`,`put` methods signature
  - Easily to add query string to api url
  - Easy life with api which has rest params in url like this: `/user/:id/:id2`:
    - No need to assemble the string by yourself, you can preconfigure it
    - And assemble it at runtime: 
    
```typescript
  http.get(api.DEMO_USER_INFO, {}, {
      restParams: {
         id: 'id1',
         id2: 'id2',
      },
  });
```

## LICENSE

MIT
