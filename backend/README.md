# Solana DRS System

A Django-based decentralized registration system (DRS) that interacts with the Solana blockchain, listening for events, parsing them, and updating the database accordingly.

## Project Structure

### Core Components

- **`systems/models`**: Houses all models in the system, from user models to DRS implementation.

- **`systems/management/commands/listen_solana_events.py`**: Contains the command that runs the listener and parses responses using the parser.

- **`systems/listeners.py`**: Implementation of the Solana event listener that:
  - Establishes a connection with the Solana WebSocket endpoint
  - Subscribes to the program
  - Receives incoming messages from the WebSocket

- **`systems/parser.py`**: Decodes token events from Solana, converting them to Python dictionaries that can be used by the backend.

- **`systems/routing.py` & `systems/urls.py`**: House all the paths for the backend and WebSockets.

- **`systems/views.py`**: Contains various views, which are mostly read-only - users can't directly edit the database.

- **`systems/signals.py`**: Houses all signals - the heart of the DRS system. After events are parsed by the `listen_solana_events` function, appropriate signals are triggered based on event type (coin creation, trade, etc.), which then update the database, ensuring security.

## Data Flow

1. The Solana listener connects to the blockchain WebSocket endpoint
2. Upon receiving events, the parser decodes them into usable Python dictionaries
3. Based on event type, appropriate signals are triggered
4. Signals update the database accordingly, maintaining security by separating direct user access from database modifications

## Tech Stack

- **Framework**: Django
- **Asynchronous Support**:
  - Channels
  - Channels-Redis
  - Daphne
- **Blockchain Integration**:
  - Solana
  - Solders
  - Base58
- **API**: Django REST Framework
- **Database**: PostgreSQL (psycopg2-binary)
- **Configuration**: python-dotenv
- **Security**: django-cors-headers
- **Caching**: django_redis
- **HTTP Requests**: requests

## Installation

```bash
# Clone the repository
git clone [repository URL]
cd [project directory]

# Setup virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install django channels channels-redis daphne solana solders base58 \
            djangorestframework psycopg2-binary python-dotenv \
            django-cors-headers django_redis requests

# Configure environment variables
cp .env.example .env  # Then edit .env with your settings

# Apply migrations
python manage.py migrate

# Start the server
python manage.py runserver
```

## Running the Solana Event Listener

```bash
python manage.py listen_solana_events
```

## Development

To modify the system:

1. Edit model changes and create migrations: `python manage.py makemigrations`
2. Apply migrations: `python manage.py migrate`
3. For WebSocket changes, update the appropriate consumers in the channels system
4. For API endpoints, modify the views and update urls.py

## Security Model

This system uses a signal-based approach for database modifications. User requests don't directly modify the database; instead, blockchain events trigger signals that handle database updates. This separation enhances security by ensuring that database modifications follow a verified path through blockchain events. 
```
