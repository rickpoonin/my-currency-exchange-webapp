# Skills & Technologies Demonstrated

This project showcases a variety of modern software engineering practices, specifically focusing on cross-platform web development using Flutter. 

## 1. Frontend Development (Flutter & Dart)
- **Cross-Platform UI:** Building responsive and dynamic user interfaces for the web using Flutter's widget tree.
- **Material Design 3:** Implementing modern UI components (Cards, AppBars, TextFields, DropdownButtons) and typography.
- **Theming:** Creating dynamic Light and Dark modes using `ThemeData` and `ColorScheme`, allowing users to toggle appearances at runtime.
- **Asset Management:** Bundling and rendering local image assets (flags) for offline availability and performance.

## 2. State Management
- **Provider Pattern:** Using the `provider` package (`ChangeNotifierProvider`, `Consumer`, `MultiProvider`) to decouple business logic from the UI.
- **Reactive UI:** efficiently rebuilding only the necessary parts of the UI when state changes occur (e.g., ticking clock, typing amounts, updating currencies).

## 3. Asynchronous Programming & API Integration
- **RESTful API Consumption:** Fetching real-time exchange rate data from a remote endpoint (`api.frankfurter.app`) using the `http` package.
- **JSON Parsing:** Serializing and deserializing complex JSON payloads into strongly typed Dart Maps and custom model classes (`ConversionHistory`).
- **Futures & Async/Await:** Handling network requests and local disk I/O smoothly without blocking the main UI thread.
- **Timers & Debouncing:** Implementing periodic timers for a live clock and expiration countdown, as well as debouncing user text input to prevent excessive state updates.

## 4. Local Persistence
- **Shared Preferences:** Storing user preferences (last selected currencies) and complex historical data locally in the browser to persist across app sessions.

## 5. Architecture & Code Organization
- **Model-View-ViewModel (MVVM) principles:** Separating the UI (`HomePage`) from the state and business logic (`ExchangeRateProvider`).
- **Data Encapsulation:** Using private variables with public getters in provider classes to protect the internal state.

## 6. DevOps & Containerization
- **Podman / Docker:** Writing multi-stage `Dockerfile` configurations to compile the Flutter Web app and serve it using an Nginx web server container.
- **Web Server Configuration:** Setting up `nginx.conf` (referenced in project structure) to properly route and serve single-page application (SPA) static assets.