# ThreeJS MMO

A multiplayer game built with Next.js, Three.js, and WebSockets, ready for Farcaster Frame integration.

## Project Structure

The project is a monorepo containing:
- `app/` - The Next.js frontend application with Three.js for 3D rendering and Farcaster Frame support.
- `server/` - The Node.js WebSocket server for real-time communication.

## Getting Started

### Prerequisites
- Node.js (v20.11.1 or higher recommended)
- npm

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/compusophy/eune.git
    cd eune
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

3.  **Install server dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

### Running the Application

1.  **Start the WebSocket server:**
    ```bash
    # In the server directory
    npm run dev
    ```
    The WebSocket server will start on port 8080 by default.

2.  **Start the Next.js frontend:**
    ```bash
    # In the root project directory
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Deployment

The project is deployed on [Railway](https://railway.app/). The `railway.json` file configures the deployment for both the frontend and the backend WebSocket server.

## Future Development & Next Steps

We have a solid foundation with a real-time client-server architecture. The next critical phase is to build out user and data persistence to create a true MMO experience.

### Data Persistence with a Railway Database

Currently, player data is ephemeral and lost when the server restarts. To create a persistent world, we need a database.

**Recommendation:** Add a database service to the project on Railway (e.g., PostgreSQL or MongoDB).

**Implementation Steps:**
1.  **Provision a Database on Railway:** Go to your Railway project dashboard and add a new service, selecting your preferred database.
2.  **Connect to the Database:** Railway will provide a connection string as an environment variable. Use this in the WebSocket server to connect a database client (e.g., `node-postgres` for PostgreSQL or `mongodb` for MongoDB).
3.  **Create a Schema:** Design and create tables or collections for:
    *   `users`: To store account information (e.g., username, hashed password, email).
    *   `characters`: To store character data (e.g., name, class, level, appearance) linked to a user.
    *   `player_state`: To store the last known position and inventory of each character.
4.  **Integrate with Server Logic:** Modify the server to read from and write to the database for character loading, saving player positions, etc.

### User Management & Character Flow

We will implement a complete, "World of Warcraft"-style user and character management flow.

1.  **Sign-in / Sign-up Page:**
    *   Create a landing page for user authentication.
    *   Users can either sign in with existing credentials or create a new account.
    *   This will interact with the `users` table in our database.

2.  **Character Selection Screen:**
    *   After logging in, users are presented with a list of their existing characters.
    *   This screen will also have an option to create a new character.

3.  **Character Creation Screen:**
    *   A dedicated scene where users can customize their character's name, appearance, and other starting attributes.
    *   Upon finalizing, the new character is saved to the `characters` table.

4.  **Entering the World:**
    *   Once a character is selected, the user enters the game world.
    *   The server will load the character's data and place them at their last saved position.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
