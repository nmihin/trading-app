<template>
  <div class="layout-main">
    <SiteContent :chartData="chartData" />
  </div>
</template>

<script>
import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/fonts.css";
import "./assets/styles.css";
import { mapState } from "vuex";
import SiteContent from "./components/layout/SiteContent.vue";

export default {
  name: "App",
  components: {
    SiteContent,
  },
  computed: {
    ...mapState(["chartData"]),
  },
  created() {
    this.$store
      .dispatch("fetchChartData")
      .then(() => {
        console.log("Chart data fetched successfully.");
      })
      .catch((error) => {
        console.error("Error fetching chart data:", error);
      });
  },
};
</script>

<style>
/* Add your global styles here */
</style>
