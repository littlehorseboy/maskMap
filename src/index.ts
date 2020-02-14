import './index.scss';
import './plugins/leaflet-plugins';
import './plugins/vue-plugins';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import L, {
  map, tileLayer, marker, geoJSON, markerClusterGroup,
} from 'leaflet';
import 'leaflet.markercluster';
import Vue from 'vue';
import Axios from 'axios';
import { format, getDay } from 'date-fns';
import zhTWLocale from 'date-fns/locale/zh-TW';
import { getLeafletColorMarkers } from './assets/ts/leaflet-color-markers';

interface Feature {
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  properties: {
    address: string;
    available: string;
    county: string;
    cunli: string;
    custom_note: string;
    id: string;
    mask_adult: number;
    mask_child: number;
    name: string;
    note: string;
    phone: string;
    service_periods: string;
    town: string;
    updated: string;
    website: string;
  };
  type: string;
}

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  data: {
    currentDate: format(new Date(), 'yyyy-MM-dd'),
    currentWeekday: format(new Date(), 'EEEE', { locale: zhTWLocale }),
    IDCardNumber: ((): string => {
      const currentWeekday = getDay(new Date());
      if ([1, 3, 5].includes(currentWeekday)) {
        return '奇數';
      }
      if ([2, 4, 6].includes(currentWeekday)) {
        return '偶數';
      }
      return '不限';
    })(),
    features: [] as Feature[],
    currentSelectedCategory: '' as 'all' | 'adult' | 'child',
  },
  computed: {
    featuresFilteredByCurrentSelectedCategory(): Feature[] {
      if (this.currentSelectedCategory === 'all') {
        return this.features;
      }
      if (this.currentSelectedCategory === 'adult') {
        return this.features.filter((feature) => feature.properties.mask_adult);
      }
      if (this.currentSelectedCategory === 'child') {
        return this.features.filter((feature) => feature.properties.mask_child);
      }
      return [];
    },
  },
  mounted(): void {
    this.initMap(this.$refs.mapDiv);
  },
  methods: {
    initMap(mapDiv: Element | Vue | Vue[] | Element[]): void {
      const mapView = map(mapDiv as string | HTMLElement, {
        center: [24.156547, 120.712760],
        zoom: 12,
      });

      // 瀏覽器抓現在位置
      navigator.geolocation.getCurrentPosition((pos) => {
        mapView.setView([pos.coords.latitude, pos.coords.longitude], 12);
        marker([23.7698189, 120.8957000], { icon: getLeafletColorMarkers('black') })
          .addTo(mapView)
          .bindPopup('<h1>目前位置</h1>')
          .openPopup();
      }, (err) => {
        console.error(err);
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });

      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
      })
        .addTo(mapView);

      Axios({
        url: 'https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json?fbclid=IwAR3EiAxOt6b7fUEMrFG5YPInQYzj0j8xmiG2YVEVNhVxIDY3ps-sK61fkGU',
        method: 'get',
      })
        .then((response) => {
          const geoJSONLayer = geoJSON(response.data, {
            pointToLayer(feature, latlng) {
              return L.marker(latlng, { icon: getLeafletColorMarkers('black') });
            },
            onEachFeature(feature, layer) {
              layer.bindPopup(feature.properties.name);
            },
          });
          const markerCluster = markerClusterGroup();
          markerCluster.addLayer(geoJSONLayer);
          mapView.addLayer(markerCluster);

          this.features = response.data.features;
        })
        .catch((error) => {
          console.error(error);
        });
    },
  },
});
