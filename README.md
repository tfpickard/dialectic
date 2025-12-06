# Perpetual Dialectic Machine

An endless debate between two AI agents powered by OpenAI, with live WebSocket updates.

## Overview

The Perpetual Dialectic Machine features two AI debaters:

- **Agent Alpha**: A hyper-logical, pedantic contrarian who prizes intellectual precision
- **Agent Beta**: An emotional, rhetorical opponent who challenges framing and appeals to values

These agents are programmed to disagree on everything. When they reach a stalemate, they automatically pivot to a new topic by seizing on minor details from earlier in the conversation.

## Features

- 🔥 **Endless debate**: Agents continue arguing indefinitely (subject to runtime constraints)
- 🎯 **User guidance**: Inject prompts to steer the debate in new directions
- 🔄 **Stalemate detection**: Automatically pivots to new topics when arguments loop
- 💾 **Room persistence**: Debate history is saved and can be resumed later
- ⚡ **Live updates**: HTTP polling for smooth, real-time debate flow
- 🎨 **Clean UI**: Dark-themed interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Vercel Python Functions with OpenAI API
- **Real-time**: HTTP polling (serverless-compatible)
- **Database**: SQLite (stored in `/tmp` for serverless compatibility)

## Prerequisites

- Node.js 18+ and npm
- Python 3.12 (for local development)
- OpenAI API key
- Vercel account (for deployment)

## Local Development Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd dialectic
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

### Testing the Python API locally

The Python backend runs as serverless functions on Vercel, but you can test the logic locally:

```bash
# Install Python dependencies
pip install -r requirements.txt

# The Python functions are in api/debate.py
# They'll be automatically invoked by the Next.js dev server
```

## Usage

1. **Starting a debate**:
   - Click "Resume argument" to start the perpetual debate
   - The agents will begin arguing and continue automatically

2. **Guiding the debate**:
   - Type a prompt in the input box (e.g., "Debate tabs vs spaces")
   - Click "Send" to inject your guidance
   - The agents will incorporate your prompt and continue arguing

3. **Pausing/resuming**:
   - Click "Pause argument" to stop automatic debate rounds
   - Click "Resume argument" to start them again

4. **Starting a new room**:
   - Click "Start new room" to create a fresh debate with a new room ID
   - Your previous room is saved and can be accessed by changing the room ID

## Deployment to Vercel

1. **Install Vercel CLI** (optional)

```bash
npm i -g vercel
```

2. **Connect to Vercel**

```bash
vercel login
```

3. **Deploy**

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

4. **Set environment variables in Vercel**

In your Vercel project settings:
- Go to Settings → Environment Variables
- Add `OPENAI_API_KEY` with your OpenAI API key
- Redeploy if necessary

## Project Structure

```
dialectic/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main page
│   └── globals.css                # Global styles
├── api/
│   └── debate/
│       ├── _shared.py             # Shared utilities and prompts
│       ├── history.py             # GET /api/debate/history
│       └── step.py                # POST /api/debate/step
├── components/
│   ├── ChatMessage.tsx            # Message bubble component
│   └── DebateView.tsx             # Main debate interface (HTTP polling)
├── lib/
│   └── types.ts                   # TypeScript type definitions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── requirements.txt               # Python dependencies
└── README.md
```

## API Endpoints

### GET `/api/debate/history?room_id=<room_id>`

Fetch the message history for a debate room.

**Response:**
```json
{
  "messages": [
    {
      "id": "string",
      "author": "alpha" | "beta" | "user",
      "content": "string",
      "timestamp": 1234567890
    }
  ],
  "room_id": "string"
}
```

### POST `/api/debate/step`

Generate a new debate turn (Alpha and Beta both reply).

**Request body:**
```json
{
  "room_id": "string",
  "user_prompt": "optional string"
}
```

**Response:**
```json
{
  "newMessages": [
    {
      "id": "string",
      "author": "alpha" | "beta",
      "content": "string",
      "timestamp": 1234567890
    }
  ],
  "stalemate_detected": false
}
```

## Configuration

### Agent Personalities

The agent system prompts are defined in `api/debate/_shared.py`:

- `ALPHA_SYSTEM_PROMPT`: Logical, pedantic contrarian
- `BETA_SYSTEM_PROMPT`: Emotional, rhetorical opponent

You can modify these to change the agents' personalities and debate styles.

### Debate Parameters

In `api/debate/_shared.py`, you can adjust:

- `max_messages`: Number of recent messages to include in context (default: 20)
- Model: Currently using `gpt-4-turbo-preview`, can be changed to other OpenAI models
- Temperature: Set to 0.9 for creative, varied responses
- Max tokens: 500 per response

### Polling Interval

In `components/DebateView.tsx`:

- Debate round interval: 4000ms (4 seconds) between automatic rounds
- Adjust the `setInterval` delay in the polling logic to speed up or slow down debates

## Content Safety

The agents are instructed to:

- ✅ Be combative, sarcastic, and use sharp rhetoric
- ✅ Call arguments "stupid," "naive," "childish," etc.
- ✅ Disagree strongly and mock each other's positions
- ❌ NOT use slurs or targeted hate speech
- ❌ NOT make explicit calls for violence
- ❌ NOT target protected classes or real individuals

The tone is "combative but not hateful" - think heated academic debate or political commentary, not harassment.

## Troubleshooting

### API connection issues

- Check browser console for errors and network tab for failed requests
- Verify the API endpoints are accessible (check /api/debate/history and /api/debate/step)
- In local development, ensure Next.js dev server is running
- Check that CORS headers are being sent correctly

### Python API errors

- Verify `OPENAI_API_KEY` is set in environment variables
- Check Vercel function logs for detailed error messages
- Ensure Python dependencies are listed in `requirements.txt`

### Agents not debating

- Check that OpenAI API key is valid and has credits
- Look for error messages in the browser console or Vercel logs
- Try pausing and resuming the debate

### Database issues

- SQLite database is stored in `/tmp` which is ephemeral on Vercel
- For production, consider migrating to Vercel KV or another persistent store
- Debate history may be lost between deployments

## Future Enhancements

- [ ] Persistent database (Vercel KV, PostgreSQL, etc.)
- [ ] Streaming responses from OpenAI for real-time typing effect
- [ ] Multiple debate rooms visible in a list
- [ ] Export debate transcripts
- [ ] Configurable agent personalities via UI
- [ ] Rate limiting and usage tracking
- [ ] Authentication for room ownership
- [ ] Topic suggestions and trending debates

## License

This project is licensed under the Mozilla Public License Version 2.0 - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.