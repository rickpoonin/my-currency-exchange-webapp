# Flutter Exchange Rate App

This is a robust Flutter Web application designed to display real-time USD exchange rates to EUR, GBP and JPY. It also simulates bank comparison rates by applying random spreads and includes theme support to toggle between Light and Dark Modes.

## Features

-   **Real-time Exchange Rates**: Fetches the latest USD to EUR/GBP/JPY rates from `https://api.frankfurter.app`.
-   **Bank Comparison Simulation**: Programmatically simulates "Buy" prices from three different banks ("Global Bank", "FastRemit", "SecureTransfer") by adding small random spreads (0.5% - 2%) to the market rate.
-   **Theme Support**: A toggle switch allows users to switch between Light Mode and Dark Mode, with the app's UI adapting appropriately using Flutter's `ThemeData`.

## Getting Started

### Prerequisites

*   Flutter SDK installed (for local development, though Docker handles the build process).
*   Podman installed (as an alternative to Docker for building and running containers).

### Podman Installation (Windows)

If you don't have Podman installed, you can try installing it via `winget` (Windows Package Manager). Open PowerShell as Administrator and run:

```powershell
winget install RedHat.Podman
```

After installation, you might need to initialize and start the Podman machine:

```powershell
podman machine init
podman machine start
```

### Building and Running with Podman

1.  **Navigate to the project directory**:
    Open your terminal or PowerShell and change the directory to the root of this project, where `Dockerfile` and `pubspec.yaml` are located.

2.  **Build the Podman image**:
    This command builds the Flutter web application inside a container and then packages it into an Nginx image.
    ```powershell
    podman build -t flutter-exchange-app .
    ```

3.  **Run the Podman container**:
    This command runs the built image, mapping port 8080 on your host machine to port 80 inside the container (where Nginx serves the app).
    ```powershell
    podman run -p 8080:80 flutter-exchange-app
    ```

4.  **Access the Application**:
    Once the container is running, open your web browser and navigate to:
    ```
    http://localhost:8080
    ```

## Project Structure

-   `pubspec.yaml`: Defines project dependencies (http, provider, intl).
-   `lib/main.dart`: Contains the entire Flutter application code, including state management (`ChangeNotifier` for themes and exchange rates) and UI.
-   `Dockerfile`: Multi-stage Dockerfile to build the Flutter web app and serve it with Nginx.
-   `nginx.conf`: Nginx configuration for serving the static Flutter web assets.

## Dependencies

-   `http`: For making API calls to fetch exchange rates.
-   `provider`: For simple and efficient state management.
-   `intl`: For internationalization, specifically for number formatting.

## Frequently Asked Questions (FAQ)

### Q1: My Windows machine does not support Docker. Can I use Podman?

**A1:** Yes, Podman is an excellent open-source alternative to Docker, offering similar functionality for building and running container images. On Windows, Podman typically uses a lightweight Linux virtual machine (VM) via Hyper-V or WSL2.

### Q2: `podman machine start` fails with "All pipe instances are busy" or "No connection could be made"?

**A2:** This indicates a conflict with another process (like Docker Desktop) holding onto the communication pipe, or the Podman VM is in a stuck state.

**Solutions:**
1.  **Ensure no other container platforms are running**: Fully close Docker Desktop or any other containerization software. Check Task Manager for lingering processes.
2.  **Restart Podman machine**:
    ```powershell
    podman machine stop
    podman machine start
    ```
3.  **Reset Podman machine (if restart fails)**: This will delete data in the VM.
    ```powershell
    podman machine rm -f
    podman machine init
    podman machine start
    ```

### Q3: `podman build` fails with "Cannot connect to Podman socket" or "No connection could be made"?

**A3:** This means the Podman client cannot reach the Podman service running in the VM.

**Solutions:**
1.  **Verify Podman machine status**:
    ```powershell
    podman machine list
    ```
    Ensure the machine is `Running`.
2.  **Perform a full reset**: If the machine is not running or the connection fails, a full reset often resolves underlying VM or networking issues. See Q2, Solution 3.
3.  **Check for Hyper-V/WSL2 issues**: If you're on Windows 10 Home and don't have Hyper-V, you'll need to set up WSL2 to run Podman. Refer to the Podman installation steps for WSL2.

### Q4: `podman build` fails with "short-name 'flutter/flutter:stable' did not resolve to an alias"?

**A4:** Podman requires explicit registry names for security. When you use `flutter/flutter:stable`, it doesn't know to look on Docker Hub (`docker.io`).

**Solution:**
1.  **Edit Podman's registries configuration**: Open `/etc/containers/registries.conf` (in your WSL Ubuntu terminal):
    ```bash
    sudo nano /etc/containers/registries.conf
    ```
2.  **Add `docker.io` to `unqualified-search-registries`**: Ensure there's a line like:
    ```ini
    unqualified-search-registries = ["docker.io", "registry.access.redhat.com"]
    ```
    Save and exit.

### Q5: `podman build` fails with "unauthorized: authentication required" when pulling Flutter image?

**A5:** This means Docker Hub is requiring authentication to pull the specified Flutter image.

**Solutions:**
1.  **Verify Docker Hub credentials**: Ensure your Docker Hub username and password are correct by logging into `hub.docker.com` in a browser.
2.  **Clear old Podman credentials**:
    ```bash
    rm -f ~/.config/containers/auth.json
    ```
3.  **Log in to Docker Hub via Podman**:
    ```bash
    podman login docker.io
    ```
    Enter your correct Docker Hub username and password.
4.  **Consider alternative Flutter base image**: The image `flutter/flutter:stable` is not officially maintained by the Flutter team. If authentication issues persist, it's better to use a well-known community-maintained image like `cirrusci/flutter:stable`.

### Q6: `podman build` fails to pull `docker.io/flutter/flutter:stable` or `ghcr.io/fluttercommunity/flutter:stable` consistently?

**A6:** These specific Flutter images can sometimes have inconsistent public access or require authentication due to rate limits or registry policies.

**Solution:**
1.  **Use `cirrusci/flutter:stable`**: Update your `Dockerfile` to use `cirrusci/flutter:stable` as the builder image in the first stage:
    ```dockerfile
    FROM cirrusci/flutter:stable as builder
    ```
    This image is widely used in CI/CD and is generally more reliably publicly accessible.
    Then, try `podman build` again.