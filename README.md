![Diligental Header](https://i.imgur.com/aZ4qH7J.png) # Diligental

> **A modern, open-source team messaging platform.**

Diligental is a lightweight, self-hosted alternative to Slack, designed for fast and organized team communication. It is completely free and open-source.

![Diligental App Mockup](https://i.imgur.com/YourAppMockupURL.png) ## ✨ Key Features

- **Organized Messaging:** Communicate through topic-based channels and private direct messages.
- **Team Workspaces:** Create separate workspaces for different projects or teams.
- **Role-Based Access:** Manage user permissions securely.
- **Modern Tech Stack:** Built with Node.js and MongoDB.
- **RESTful API:** Modular API for easy integration and extension.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm or Yarn
- MongoDB instance
- Git

### Local Installation

1.  **Clone & Install:**
    ```bash
    git clone [https://github.com/kiyotaka-koji-0/Diligental.git](https://github.com/kiyotaka-koji-0/Diligental.git)
    cd Diligental
    npm install
    ```

2.  **Configure:**
    Copy `.env.example` to `.env` and add your MongoDB URI and other settings.

3.  **Run:**
    ```bash
    npm run migrate  # Run database migrations
    npm run dev      # Start development server
    ```
    Access the app at `http://localhost:3000`.

## 🔒 Secure Remote Access

For secure remote access to your self-hosted Diligental instance, we recommend using **Tailscale**. This allows you to access your server from anywhere without exposing it to the public internet.

1.  **Install Tailscale** on your server and your client devices.
2.  Once connected, access your Diligental instance using your server's **Tailscale IP address**.

To ensure all traffic is encrypted, configure your web server (e.g., Nginx, Caddy) to serve both the frontend and backend via **HTTPS** using your Tailscale machine name or a custom domain with SSL certificates.

## ⚙️ Configuration

Customize Diligental using environment variables in your `.env` file:

-   `MONGODB_URI`: Your MongoDB connection string.
-   `PORT`: API server port (default: `3000`).
-   `JWT_SECRET`: Secret key for authentication.

## 🤝 Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request. See `CONTRIBUTING.md` for details.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
