## Frontend Installation

To install FreeBee34, you can use npm or yarn:

```bash
npm install

# Serve the project locally
npm run serve

# Build the project for production
npm run build

# Lint the project
npm run lint

# Configurations

# NUMBER OF DAYS LOADED INITIALY - days
const TIME_OFFSETS = {
  "1Min": 5,
  "5Min": 14,
  "10Min": 30,
  "15Min": 60,
  "30Min": 90,
  "1Hour": 100,
  "1Day": 730,
};

# NUMBER OF DAYS SHOWN ON CHART - day
const TIME_OFFSETS_SLIDER = {
  "1Min": 1,
  "5Min": 1,
  "10Min": 2,
  "15Min": 3,
  "30Min": 4,
  "1Hour": 5,
  "1Day": 365,
};

# TRADING CALENDAR COLORS
const TIME_INTERVAL_MILLISECONDS = {
  "1Min": 60000, // 1 minute in milliseconds
  "5Min": 5 * 60000, // 5 minutes in milliseconds
  "10Min": 10 * 60000, // 10 minutes in milliseconds
  "15Min": 15 * 60000, // 15 minutes in milliseconds
  "30Min": 30 * 60000, // 30 minutes in milliseconds
  "1Hour": 3600000, // 1 hour in milliseconds
  "1Day": 86400000, // 1 day in milliseconds
};

# TIME INTERVALS MILLISECONDS
const US_TIME_ZONES = {
  Eastern: { standardOffset: -5, dstOffset: -4 },
  Central: { standardOffset: -6, dstOffset: -5 },
  Mountain: { standardOffset: -7, dstOffset: -6 },
  Pacific: { standardOffset: -8, dstOffset: -7 },
  Alaska: { standardOffset: -9, dstOffset: -8 },
  Hawaii: { standardOffset: -10, dstOffset: -9 },

```
