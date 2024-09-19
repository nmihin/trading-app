<template>
  <div id="chart" class="container">
    <!-- Main content -->
    <div>
      <div class="row row-margin">
        <!-- TICKER -->
        <div class="col-6">
          <span class="action-label">Stock Ticker:</span>
          <el-autocomplete
            v-model="tickerValue"
            style="width: 300px"
            :fetch-suggestions="querySearchAsync"
            placeholder="Search stock..."
            clearable
            prefix-icon="Search"
            @select="handleSelectTicker"
          >
            <template #default="{ item }">
              <span style="width: 300px">{{ item }}</span>
            </template>
          </el-autocomplete>
        </div>

        <div v-if="timeInterval !== '1Day'" class="col-6 text-right">
          <ul class="legend-trading-time">
            <li class="premarket">Premarket</li>
            <li class="open">Open</li>
            <li class="early">Early</li>
            <li class="late">Late</li>
            <li class="close">Close</li>
            <li class="aftermarket">Aftermarket</li>
          </ul>
        </div>
      </div>
      <div class="row row-margin">
        <!-- INTERVAL -->
        <div class="col-6 text-right">
          <span class="action-label">Time Interval:</span>
          <el-radio-group
            v-model="timeInterval"
            @change="handleIntervalChange(timeInterval)"
          >
            <el-radio-button label="1m" value="1Min" :disabled="loading" />
            <el-radio-button label="5m" value="5Min" :disabled="loading" />
            <el-radio-button label="10m" value="10Min" :disabled="loading" />
            <el-radio-button label="15m" value="15Min" :disabled="loading" />
            <el-radio-button label="30m" value="30Min" :disabled="loading" />
            <el-radio-button label="1h" value="1Hour" :disabled="loading" />
            <el-radio-button label="1D" value="1Day" :disabled="loading" />
          </el-radio-group>
        </div>
        <!-- RANGE -->
        <div class="col-6">
          <div class="block range-picker">
            <el-date-picker
              v-model="datePickerValue"
              type="daterange"
              start-placeholder="Start date"
              end-placeholder="End date"
              format="YYYY-MM-DD HH:mm"
              date-format="YYYY/MM/DD ddd"
              time-format="A hh:mm:ss"
              @change="handleDateChange(datePickerValue)"
            />
          </div>
        </div>
      </div>
      <div class="row row-margin">
        <div class="col-12">
          <!-- Loader -->
          <div class="chart-wrapper">
            <div v-show="dataPoints1.length === 0" class="loader">
              <img src="../../assets/images/loader.svg" alt="loader" />
            </div>
            <div id="chartContainer" :style="styleOptions"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as CanvasJS from "@canvasjs/stockcharts";
import moment from "moment";
import "moment-timezone";
import { ElDatePicker, ElRadioGroup, ElRadioButton } from "element-plus";
import "element-plus/dist/index.css";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import {
  TIME_OFFSETS,
  TIME_OFFSETS_SLIDER,
  COLOR_EARLY,
  COLOR_LATE,
  COLOR_CLOSE,
  COLOR_AFTERMARKET,
  COLOR_PREMARKET,
  COLOR_OPEN,
  REFRESH_TIME_INTERVAL_MILLISECONDS,
  US_TIME_ZONES,
  SELECTED_US_TIME_ZONE,
  INTERVAL_CONFIGURATION,
} from "./../../config.js";

