# Ticketmaster API Integration Setup

## Getting Your API Key

Follow these steps to enable live concert data on the Events page:

### 1. Create a Ticketmaster Developer Account
Visit: https://developer-acct.ticketmaster.com/user/register
- Fill in your details
- Verify your email address

### 2. Create a New App
- Log in to: https://developer-acct.ticketmaster.com/user/login
- Click **"My Apps"** in the navigation
- Click **"Create New App"**
- Fill in the form:
  - **App Name**: OnChord (or whatever you prefer)
  - **Description**: Music review and concert discovery app
  - **URL**: http://localhost:5173 (or your production URL)

### 3. Get Your API Key
- After creating the app, you'll see your credentials
- Copy the **"Consumer Key"** (this is your API key)
- The API key looks like: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`

### 4. Add to Environment File
Open `.env` and add your key:
```env
VITE_TICKETMASTER_API_KEY=your_consumer_key_here
```

### 5. Restart Development Server
If the server is running, restart it:
```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

## Features Enabled

Once configured, the Events page will:

✅ **Load Real Hip-Hop Events** - Fetches live events from Ticketmaster's database
✅ **Search by Artist** - Search for specific artists' tour dates
✅ **Filter by Location** - Find events in specific cities
✅ **Real Ticket Links** - Direct links to purchase tickets
✅ **Live Pricing** - Real-time ticket price ranges
✅ **Venue Details** - Accurate venue names and addresses

## API Usage Limits

**Free Tier Limits:**
- 5,000 API calls per day
- Rate limit: 5 requests per second

The app automatically:
- Caches results to minimize API calls
- Falls back to sample data if API key is missing
- Shows friendly error messages if limits are exceeded

## Troubleshooting

### "No events found" or seeing sample data?
1. Check that `VITE_TICKETMASTER_API_KEY` is set in `.env`
2. Verify the API key is correct (no extra spaces)
3. Restart the development server
4. Check browser console for error messages

### Rate limit exceeded?
- Wait a few minutes for the rate limit to reset
- The app will automatically fall back to cached/sample data

### API key not working?
- Make sure you're using the **Consumer Key** (not Consumer Secret)
- Verify the key is active in your Ticketmaster developer account
- Try creating a new app and using that key

## API Documentation

For more details, see the official Ticketmaster API docs:
- Discovery API: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- Getting Started: https://developer.ticketmaster.com/products-and-docs/apis/getting-started/

## Support

If you continue having issues:
1. Check the browser console for error messages
2. Verify your API key at: https://developer-acct.ticketmaster.com/
3. Review the Ticketmaster API status: https://developer.ticketmaster.com/support/status/

## Without API Key

The app will still work without a Ticketmaster API key:
- Sample event data will be shown
- All features work with mock data
- You'll see a notification: "Using sample event data"
