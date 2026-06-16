# Gemini Project Analysis: Flutter Currency Converter

## Project Overview

This is a Flutter Web application that functions as an interactive currency converter. It was created and iteratively developed to include several modern features.

The application fetches near real-time exchange rate data from the `frankfurter.app` API. The entire application logic, UI, and state management are contained within a single `lib/main.dart` file.

**Core Technologies & Libraries:**
*   **Framework:** Flutter (SDK `>3.0.0`)
*   **Language:** Dart
*   **State Management:** `provider` (`ChangeNotifier`)
*   **HTTP Client:** `http` package
*   **Persistence:** `shared_preferences` for saving history and user selections.
*   **Formatting:** `intl` for date and number formatting.
*   **Deployment:** Docker (via Podman) with a multi-stage `Dockerfile` using Nginx to serve the final web build.

**Key Features:**
*   **Interactive Converter:** Allows users to select 'from' and 'to' currencies and an amount to convert.
*   **Real-time Conversion:** The converted amount updates automatically as the user types or changes currency selections.
*   **Conversion History:** Saves conversion history to the browser's local storage, which persists across sessions.
*   **Theme Switching:** A toggle for Light and Dark mode.
*   **Live Clock:** Displays the current time in the app bar.
*   **Data Source Disclaimer:** Informs users that rates are from a market data provider and are for informational purposes only.

## Building and Running

The project is designed to be built and run inside a container using Podman (or Docker). The setup process, especially on Windows, involves using WSL2 (Windows Subsystem for Linux 2).

**Key Commands (to be run in a WSL2/Linux environment):**

1.  **Build the Image:**
    This command uses the multi-stage `Dockerfile` to compile the Flutter web app and package it into an Nginx server image.
    ```bash
    podman build -t flutter-exchange-app .
    ```

2.  **Run the Container:**
    This command starts the container and maps port 8080 on the host to port 80 inside the container.
    ```bash
    podman run -p 8080:80 flutter-exchange-app
    ```

3.  **Access the Application:**
    Open a web browser and navigate to `http://localhost:8080`.

*Note: The `README.md` contains an extensive FAQ section for troubleshooting common Podman and build issues.*

## Development Conventions

*   **State Management:** The project uses two main providers: `ThemeProvider` for light/dark mode and `ExchangeRateProvider` for all business logic related to fetching rates, performing conversions, and managing history.
*   **Single-File Architecture:** All Dart code, including UI widgets, state providers, and models, is located in `lib/main.dart`. For future development, this could be refactored into separate files for better organization.
*   **Persistence:** State (last selected currencies, conversion history) is explicitly saved to `SharedPreferences` within the `ExchangeRateProvider`'s methods. History is serialized to JSON strings for storage.
*   **UI Structure:** The UI is composed of stateless and stateful widgets, with helper methods (`_buildConverterCard`, `_buildHistoryPanel`) used to structure the layout.
*   **Asynchronicity:** `Future` is used for all API calls and for interacting with `SharedPreferences`. A `Timer` is used for the real-time clock, and a `debounce` Timer is used to manage real-time conversion updates from the amount field.
