# Local Development

## Repo Layout

- `apps/api` - Laravel API.
- `apps/mobile` - React Native mobile app.
- `docs` - product and architecture notes.

V1 is iOS-focused. The React Native template includes Android files, but Android is out of scope until a later product phase.

## Requirements

- PHP 8.3 or newer.
- Composer.
- Node 22.11 or newer.
- npm.
- Xcode for iOS builds.
- CocoaPods for iOS native dependencies.
- PostgreSQL for the API database.

## API

From the repo root:

```sh
php apps/api/artisan serve
```

Run API tests:

```sh
composer --working-dir=apps/api test
```

The API currently expects PostgreSQL. Use `running_trainer` as the local database name unless you intentionally override `DB_DATABASE`.

## Mobile

From the repo root:

```sh
npm --prefix apps/mobile start
```

In another terminal:

```sh
npm --prefix apps/mobile run ios
```

If iOS pods are missing:

```sh
cd apps/mobile/ios
bundle install
bundle exec pod install
```

## Useful Root Scripts

```sh
npm run dev:api
npm run test:api
npm run dev:mobile
npm run ios
npm run lint:mobile
npm run test:mobile
```

