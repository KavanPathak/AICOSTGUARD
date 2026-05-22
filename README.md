# AICostGuard

AICostGuard is a self-hosted, production-grade AI API proxy and telemetry dashboard. It enables developers and teams to route OpenAI chat requests through a secure gateway while measuring cost metrics, token consumption, latencies, error frequencies, and alert triggers in real-time.

---

## Key Features

1. **AI API Proxy:** Connect your standard OpenAI SDK to our custom `/api/proxy/chat` route. The proxy forwards prompts, intercepts usage token data, calculates cost estimates based on model tiers, logs metadata, and forwards the raw completion back to the caller.
2. **Telemetry Dashboard:** Visual widgets showing Total requests, aggregate spend (in USD), average latency trends, and error percentages.
3. **API Key Manager:** Provision keys dynamically per application with custom prefixes. Keys are cryptographically hashed using SHA-256 for optimal security and database lookup speed.
4. **Intelligent Alerts:** Configure threshold triggers for daily spend limits, maximum acceptable request latency, and sliding-window error rates.
5. **Request Log Audit:** Full filterable and paginated table tracking models, HTTP statuses, and full API error messages for swift debugging.

---

## Tech Stack

* **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS (v4), Recharts, React Query, Axios.
* **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, JWT, bcryptjs, Zod, Pino.
* **Database:** PostgreSQL.
* **Hosting Targets:** Vercel (Frontend), Railway or Render (Backend), Supabase (Database).

---

## Project Directory Layout

```text
aicostguard/
 ├── backend/
 │    ├── prisma/          # Prisma database schema definition
 │    ├── src/
 │    │    ├── config/     # Environment configurations loader
 │    │    ├── controllers/# Express route controllers
 │    │    ├── middleware/ # JWT authorization and error handler middlewares
 │    │    ├── routes/     # Express route definitions
 │    │    ├── services/   # Alert checking logic
 │    │    ├── utils/      # Pino logger and Prisma singleton
 │    │    └── index.ts    # Server initialization entrypoint
 │    ├── tsconfig.json
 │    └── package.json
 ├── frontend/
 │    ├── api/            # Axios API configuration
 │    ├── app/            # Next.js App Router (Layouts and Pages)
 │    ├── components/     # React Query providers
 │    ├── context/        # Auth Context and state selector
 │    ├── tsconfig.json
 │    └── package.json
 └── README.md
```

---

## Local Setup & Installation

### Prerequisite

* Node.js (v18 or higher)
* NPM or PNPM
* Local PostgreSQL database running

### 1. Database Setup

Create a database named `aicostguard` in your local PostgreSQL shell:

```sql
CREATE DATABASE aicostguard;
```

### 2. Backend Installation

Navigate to `/backend` directory:

```bash
cd backend
npm install
```

Copy the environment variables template and configure it:

```bash
cp .env.example .env
```

Ensure your `DATABASE_URL` matches your local database credentials:

```ini
DATABASE_URL="postgresql://postgres:password@localhost:5432/aicostguard?schema=public"
PORT=4000
NODE_ENV=development
JWT_SECRET="generate-a-secure-random-secret-key-for-jwt"
OPENAI_API_KEY="sk-proj-your-openai-api-key"
```

Apply Prisma database schema migrations:

```bash
npx prisma migrate dev --name init
```

Start the Express development server:

```bash
npm run dev
```

### 3. Frontend Installation

Navigate to `/frontend` directory:

```bash
cd ../frontend
npm install
```

Start the Next.js dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Production Deployment Guide

### 1. PostgreSQL Database Deploy (Supabase)

1. Create a free account at [Supabase](https://supabase.com).
2. Create a new project named `AICostGuard`.
3. Retrieve your project's Database Connection String (URI format) from **Settings > Database > Connection string > Transaction Mode** or Session Mode.
4. Update your production configuration string. It should look like this:
   `postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

### 2. Backend Deploy (Railway or Render)

#### On Railway:
1. Connect your GitHub repository.
2. Select your repository and select the `/backend` folder.
3. Configure the following **Environment Variables**:
   * `DATABASE_URL` (Supabase Connection String)
   * `PORT` = `4000`
   * `NODE_ENV` = `production`
   * `JWT_SECRET` = `<your-secure-jwt-key>`
   * `OPENAI_API_KEY` = `<your-fallback-openai-api-key>`
4. Set build command:
   ```bash
   npm run build
   ```
5. Set start command:
   ```bash
   npx prisma migrate deploy && npm run start
   ```

#### On Render:
1. Create a new **Web Service**.
2. Set Root Directory to `backend`.
3. Build Command: `npm run build`
4. Start Command: `npx prisma migrate deploy && npm run start`
5. Map the environment variables accordingly.

### 3. Frontend Deploy (Vercel)

1. Import your repository into **Vercel**.
2. Select the `frontend` folder as the project directory.
3. Set the build preset to **Next.js**.
4. Configure the **Environment Variables**:
   * `NEXT_PUBLIC_API_URL` = `<your-deployed-backend-url>` (e.g. `https://aicostguard-backend.up.railway.app`)
5. Click **Deploy**.

---

## Client App Integration Examples

### Node.js Integration

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'acg_live_your_aicostguard_api_key', // Generate this inside the dashboard keys tab
  baseURL: 'https://your-aicostguard-backend.com/api/proxy', // Your proxy endpoint URL
  defaultHeaders: {
    // Optional: override fallback openai keys on the server
    'X-OpenAI-API-Key': 'sk-proj-your-actual-openai-api-key'
  }
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Explain the concept of latency thresholds in 2 sentences.' }
    ]
  });

  console.log(completion.choices[0].message.content);
}

main();
```

### Raw cURL Integration

```bash
curl -X POST https://your-aicostguard-backend.com/api/proxy/chat \
  -H "Authorization: Bearer acg_live_your_aicostguard_api_key" \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-API-Key: sk-proj-your-openai-api-key" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello AICostGuard!"}],
    "temperature": 0.7
  }'
```

---

## Cost Calculation Rules

Pricing is calculated based on exact model tiers per 1,000,000 tokens:

| Model | Input Rate (per 1M tokens) | Output Rate (per 1M tokens) |
|---|---|---|
| **gpt-4o** | $2.50 | $10.00 |
| **gpt-4o-mini** | $0.15 | $0.60 |
| *Others (Fallback)* | $1.50 | $6.00 |

*Estimated cost equation:*
$$\text{Cost} = (\text{prompt\_tokens} \times \text{Input Rate}) + (\text{completion\_tokens} \times \text{Output Rate})$$
