// config.js

// NUMBER OF DAYS LOADED INITIALLY - days
export const TIME_OFFSETS = {
    "1Min": 5,
    "5Min": 14,
    "10Min": 30,
    "15Min": 60,
    "30Min": 90,
    "1Hour": 100,
    "1Day": 730,
  };
  
  // NUMBER OF DAYS SHOWN ON CHART - days
  export const TIME_OFFSETS_SLIDER = {
    "1Min": 1,
    "5Min": 1,
    "10Min": 2,
    "15Min": 3,
    "30Min": 4,
    "1Hour": 5,
    "1Day": 365,
  };
  
  // TRADING CALENDAR COLORS
  export const COLOR_EARLY = "rgba(173, 216, 230, 0.25)"; // lightblue
  export const COLOR_LATE = "rgba(144, 238, 144, 0.75)"; // lightgreen
  export const COLOR_CLOSE = "rgba(240, 128, 128, 0.75)"; // lightcoral
  export const COLOR_AFTERMARKET = "rgba(250, 250, 210, 0.75)"; // lightgoldenrodyellow
  export const COLOR_PREMARKET = "rgba(255, 160, 122, 0.75)"; // lightsalmon
  export const COLOR_OPEN = "rgba(224, 255, 255, 0.75)"; // lightcyan
  
  // TIME INTERVALS IN MILLISECONDS
  export const REFRESH_TIME_INTERVAL_MILLISECONDS = {
    "1Min": 60000, // 1 minute in milliseconds
    "5Min": 5 * 60000, // 5 minutes in milliseconds
    "10Min": 10 * 60000, // 10 minutes in milliseconds
    "15Min": 15 * 60000, // 15 minutes in milliseconds
    "30Min": 30 * 60000, // 30 minutes in milliseconds
    "1Hour": 3600000, // 1 hour in milliseconds
    "1Day": 86400000, // 1 day in milliseconds
  };
  
  // TIME ZONES
  export const US_TIME_ZONES = {
    Eastern: { standardOffset: -5, dstOffset: -4 },
    Central: { standardOffset: -6, dstOffset: -5 },
    Mountain: { standardOffset: -7, dstOffset: -6 },
    Pacific: { standardOffset: -8, dstOffset: -7 },
    Alaska: { standardOffset: -9, dstOffset: -8 },
    Hawaii: { standardOffset: -10, dstOffset: -9 },
  };
  
  // SELECTED TIME ZONE
  export const SELECTED_US_TIME_ZONE = "Eastern";
  
  // INTERVAL CONFIGURATION
  export const INTERVAL_CONFIGURATION = {
    INTERVAL_TYPE_DEFAULT: "month",
    INTERVAL_DEFAULT: 1,
    TIME_INTERVAL_DAY: "1Day",
    TIME_INTERVAL_HOUR: "1Hour",
    INTERVALS: {
      SHORT: 1,
      MEDIUM: 2,
      LONG: 3,
      VERY_LONG: 6,
    },
    DATA_POINTS_THRESHOLD: {
      MIN: 50,
      MEDIUM: 120,
      HIGH: 150,
      MAX: 250,
    },
    POLLING_INTERVAL: 100,
  };
  