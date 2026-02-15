import asyncio
import os
from typing import List, Dict, Any
import httpx
import json
from datetime import datetime
from flask import Flask, request, jsonify

# Load environment variables
from dotenv import load_dotenv
load_dotenv(override=True)

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3-haiku")

# Next.js API base URL
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")

# System prompt for the admin assistant
SYSTEM_PROMPT = """
You are an AI assistant for the Whistle Inn booking system admin panel. You help with:
- Answering questions about bookings and reservations
- Generating reports on booking data
- Providing insights on occupancy rates and trends
- Managing content blocks and website content
- Helping with administrative tasks

You have access to tools that can fetch data from the booking system API. Use these tools when needed to provide accurate information.

Always be helpful, accurate, and professional in your responses.
"""

# Define tools for database access via API calls

def get_bookings(status: str = None, limit: int = 50) -> str:
    """Fetch bookings from the database via API."""
    try:
        params = {"limit": limit}
        if status:
            params["status"] = status
        response = httpx.get(f"{API_BASE_URL}/api/bookings", params=params, timeout=10)
        response.raise_for_status()
        bookings = response.json()
        return f"Retrieved {len(bookings)} bookings: {json.dumps(bookings, indent=2)}"
    except Exception as e:
        return f"Error fetching bookings: {str(e)}"

def generate_booking_report(start_date: str = None, end_date: str = None) -> str:
    """Generate a summary report of bookings."""
    try:
        params = {}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        response = httpx.get(f"{API_BASE_URL}/api/bookings/report", params=params, timeout=10)
        response.raise_for_status()
        report = response.json()
        return f"Booking Report: {json.dumps(report, indent=2)}"
    except Exception as e:
        return f"Error generating report: {str(e)}"

def calculate_occupancy(start_date: str, end_date: str) -> str:
    """Calculate occupancy insights."""
    try:
        params = {"startDate": start_date, "endDate": end_date}
        response = httpx.get(f"{API_BASE_URL}/api/calendar/occupancy", params=params, timeout=10)
        response.raise_for_status()
        occupancy = response.json()
        return f"Occupancy Insights: {json.dumps(occupancy, indent=2)}"
    except Exception as e:
        return f"Error calculating occupancy: {str(e)}"

def get_content_blocks() -> str:
    """Fetch content blocks for content management."""
    try:
        response = httpx.get(f"{API_BASE_URL}/api/content", timeout=10)
        response.raise_for_status()
        content = response.json()
        return f"Content Blocks: {json.dumps(content, indent=2)}"
    except Exception as e:
        return f"Error fetching content: {str(e)}"

def update_content_block(id: str, data: Dict[str, Any]) -> str:
    """Update a content block."""
    try:
        response = httpx.put(f"{API_BASE_URL}/api/content/{id}", json=data, timeout=10)
        response.raise_for_status()
        return f"Updated content block {id}"
    except Exception as e:
        return f"Error updating content: {str(e)}"

# Available tools
TOOLS = {
    "get_bookings": get_bookings,
    "generate_booking_report": generate_booking_report,
    "calculate_occupancy": calculate_occupancy,
    "get_content_blocks": get_content_blocks,
    "update_content_block": update_content_block,
}

def call_openrouter_api(messages: List[Dict[str, Any]]) -> str:
    """Call OpenRouter API for chat completion."""
    if not OPENROUTER_API_KEY:
        return "Error: OpenRouter API key not configured"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://whistle-inn-admin.vercel.app",
        "X-Title": "Whistle Inn Admin Assistant",
    }

    data = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000,
    }

    try:
        response = httpx.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Error calling OpenRouter API: {str(e)}"

def process_tool_calls(response_text: str) -> str:
    """Process any tool calls in the response and execute them."""
    import re

    # Look for patterns like "get_bookings(status='paid')" or "calculate_occupancy(start_date='2024-01-01', end_date='2024-01-31')"
    tool_patterns = [
        r'get_bookings\((.*?)\)',
        r'generate_booking_report\((.*?)\)',
        r'calculate_occupancy\((.*?)\)',
        r'get_content_blocks\(\)',
        r'update_content_block\((.*?)\)',
    ]

    for pattern in tool_patterns:
        matches = re.findall(pattern, response_text)
        for match in matches:
            # Parse the function call
            func_name = pattern.split('\\(')[0]
            if func_name in TOOLS:
                # Parse arguments
                args = {}
                if match.strip():
                    # Simple argument parsing
                    arg_pairs = match.split(',')
                    for pair in arg_pairs:
                        if '=' in pair:
                            key, value = pair.split('=', 1)
                            key = key.strip()
                            value = value.strip().strip("'\"")
                            args[key] = value

                try:
                    result = TOOLS[func_name](**args)
                    # Replace the function call with the result
                    response_text = response_text.replace(f"{func_name}({match})", f"\n\n{result}\n\n")
                except Exception as e:
                    response_text = response_text.replace(f"{func_name}({match})", f"\n\nError executing {func_name}: {str(e)}\n\n")

    return response_text

# Flask app for HTTP server
app = Flask(__name__)

conversation_history = []

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        # Handle the chat
        response = asyncio.run(handle_chat(message, conversation_history))

        # Add to conversation history
        conversation_history.append({"role": "user", "content": message})
        conversation_history.append({"role": "assistant", "content": response})

        # Keep only last 20 messages to avoid context getting too long
        if len(conversation_history) > 40:
            conversation_history[:] = conversation_history[-40:]

        return jsonify({
            'message': response,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

async def handle_chat(message: str, conversation_history: List[Dict[str, Any]] = None) -> str:
    """Handle a chat message and return a response."""
    if conversation_history is None:
        conversation_history = []

    # Add system message if this is the start of conversation
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history
    messages.extend(conversation_history)

    # Add current user message
    messages.append({"role": "user", "content": message})

    # Get response from OpenRouter
    response_text = call_openrouter_api(messages)

    # Process any tool calls in the response
    response_text = process_tool_calls(response_text)

    return response_text

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8087))
    print(f"Starting OpenRouter-based Admin Assistant on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)