export default {
  name: "LandingPage",
  components: {
    ElDatePicker,
    ElRadioGroup,
    ElRadioButton,
  },
  props: {
    chartData: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      tickerValue: "TSLA",
      datePickerValue: [],
      timeInterval: "1Day",
      loading: true,
      chart: null,
      styleOptions: {
        width: "100%",
        height: "780px",
      },
      dateChangedOnce: false,
      dataPoints1: [],
      dataPoints3: [],
      localChartData: [],
      ohlcData: [],
      diffInDays: 0,
      localCalendarData: [],
      wheelEventListenerAdded: false,
      timeZone: SELECTED_US_TIME_ZONE,
      intervalIdStripLines: null,
      symbolsData: [],
      // SHOW/HIDE tooltipCustomValue(s)
      tooltipCustomValue: true, // false is invisible
      // ADD TOOLTIP TITLE HERE
      tooltipAdditionalTitle: "Additional Info: ",
      // ADD TOOLTIP VALUE HERE
      tooltipAdditionalValue: undefined, // "undefined" is invisible
    };
  },
  mounted() {
    // CHECK OFFSET LOCAL USER TIME ZONE
    this.retrieveTickerValue();
    this.adjustUSTimeZones();
    const dataPromises = [this.fetchChartData(), this.fetchOHLCData()];

    // Wait for all data fetching promises to resolve
    Promise.all(dataPromises)
      .then(() => {
        const intervalId = setInterval(() => {
          // Check if all necessary properties are defined to avoid TypeError
          if (this.localChartData.length > 0) {
            // All data fetching methods have completed
            this.fetchSymbolsData(),
              this.fetchCalendarData(),
              this.initializeChart();

            this.fetchData(this.timeInterval);

            this.startDynamicInterval();
            //TEST - reload
            /*
            setTimeout(() => {
              this.handleIntervalChange();
            }, 10000); // 10 seconds timeout
            */

            this.loading = false;

            clearInterval(intervalId);
          }
        }, 1000);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toastr.error("Error loading data");
        this.loading = false; // Ensure loading is set to false even if there's an error
      });
  },
  computed: {
    mainChartData() {
      return this.localChartData;
    },
  },
  methods: {
    startDynamicInterval() {
      // Clear existing dynamic interval if any
      if (this.dynamicInterval) {
        clearInterval(this.dynamicInterval);
      }

      // Set interval based on this.timeInterval
      const intervalMilliseconds = this.getIntervalMilliseconds();

      this.dynamicInterval = setInterval(() => {
        this.handleDynamicIntervalChange();
      }, intervalMilliseconds);
    },
    handleDynamicIntervalChange() {
      // Implement your logic for handling changes in the dynamic interval
      console.log(`Handling dynamic interval change for ${this.timeInterval}`);
      this.handleIntervalChange();
      // Example: Fetch data or perform actions based on this.timeInterval
      this.fetchData(this.timeInterval);
    },
    adjustUSTimeZones() {
      const localTimeZone = moment.tz.guess(); // Get the local time zone using moment-timezone library
      const localOffset = moment().tz(localTimeZone).utcOffset() / 60;

      // Define a mapping of local offsets to target offsets
      const offsetMap = {
        12: { standardOffset: -16, dstOffset: -16 },
        11: { standardOffset: -15, dstOffset: -15 },
        10: { standardOffset: -14, dstOffset: -14 },
        9: { standardOffset: -13, dstOffset: -13 },
        8: { standardOffset: -12, dstOffset: -12 },
        7: { standardOffset: -11, dstOffset: -12 },
        6: { standardOffset: -10, dstOffset: -10 },
        5: { standardOffset: -9, dstOffset: -9 },
        4: { standardOffset: -8, dstOffset: -8 },
        3: { standardOffset: -7, dstOffset: -7 },
        2: { standardOffset: -6, dstOffset: -6 },
        1: { standardOffset: -5, dstOffset: -5 },
        0: { standardOffset: -4, dstOffset: -4 },
        "-1": { standardOffset: -3, dstOffset: -3 },
        "-2": { standardOffset: -2, dstOffset: -2 },
        "-3": { standardOffset: -1, dstOffset: -1 },
        "-4": { standardOffset: 0, dstOffset: 0 },
        "-5": { standardOffset: 1, dstOffset: 1 },
        "-6": { standardOffset: 2, dstOffset: 2 },
        "-7": { standardOffset: 3, dstOffset: 3 },
        "-8": { standardOffset: 4, dstOffset: 4 },
        "-9": { standardOffset: 5, dstOffset: 5 },
        "-10": { standardOffset: 6, dstOffset: 6 },
        "-11": { standardOffset: 7, dstOffset: 7 },
        "-12": { standardOffset: 8, dstOffset: 8 },
      };

      // Apply adjustments based on the local offset
      const adjustment = offsetMap[localOffset];
      if (adjustment) {
        for (let tz in US_TIME_ZONES) {
          US_TIME_ZONES[tz].standardOffset = adjustment.standardOffset;
          US_TIME_ZONES[tz].dstOffset = adjustment.dstOffset;
        }
      }
    },
    getLocalTimeZoneOffset() {
      const now = new Date();
      return now.getTimezoneOffset() / 60; // Convert to hours and negate to match the US_TIME_ZONES convention
    },
    addWheelZoom() {
      const stockChart = this.chart;
      stockChart.charts[0].container.addEventListener("wheel", function (e) {
        //e.preventDefault();
        this.wheelEventListenerAdded = true;

        let slider = stockChart.navigator.slider;
        let sliderMinimum = slider.get("minimum"),
          sliderMaximum = slider.get("maximum");

        let interval = (slider.get("maximum") - slider.get("minimum")) / 50; // change interval based on the range of slider
        let newMin, newMax;

        if (e.deltaY < 0) {
          newMin = sliderMinimum + interval;
          newMax = sliderMaximum - interval;
        } else if (e.deltaY > 0) {
          newMin = sliderMinimum - interval;
          newMax = sliderMaximum + interval;
        }

        if (
          newMax < stockChart.navigator.axisX[0].get("maximum") ||
          newMin > stockChart.navigator.axisX[0].get("minimum")
        ) {
          stockChart.navigator.slider.set("minimum", newMin, false);
          stockChart.navigator.slider.set("maximum", newMax);
        }
      });
    },
    saveTickerValue() {
      localStorage.setItem("tickerValue", this.tickerValue);
    },
    retrieveTickerValue() {
      const savedTickerValue = localStorage.getItem("tickerValue");
      if (savedTickerValue) {
        this.tickerValue = savedTickerValue;
      }
    },
    removeWeekendGapAndNoDataHours(stockChart) {
      if (
        !stockChart ||
        !stockChart.options ||
        !stockChart.options.charts ||
        !stockChart.options.charts[0].data
      ) {
        return;
      }

      const scaleBreaks = [];
      const dps = stockChart.options?.charts[0].data[0].dataPoints;

      const intervalMillis =
        REFRESH_TIME_INTERVAL_MILLISECONDS[this.timeInterval];

      for (let i = 1; i < dps.length; i++) {
        const current = new Date(dps[i].x);
        const previous = new Date(dps[i - 1].x);

        const timeDiff = current - previous;

        // Check if there is a gap greater than the expected interval
        if (
          timeDiff > intervalMillis ||
          current.getDay() !== previous.getDay()
        ) {
          let startValue, endValue;

          if (
            ["1Min", "5Min", "10Min", "15Min", "30Min", "1Hour"].includes(
              this.timeInterval
            )
          ) {
            startValue = new Date(previous.getTime() + intervalMillis / 2);
            endValue = new Date(current.getTime() - intervalMillis / 2);

            // Ensure breaks are at least 1 minute apart
            if (endValue - startValue < 60000) {
              startValue = new Date(previous.getTime() + 60000);
              endValue = new Date(current.getTime() - 60000);
            }
          } else if (this.timeInterval === "1Day") {
            /*
            startValue = (new Date(previous.getTime()), "MMM DD YYYY");
            endValue = (new Date(current.getTime()), "MMM DD YYYY");
            */

            startValue = new Date(previous.getTime() + 12 * 60 * 60 * 1000); // 12 hours
            endValue = new Date(current.getTime() - 12 * 60 * 60 * 1000); // 12 hours
          }

          if (scaleBreaks.length > 0) {
            const lastBreak = scaleBreaks[scaleBreaks.length - 1];
            if (startValue <= lastBreak.endValue) {
              startValue = new Date(lastBreak.endValue.getTime() + 60000); // 1 minute after the last break end
            }
          }

          if (startValue < endValue) {
            if (this.timeInterval === "1Hour") {
              const startValueMills = startValue.getTime();
              const endValueMills = endValue.getTime();
              const difference = endValueMills - startValueMills;

              if (difference >= 3600000) {
                scaleBreaks.push({ startValue, endValue });
              }
            } else {
              scaleBreaks.push({ startValue, endValue });
            }
          }
        }
      }

      stockChart.options.charts[0].axisX.scaleBreaks.customBreaks = scaleBreaks;
      this.chart.render();
      this.addStriplinesToEvents();
      setTimeout(() => {
        this.addStriplinesToEvents();
      }, 3000); // 3 seconds timeout
      return;
    },
    formatDate(date) {
      const tzOffset = date.getTimezoneOffset();
      const tzOffsetHours = Math.abs(Math.floor(tzOffset / 60))
        .toString()
        .padStart(2, "0");
      const tzOffsetMinutes = Math.abs(tzOffset % 60)
        .toString()
        .padStart(2, "0");
      const tzSign = tzOffset <= 0 ? "+" : "-";

      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
        .getHours()
        .toString()
        .padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${date
        .getSeconds()
        .toString()
        .padStart(2, "0")}${tzSign}${tzOffsetHours}:${tzOffsetMinutes}`;

      return formattedDate;
    },
    addMarketTimeStriplines(data) {
      // Define colors for different types
      const colors = {
        early: COLOR_EARLY,
        late: COLOR_LATE,
        close: COLOR_CLOSE,
        aftermarket: COLOR_AFTERMARKET,
        premarket: COLOR_PREMARKET,
        open: COLOR_OPEN,
      };

      // Map the response data to strip lines
      const newStripLines = data.map((item) => {
        return {
          startValue: new Date(item.start),
          endValue: new Date(item.end),
          color: colors[item.type] || "lightgray", // default color if type not found
          lineDashType: "line",
          lineThickness: 10,
          labelWrap: false,
        };
      });

      this.chart.options.charts[0].axisX.stripLines = newStripLines;
    },
    addQuarterlyReportsOnTooltip(calendarData) {
      const localOffset = moment().utcOffset() / 60;

      const adjustDateTimeZone = (dateTimeString, offsetHours) => {
        const localTimeZone = moment.tz.guess();
        const targetTimeZone = "America/New_York";
        const localMoment = moment.tz(dateTimeString, localTimeZone);
        const adjustedMoment = localMoment.clone().tz(targetTimeZone);

        return adjustedMoment
          .add(offsetHours, "hours")
          .format("YYYY-MM-DDTHH:mm:ss");
      };

      this.dataPoints1.forEach((dataPoint) => {
        // Adjust the dataPoint date with the local offset
        let adjustedDataPointDate = adjustDateTimeZone(
          dataPoint.x,
          localOffset
        );
        let dataPointDate = new Date(adjustedDataPointDate);

        // Initialize customValueEarningsTooltip if it doesn't exist
        if (
          !Object.prototype.hasOwnProperty.call(
            dataPoint,
            "customValueEarningsTooltip"
          )
        ) {
          dataPoint.customValueEarningsTooltip = "";
        }

        // Loop through calendarData to find matching dates based on the event date range
        calendarData.forEach((event) => {
          // Adjust event start and end dates with the local offset
          let adjustedEventStartDate = adjustDateTimeZone(
            event.start,
            localOffset
          );
          let adjustedEventEndDate = adjustDateTimeZone(event.end, localOffset);

          let startDate = new Date(adjustedEventStartDate);
          let endDate = new Date(adjustedEventEndDate);

          // Check if dataPointDate falls within the start and end dates of the event
          if (dataPointDate >= startDate && dataPointDate <= endDate) {
            // Assuming you want to add some information to tooltip here
            // For example, adding event name to customValueEarningsTooltip
            let capitalizedEventName =
              event.name.charAt(0).toUpperCase() + event.name.slice(1);
            dataPoint.customValueEarningsTooltip = capitalizedEventName;
          }
        });
      });
    },

    fetchCalendarData() {
      if (this.timeInterval === "1Day") {
        return;
      }

      let startDateFormatted = this.formatDate(
        new Date(this.datePickerValue[0])
      );
      const endDateFormatted = this.formatDate(
        new Date(this.datePickerValue[1])
      );

      if (this.dateChangedOnce) {
        const historicalStartDate = new Date(this.datePickerValue[0]);
        const historicalEndDate = new Date(this.datePickerValue[1]);

        // Calculate historical start and end dates for the past range
        const diffInDays =
          (historicalEndDate - historicalStartDate) / (1000 * 60 * 60 * 24);
        const historicalStartDatePast = new Date(historicalStartDate);
        historicalStartDatePast.setDate(
          historicalStartDatePast.getDate() - diffInDays
        );

        // Update startDateFormatted and endDateFormatted for historical range
        startDateFormatted = this.formatDate(historicalStartDatePast);
      }

      this.$store
        .dispatch("fetchCalendarData", {
          start: startDateFormatted,
          end: endDateFormatted,
        })
        .then((response) => {
          this.addMarketTimeStriplines(response.data);
          this.localCalendarData = response.data;

          // Render the chart
          this.chart.render();
        })
        .catch((error) => {
          console.error("Error fetching calendar data:", error);
          toastr.error("Error loading calendar data");
        });
    },
    fetchSymbolsData() {
      this.$store
        .dispatch("fetchSymbolsData")
        .then((response) => {
          this.symbolsData = response.data;
        })
        .catch((error) => {
          console.error("Error fetching calendar data:", error);
          toastr.error("Error loading symbols data");
        });
    },
    fetchOHLCData(offset) {
      let timeOffset = TIME_OFFSETS[this.timeInterval] || 365;

      if (offset !== undefined && offset !== null) {
        timeOffset = offset;
      }

      const today = new Date();
      let firstDate = new Date(today);
      firstDate.setDate(today.getDate() - timeOffset);
      const lastDate = new Date(today);
      if (!offset) {
        this.datePickerValue = [firstDate, lastDate];
      }

      let timeOffsetZoom = TIME_OFFSETS_SLIDER[this.timeInterval] || 365;

      const firstDateZoom = new Date(today);
      firstDateZoom.setDate(today.getDate() - timeOffsetZoom);
      firstDate = firstDateZoom;

      const { tickerValue, datePickerValue, timeInterval } = this;

      let startDateFormatted = this.formatDate(new Date(datePickerValue[0]));
      let endDateFormatted = this.formatDate(new Date(datePickerValue[1]));

      if (this.dateChangedOnce) {
        const historicalStartDate = new Date(datePickerValue[0]);
        const historicalEndDate = new Date(datePickerValue[1]);

        // Calculate historical start and end dates for the past range
        const diffInDays =
          (historicalEndDate - historicalStartDate) / (1000 * 60 * 60 * 24);
        const historicalStartDatePast = new Date(historicalStartDate);
        historicalStartDatePast.setDate(
          historicalStartDatePast.getDate() - diffInDays
        );

        // Update startDateFormatted and endDateFormatted for historical range
        startDateFormatted = this.formatDate(historicalStartDatePast);
      }

      // Start the fetch operation
      const fetchPromise = this.$store.dispatch("fetchOHLCData", {
        ticker: tickerValue,
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        interval: timeInterval,
      });

      // Setup timeout
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error("Fetch operation timed out"));
        }, 10000); // 10 seconds timeout
      });

      // Race between fetch and timeout
      Promise.race([fetchPromise, timeoutPromise])
        .then((response) => {
          const formattedData = response.data.map((item) => ({
            date: item.datetime,
            open: Number(item.open).toFixed(2),
            high: Number(item.high).toFixed(2),
            low: Number(item.low).toFixed(2),
            close: Number(item.close).toFixed(2),
          }));

          this.ohlcData = formattedData;
        })
        .catch((error) => {
          console.error("Error fetching OHLC data:", error);
          toastr.error("Error loading OHLC data");
        });
    },
    timestampToFormattedDate(timestamp) {
      const date = new Date(timestamp);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    getGMTOffset() {
      // Get current date
      const now = new Date();

      // Get local timezone offset in minutes
      const localOffset = now.getTimezoneOffset();

      // Convert local offset to hours and minutes
      const localOffsetHours = Math.abs(Math.floor(localOffset / 60));
      const localOffsetMinutes = Math.abs(localOffset % 60);

      // Determine if local time is ahead or behind GMT
      const isAheadOfGMT = localOffset > 0; // True if local time is ahead of GMT, false if behind

      return {
        hours: localOffsetHours,
        minutes: localOffsetMinutes,
        isAheadOfGMT: isAheadOfGMT,
      };
    },
    getStandardOffset(timeZone) {
      return US_TIME_ZONES[timeZone]?.standardOffset ?? null;
    },
    getDSTOffset(timeZone) {
      return US_TIME_ZONES[timeZone]?.dstOffset ?? null;
    },
    initializeChart(offset) {
      this.dataPoints1 = [];
      this.dataPoints3 = [];

      let timeOffset = TIME_OFFSETS[this.timeInterval] || 365;
      let timeOffsetZoom = TIME_OFFSETS_SLIDER[this.timeInterval] || 365;

      if (offset !== undefined && offset !== null) {
        timeOffset = offset;
        timeOffsetZoom = offset;
      }

      const today = new Date();
      const firstDate = new Date(today);
      firstDate.setDate(today.getDate() - timeOffset);
      const lastDate = new Date(today);

      let firstDateZoom;

      if (
        this.dateChangedOnce &&
        this.datePickerValue &&
        this.datePickerValue.length === 2
      ) {
        const startDate = new Date(this.datePickerValue[0]);
        firstDateZoom = new Date(startDate); // Use startDate directly

        firstDateZoom.setHours(0, 0, 0, 0);
      } else {
        firstDateZoom = new Date(today);
        firstDateZoom.setDate(today.getDate() - timeOffsetZoom);
      }

      if (!offset) {
        this.datePickerValue = [firstDate, lastDate];
      }

      if (offset !== undefined && offset !== null) {
        timeOffsetZoom = offset * -1; // Adjust the offset direction
      }

      const that = this;

      const formatDateWithOffset = (date, format) => {
        let utcTimestamp = date.getTime();

        let offset = that.getStandardOffset(that.timeZone);

        let jan = new Date(date.getFullYear(), 0, 1);
        let jul = new Date(date.getFullYear(), 6, 1);
        let stdTimezoneOffset = Math.max(
          jan.getTimezoneOffset(),
          jul.getTimezoneOffset()
        );

        if (date.getTimezoneOffset() < stdTimezoneOffset) {
          offset = that.getDSTOffset(that.timeZone);
        }

        let nyTimestamp = utcTimestamp + offset * 60 * 60 * 1000;
        let nyDate = new Date(nyTimestamp);

        return CanvasJS.formatDate(nyDate, format);
      };

      const getLabelFormatter = () => {
        switch (this.timeInterval) {
          case "1Min":
          case "5Min":
          case "10Min":
          case "15Min":
          case "30Min":
            return function (e) {
              return formatDateWithOffset(new Date(e.value), "HH:mm");
            };
          case "1Hour":
            return function (e) {
              return formatDateWithOffset(new Date(e.value), "HH:mm");
            };
          case "1Day":
            return function (e) {
              return formatDateWithOffset(new Date(e.value), "MMM DD YYYY");
            };
          default:
            return function (e) {
              return formatDateWithOffset(new Date(e.value), "MMM DD YYYY");
            };
        }
      };

      // Sample data point array to demonstrate filtering
      const dataPoints = [
        // Your data points here
      ];

      const filterDataPoints = (dataPoints) => {
        return dataPoints.filter((point) => {
          const timeString = point.formatedDateTime.split(" ")[3]; // Extract the time part
          const hour = parseInt(timeString.split(":")[0]); // Extract the hour part
          return hour < 8 || hour >= 20; // Include only if outside 08:00 to 20:00 range
        });
      };

      // Filter data points
      this.dataPoints1 = filterDataPoints(dataPoints);
      this.dataPoints3 = filterDataPoints(dataPoints);

      this.chart = new CanvasJS.StockChart("chartContainer", {
        exportEnabled: true,
        rangeChanged: function (e) {
          const formattedMinDate = that.timestampToFormattedDate(e.minimum);
          const formattedMaxDate = that.timestampToFormattedDate(e.maximum);
          that.datePickerValue = [
            new Date(formattedMinDate),
            new Date(formattedMaxDate),
          ];
        },
        charts: [
          {
            toolTip: {
              shared: true,
            },
            zoomEnabled: false,
            axisX: {
              labelMaxWidth: 100,
              lineThickness: 1,
              tickLength: 5,
              labelFormatter: getLabelFormatter(),
              labelFontSize: 12,
              crosshair: {
                enabled: true,
                snapToDataPoint: false,
                labelFormatter: getLabelFormatter(),
              },
              scaleBreaks: {
                spacing: 0,
                lineThickness: 0,
                //customBreaks: scaleBreaks,
              },
              gridThickness: 1,
              gridColor: "#eee",
            },
            axisY2: {
              labelFontSize: 14,
              gridThickness: 1,
              gridColor: "#eee",
              labelMaxWidth: 100, // Adjust according to the widest number expected
              width: 100, // Match labelMaxWidth for consistency
              labelTextAlign: "right",
              labelAutoFit: true,
              labelWrap: true,
              labelPlacement: "outside",
              labelFormatter: function (e) {
                return CanvasJS.formatNumber(e.value, "#,####.0");
              },
            },
            legend: {
              verticalAlign: "top",
              horizontalAlign: "left",
            },
            data: [
              {
                yValueFormatString: "#,###.00",
                axisYType: "secondary",
                type: "candlestick",
                risingColor: "green",
                fallingColor: "red",
                dataPoints: this.dataPoints1,
                toolTipContent:
                  "<div class='tooltip-content'>\n" +
                  "  <span class='tooltip-date'>Date: {formatedDateTime}</span>\n" +
                  "  <span class='tooltip-values'>Open: {y[0]}</span>\n" +
                  "  <span class='tooltip-values'>High: {y[1]}</span>\n" +
                  "  <span class='tooltip-values'>Low: {y[2]}</span>\n" +
                  "  <span class='tooltip-values'>Close: {y[3]}</span>\n" +
                  // "  <span class='tooltip-values'>Additional Info: {y[4]}</span>\n" + // - uncomment to see VOLUME method populateDataPoints()
                  "  <span class='" +
                  this.tooltipCustomValue +
                  "'>{customValueEarningsTooltip}</span>\n" +
                  "  <span class='" +
                  this.tooltipAdditionalValue +
                  "'>" +
                  this.tooltipAdditionalTitle +
                  this.tooltipAdditionalValue +
                  "</span>\n" +
                  "</div>",
              },
            ],
          },
        ],
        rangeSelector: {
          enabled: false,
        },
        navigator: {
          height: 0,
          data: [
            {
              color: "grey",
              dataPoints: this.dataPoints3,
            },
          ],
          slider: {
            enabled: false,
            minimum: firstDateZoom,
            maximum: lastDate,
          },
        },
      });
    },
    fetchData() {
      this.populateDataPoints(this.ohlcData);
    },
    fetchChartData() {
      this.$store
        .dispatch("fetchChartData", this.tickerValue)
        .then(() => {
          this.localChartData = this.$store.state.chartData;
          // TODO - async to all data loaded
          setTimeout(() => {
            this.addQuarterlyReportsOnTooltip(this.localChartData);
          }, 3000);
        })
        .catch((error) => {
          console.error("Error fetching chart data:", error);
          toastr.error("Error loading chart data");
        });
    },
    populateDataPoints(data) {
      const addedIndexLabels = new Set();

      const localOffset = moment().utcOffset() / 60;

      const adjustDateTimeZone = (dateTimeString, offsetHours) => {
        const localTimeZone = moment.tz.guess();
        const targetTimeZone = "America/New_York";
        const localMoment = moment.tz(dateTimeString, localTimeZone);
        const adjustedMoment = localMoment.clone().tz(targetTimeZone);

        offsetHours = 0;

        return adjustedMoment
          .add(offsetHours, "hours")
          .format("MMM DD YY HH:mm");
      };

      for (let i = 0; i < data.length; i++) {
        const currentDate = new Date(data[i].date);
        const currentDateString = `${currentDate.getFullYear()}-${
          currentDate.getMonth() + 1
        }-${currentDate.getDate()}`;

        let indexLabel = null;

        if (!addedIndexLabels.has(currentDateString)) {
          const earningsReport = this.localChartData.find((item) => {
            const startDate = new Date(item.start);
            if (this.timeInterval === "1Day") {
              return (
                startDate.getFullYear() === currentDate.getFullYear() &&
                startDate.getMonth() === currentDate.getMonth() &&
                startDate.getDate() === currentDate.getDate()
              );
            } else {
              return (
                startDate.getFullYear() === currentDate.getFullYear() &&
                startDate.getMonth() === currentDate.getMonth() &&
                startDate.getDate() === currentDate.getDate() &&
                startDate.getHours() === currentDate.getHours()
              );
            }
          });

          if (earningsReport) {
            indexLabel = this.tickerValue + ":" + earningsReport.name;
            addedIndexLabels.add(currentDateString);
          }
        }

        const formattedDateTime = adjustDateTimeZone(
          moment(data[i].date).format("YYYY-MM-DDTHH:mm:ss"),
          localOffset
        );

        this.dataPoints1.push({
          x: currentDate,
          y: [
            Number(data[i].open),
            Number(data[i].high),
            Number(data[i].low),
            Number(data[i].close),
            //Number(data[i].VOLUME), // uncomment to add other properties to tooltip such as VOLUME
          ],
          customValueTooltip: undefined, // replace by Number(data[i].xxx),
          indexLabel: indexLabel,
          indexLabelWrap: true,
          indexLabelFontSize: 0, // 0 is invisible
          indexLabelPlacement: "inside",
          indexLabelOrientation: "horizontal",
          indexLabelFontColor: "#000000",
          indexLabelBackgroundColor: "rgba(255, 255, 255, 0.7)",
          color: data[i].open < data[i].close ? "green" : "red",
          indexValue: i,
          formatedDateTime: formattedDateTime,
        });

        this.dataPoints3.push({
          x: currentDate,
          y: Number(data[i].close),
        });
      }

      this.removeWeekendGapAndNoDataHours(this.chart);
    },
    addStriplinesToEvents() {
      const promise = new Promise((resolve) => {
        const intervalId = setInterval(() => {
          if (this.chart && this.chart.options) {
            clearInterval(intervalId);
            resolve();
          }
        }, 100);
      });

      promise.then(() => {
        const stripLines = [
          ...(this.chart.options.charts[0].axisX.stripLines || []),
        ];

        let timeOffsetZoom = TIME_OFFSETS_SLIDER[this.timeInterval] || 365;

        let offsetHours;
        switch (true) {
          case this.dataPoints1.length > 500:
            offsetHours = 10;
            break;
          case this.dataPoints1.length > 300:
            offsetHours = 7;
            break;
          case this.dataPoints1.length >= 100 && this.dataPoints1.length <= 300:
            offsetHours = 4;
            break;
          case this.dataPoints1.length >= 50 && this.dataPoints1.length <= 100:
            offsetHours = 2;
            break;
          case this.dataPoints1.length >= 25 && this.dataPoints1.length <= 50:
            offsetHours = 0.6;
            break;
          case this.dataPoints1.length >= 15 && this.dataPoints1.length <= 25:
            offsetHours = 0.4;
            break;
          case this.dataPoints1.length <= 15:
            offsetHours = 0.2;
            break;
          default:
            offsetHours = 1;
            break;
        }

        // TESTING
        if (
          timeOffsetZoom === 1 ||
          timeOffsetZoom === 2 ||
          timeOffsetZoom === 3 ||
          timeOffsetZoom === 4 ||
          timeOffsetZoom === 5 ||
          timeOffsetZoom === 6
        ) {
          offsetHours = 0.1;
        }

        this.dataPoints1.forEach((dataPoint) => {
          if (dataPoint.indexLabel) {
            const currentMoment = moment(dataPoint.x);
            const nextHourMoment = currentMoment
              .clone()
              .add(offsetHours, "hours");

            stripLines.push({
              startValue: currentMoment.toDate(),
              endValue: nextHourMoment.toDate(),
              showOnTop: true,
              color: "gray",
              lineDashType: "dot",
              thickness: 1,
              labelWrap: true,
            });
          }
        });

        this.chart.options.charts[0].axisX.stripLines = stripLines; // Assign the updated strip lines array
        this.chart.render(); // You may not need to render here depending on your application flow
      });
    },
    isLaterThanToday(date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set today's time to the start of the day
      return date > today;
    },
    handleDateChange(value) {
      if (value.length === 2) {
        this.dateChangedOnce = true;
        const minimumDate = new Date(value[0]);
        const maximumDate = new Date(value[1]);

        if (this.isLaterThanToday(maximumDate)) {
          toastr.error("The selected end date is out of range.");
          return; // Exit the function or perform other necessary actions
        }

        const diffInMilliseconds = maximumDate - minimumDate;

        this.diffInDays = diffInMilliseconds / (24 * 60 * 60 * 1000);

        this.fetchOHLCData(this.diffInDays);
        this.fetchChartData();
        this.fetchCalendarData();

        this.initializeChart(this.diffInDays);
      }
    },
    handleIntervalChange() {
      this.loading = true;
      this.clearAllChartData();

      // CHECK OFFSET LOCAL USER TIME ZONE
      //const localOffset = this.getLocalTimeZoneOffset();
      this.adjustUSTimeZones();
      this.retrieveTickerValue();

      const minimumDate = new Date(this.datePickerValue[0]);
      const maximumDate = new Date(this.datePickerValue[1]);

      const diffInMilliseconds = maximumDate - minimumDate;

      let diffInDays = diffInMilliseconds / (24 * 60 * 60 * 1000);

      // CHECK IF RANGE CHANGED
      if (!this.dateChangedOnce) {
        diffInDays = undefined;
      }

      const dataPromises = [
        this.fetchChartData(),
        this.fetchOHLCData(diffInDays),
      ];

      // Wait for all data fetching promises to resolve
      Promise.all(dataPromises)
        .then(() => {
          const intervalId = setInterval(() => {
            // Check if all necessary properties are defined to avoid TypeError
            if (this.localChartData.length > 0) {
              // All data fetching methods have completed
              this.fetchCalendarData();
              this.initializeChart(diffInDays);

              this.fetchData(this.timeInterval);

              if (!this.wheelEventListenerAdded) {
                this.addWheelZoom();
              }

              this.startDynamicInterval();
              this.loading = false;

              clearInterval(intervalId);
            }
          }, 1000);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          toastr.error("Error loading data");
          this.loading = false; // Ensure loading is set to false even if there's an error
        });
    },
    getCalendarDataIfNotLoaded() {
      // Initialize an interval that runs every second
      const intervalId = setInterval(() => {
        // Check if all necessary properties are defined to avoid TypeError
        if (
          this.chart &&
          this.chart.options &&
          this.chart.options.charts &&
          this.chart.options.charts.length > 0 &&
          this.chart.options.charts[0].axisX &&
          this.chart.options.charts[0].axisX.stripLines &&
          this.chart.options.charts[0].axisX.stripLines.length > 0 &&
          this.chart.options.charts[0].axisX.stripLines[0].labelWrap !==
            undefined
        ) {
          // Now it's safe to access this.chart.options.charts[0].axisX.stripLines[0].labelWrap
          const areStripLinesColors =
            this.chart.options.charts[0].axisX.stripLines[0].labelWrap;

          // Check the condition
          if (areStripLinesColors) {
            this.fetchCalendarData();
            clearInterval(intervalId); // Clear the interval if condition is met
            console.log("Clear interval....");
            this.fetchData(this.timeInterval);
          }
        }
      }, 1000);
    },
    clearAllChartData() {
      this.chart = null;
      this.dataPoints1 = [];
      this.dataPoints3 = [];
      this.ohlcData = [];
    },
    handleSelectTicker(ticker) {
      this.loading = true;
      this.tickerValue = ticker;

      this.clearAllChartData();
      this.fetchOHLCData();
      this.fetchCalendarData();
      this.fetchChartData();

      this.initializeChart();
      this.fetchData(this.timeInterval);
      this.saveTickerValue();
      this.loading = false;
    },

    async querySearchAsync(queryString, callback) {
      if (queryString) {
        const savedTickerValue = localStorage.getItem("tickerValue");
        if (savedTickerValue) {
          if (queryString === savedTickerValue) {
            return;
          }
        }

        const results = this.symbolsData.filter((ticker) => {
          const query = queryString.toLowerCase();
          return ticker.toLowerCase().includes(query);
        });

        this.filteredTickers = results;
        callback(results);

        if (results.length === 1) {
          this.handleSelectTicker(results[0]);
        }
      } else {
        callback([]);
      }
    },
    getIntervalMilliseconds() {
      return REFRESH_TIME_INTERVAL_MILLISECONDS[this.timeInterval] || 86400000;
    },
  },
  watch: {
    dataPoints1: {
      handler(newDataPoints) {
        let intervalType = INTERVAL_CONFIGURATION.INTERVAL_TYPE_DEFAULT;
        let interval = INTERVAL_CONFIGURATION.INTERVAL_DEFAULT;

        if (this.timeInterval !== INTERVAL_CONFIGURATION.TIME_INTERVAL_DAY) {
          intervalType = "hour";
          interval = INTERVAL_CONFIGURATION.INTERVAL_DEFAULT;
        }

        if (newDataPoints.length > 0) {
          const promise = new Promise((resolve) => {
            const intervalId = setInterval(() => {
              if (this.chart && this.chart.options) {
                clearInterval(intervalId);
                resolve();
              }
            }, INTERVAL_CONFIGURATION.POLLING_INTERVAL);
          });

          promise.then(() => {
            if (
              this.timeInterval !== INTERVAL_CONFIGURATION.TIME_INTERVAL_DAY
            ) {
              if (!this.dateChangedOnce) {
                interval = INTERVAL_CONFIGURATION.INTERVAL_DEFAULT;
              } else {
                if (
                  this.dataPoints1.length >
                    INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.MIN &&
                  this.dataPoints1.length <
                    INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.MEDIUM
                ) {
                  interval = INTERVAL_CONFIGURATION.INTERVALS.SHORT;
                }
                if (
                  this.dataPoints1.length >=
                    INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.MEDIUM &&
                  this.dataPoints1.length <
                    INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.HIGH
                ) {
                  interval = INTERVAL_CONFIGURATION.INTERVALS.MEDIUM;
                }
                if (
                  this.dataPoints1.length >=
                    INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.HIGH &&
                  this.dataPoints1.length <=
                    INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.MAX
                ) {
                  interval = INTERVAL_CONFIGURATION.INTERVALS.LONG;
                }
                if (
                  this.dataPoints1.length >
                  INTERVAL_CONFIGURATION.DATA_POINTS_THRESHOLD.MAX
                ) {
                  interval = INTERVAL_CONFIGURATION.INTERVALS.VERY_LONG;
                }
              }
            }

            if (
              this.timeInterval === INTERVAL_CONFIGURATION.TIME_INTERVAL_DAY ||
              this.timeInterval === INTERVAL_CONFIGURATION.TIME_INTERVAL_HOUR
            ) {
              this.chart.options.charts[0].axisX.intervalType = intervalType;
              this.chart.options.charts[0].axisX.interval = interval;
              this.chart.render();
            }
          });
        }
      },
      deep: true, // Watch changes deeply in dataPoints1 array
      immediate: true, // Trigger handler immediately on component mount
    },
    ohlcData: {
      handler(newChartData) {
        if (newChartData && newChartData.length) {
          this.populateDataPoints(this.ohlcData);
        }
      },
      immediate: true,
    },
    chartData: {
      handler(newChartData) {
        if (newChartData && newChartData.length) {
          this.localChartData = newChartData;
        }
      },
      immediate: true,
    },
  },
};
</script>

<style>
.container {
  max-width: 100%;
}
#chartContainer {
  margin-bottom: 20px;
}
#chart {
  margin: auto;
  border-radius: 10px;
}
.action-label {
  min-width: 100px;
  display: inline-flex;
  text-align: end;
  padding-right: 5px;
  vertical-align: middle;
}
.canvasjs-chart-credit {
  display: none;
}
.row-margin {
  margin: 15px 0;
}
.div-center {
  text-align: center;
  margin: 10px auto;
  position: relative;
  left: 0;
  right: 0;
  width: 170px;
}
.div-center > h2 {
  float: left;
  font-size: 21px;
  padding-left: 10px;
  top: 18px;
  position: relative;
}
.div-center > img {
  float: left;
}
.range-picker {
  float: right;
}
.canvasjs-chart-toolbar {
  display: none;
}
.canvasjs-chart-canvas {
  border-radius: 5px;
}
.canvasjs-navigator-panel {
}
.loader {
  width: 100%;
  height: 100%;
  position: absolute;
  margin: auto;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.7);
}
.loader img {
  position: absolute;
  margin: auto;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
.el-autocomplete__popper {
  width: 300px;
}
.layout-main {
  margin: 0;
}
.canvasjs-chart-tooltip > div {
  border: 1px solid black !important;
  text-align: right !important;
}
.canvasjs-chart-tooltip span {
  color: black !important;
}
.legend-trading-time {
  list-style-type: none; /* Remove default bullets */
  padding: 0; /* Remove default padding */
  display: inline-block;
  float: right;
  margin: 0;
}
.legend-trading-time li {
  padding: 0 5px;
  margin: 5px;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
}
.legend-trading-time li::before {
  content: "";
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 10px;
}
.legend-trading-time .early::before {
  background-color: lightblue;
}
.legend-trading-time .late::before {
  background-color: lightgreen;
}
.legend-trading-time .close::before {
  background-color: lightcoral;
}
.legend-trading-time .aftermarket::before {
  background-color: lightgoldenrodyellow;
}
.legend-trading-time .premarket::before {
  background-color: lightsalmon;
}
.legend-trading-time .open::before {
  background-color: lightcyan;
}
.tooltip-content {
  width: auto;
  max-width: 200px;
  display: inline-block;
}
.tooltip-content > span {
  display: block;
  width: 100%;
  padding: 2px 0;
  font-size: 14px;
}
.tooltip-content > span.undefined,
.tooltip-content > span.false {
  display: none;
}
.tooltip-content .tooltip-date {
  font-weight: bold;
}
.index-label-calendar {
  position: absolute;
  top: 20px; /* Adjust as needed */
  left: 20px; /* Adjust as needed */
  background-color: rgba(255, 255, 255, 0.7);
  padding: 5px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  z-index: 10; /* Ensure it's above the canvas */
}
.chart-wrapper {
  position: relative;
}
</style>
