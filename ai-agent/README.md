# Admin Assistant AI Agent

This AI agent assists administrators in managing the booking system. It provides capabilities for querying bookings, generating reports, analyzing occupancy, and managing content using OpenRouter API.

## Quick Start

1. **Get API Key**: Visit [OpenRouter.ai](https://openrouter.ai/) → Sign up → [API Keys](https://openrouter.ai/keys) → Generate key
2. **Configure**: Copy `.env.example` to `.env` and add your `OPENROUTER_API_KEY`
3. **Install & Run**: `pip install -r requirements.txt && python admin_assistant.py`

## Features

- **Booking Queries**: Answer questions about bookings, filter by status, dates, etc.
- **Report Generation**: Create summaries and reports on booking data
- **Occupancy Insights**: Calculate and provide occupancy rates and trends
- **Content Management**: CRUD operations on content blocks
- **Conversational AI**: Powered by OpenRouter with various model options

## Setup

1. **Python Environment**: Ensure Python 3.10+ is installed.

2. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Get OpenRouter API Key**:
   - Visit [OpenRouter.ai](https://openrouter.ai/)
   - Sign up for a free account
   - Go to [API Keys](https://openrouter.ai/keys) and generate a new API key
   - Copy the API key (starts with `sk-or-v1_`)

4. **Configure Environment**:
   - Copy `.env.example` to `.env`
   - Add your OpenRouter API key: `OPENROUTER_API_KEY=sk-or-v1_your_key_here`
   - Optionally change the model: `OPENROUTER_MODEL=anthropic/claude-3-haiku`
   - Ensure the Next.js API is running (default: `http://localhost:3000`)

5. **Run the Agent**:

   ```bash
   python admin_assistant.py
   ```

The agent will start a Flask server on port 8087 with endpoints:

- `POST /chat` - Send messages to the AI assistant
- `GET /health` - Health check endpoint

## Testing Your Setup

Once the agent is running, test it with:

```bash
curl -X POST http://localhost:8087/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me with booking queries?"}'
```

You should receive a response from the AI assistant.

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)
- `OPENROUTER_MODEL`: Model to use (default: anthropic/claude-3-haiku)
- `API_BASE_URL`: Next.js API base URL (default: <http://localhost:3000>)
- `PORT`: Server port (default: 8087)

### Available Models

You can use any model available on OpenRouter. Here are some recommended options:

#### Anthropic Claude Models (Recommended)

- `anthropic/claude-3-haiku` - Fast, cost-effective for most admin tasks
- `anthropic/claude-3-sonnet` - More capable, better reasoning for complex queries

#### OpenAI Models

- `openai/gpt-4o-mini` - OpenAI's latest efficient model
- `openai/gpt-4o` - Most capable, higher cost

#### Open Source Models (Free/Low Cost)

- `meta-llama/llama-3.1-8b-instruct` - Good performance, very low cost
- `mistralai/mistral-7b-instruct` - Fast and capable

Check [OpenRouter's model pricing](https://openrouter.ai/models) for current costs and availability.

## API Integration

The agent communicates with the Next.js admin panel via HTTP API calls to endpoints like:

- `/api/bookings`
- `/api/calendar/occupancy`
- `/api/content`

Ensure these endpoints are available and properly authenticated.

## Tool Usage

The AI assistant can automatically call tools based on your queries:

- **get_bookings(status, limit)**: Fetch bookings with optional filters
- **generate_booking_report(start_date, end_date)**: Generate booking reports
- **calculate_occupancy(start_date, end_date)**: Calculate occupancy insights
- **get_content_blocks()**: Fetch content blocks
- **update_content_block(id, data)**: Update content blocks

## Development

For local development with debugging:

```bash
# Install additional dev dependencies
pip install debugpy

# Run with debugger
python -m debugpy --listen 127.0.0.1:5679 admin_assistant.py
```

Then attach your debugger to port 5679.

Currently configured for Microsoft Foundry models. For production use, set up a Foundry project and update the `.env` file.

If no Foundry project is available, consider using GitHub Models for development (free tier available).
