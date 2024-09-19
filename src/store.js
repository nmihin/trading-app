import { createStore } from 'vuex';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://t7yx43psgl4saxz66zsgu5g7pa0cjvqd.lambda-url.us-east-1.on.aws/',
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
});

// OHLC Data API client
const ohlcApiClient = axios.create({
  baseURL: 'https://tkro364secgv27qhl6nxanlai40klytk.lambda-url.us-east-1.on.aws/',
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
});

// Calendar Data API client
const calendarApiClient = axios.create({
  baseURL: 'https://d5lcfdnnh4aksgmklpg4u54ooa0xqmon.lambda-url.us-east-1.on.aws/',
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
});

// Symbols Handler
const symbolsApiClient = axios.create({
  baseURL: "https://r63efcctpbm5wivss7wgrl6db40jwstl.lambda-url.us-east-1.on.aws/",
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
});

const store = createStore({
  state() {
    return {
      chartData: [], 
      eventsData: [], 
      ohlcData: [],
      calendarData: [], 
      stockData: {}, 
      symbolsData: []
    };
  },
  mutations: {
    setChartData(state, chartData) {
      state.chartData = chartData;
    },
    setEventsData(state, eventsData) {
      state.eventsData = eventsData;
    },
    setOHLCData(state, data) {
      state.ohlcData = data;
    },
    setCalendarData(state, calendarData) {
      state.calendarData = calendarData;
    },
    setSymbolsData(state, symbolsData) {
      state.symbolsData = symbolsData;
    },
  },
  actions: {
    fetchSymbolsData({ commit }) {
      return symbolsApiClient.get('/symbols')
      .then(response => {
        commit('setSymbolsData', response.data);
        return response;
      })
      .catch(error => {
        console.error('Error fetching chart data:', error);
      });
    },
    fetchChartData({ commit }, symbol) {
      if (!symbol) {
        console.error('Symbol is required for fetching chart data');
        return Promise.reject('Symbol is required');
      }
      return apiClient.get('/chartData', {
        params: { symbol: symbol },
      })
      .then(response => {
        commit('setChartData', response.data);
      })
      .catch(error => {
        console.error('Error fetching chart data:', error);
      });
    },
    fetchEventsData({ commit }, symbol) {
      if (!symbol) {
        console.error('Symbol is required for fetching events data');
        return Promise.reject('Symbol is required');
      }

      return apiClient.get('/events', {
        params: { symbol: symbol },
      })
      .then(response => {
        commit('setEventsData', response.data);
      })
      .catch(error => {
        console.error('Error fetching events data:', error);
      });
    },
    fetchOHLCData({ commit }, { ticker, startDate, endDate, interval }) {
      return ohlcApiClient.get('/ohlc', {
        params: {
          symbol: ticker,
          start: startDate,
          end: endDate,
          timeframe: interval,
        },
      })
      .then(response => {
        commit('setOHLCData', response.data);
        return response; // Return the response for chaining
      })
      .catch(error => {
        console.error('Error fetching OHLC data:', error);
        throw error; // Re-throw the error to propagate it
      });
    },
    fetchCalendarData({ commit }, { start, end }) {
      return calendarApiClient.get('/calendar', {
        params: {
          start: start,
          end: end,
        },
      })
      .then(response => {
        commit('setCalendarData', response.data);
        return response; // Return the response for chaining
      })
      .catch(error => {
        console.error('Error fetching calendar data:', error);
        throw error; // Re-throw the error to propagate it
      });
    },
  },
});

export default store;
