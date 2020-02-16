import './index.scss';
import './plugins/leaflet-plugins';
import './plugins/vue-plugins';
import './plugins/fontawesome';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import L, {
  map, tileLayer, marker, geoJSON, markerClusterGroup, Map, GeoJSON,
} from 'leaflet';
import 'leaflet.markercluster';
import Vue from 'vue';
import InfiniteLoading from 'vue-infinite-loading';
import Axios from 'axios';
import { isEqual } from 'lodash';
import { format, getDay } from 'date-fns';
import zhTWLocale from 'date-fns/locale/zh-TW';
import { getLeafletColorMarkers } from './assets/ts/leaflet-color-markers';

Vue.use(InfiniteLoading);

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
    mapView: null as Map | null,
    geoJSONLayer: null as GeoJSON<any> | null,
    features: [] as Feature[],
    infiniteFeatures: [] as Feature[],
    infiniteId: +new Date(),
    currentSelectedCategory: 'all' as 'all' | 'adult' | 'child',
    searchText: '',
  },
  computed: {
    featuresFilteredByCurrentSelectedCategory(): Feature[] {
      this.infiniteFeatures = [];
      this.infiniteId += 1;
      let temp: Feature[] = [];
      if (this.currentSelectedCategory === 'all') {
        temp = this.features;
      } else if (this.currentSelectedCategory === 'adult') {
        temp = this.features.filter((feature) => feature.properties.mask_adult);
      } else if (this.currentSelectedCategory === 'child') {
        temp = this.features.filter((feature) => feature.properties.mask_child);
      }

      if (this.searchText) {
        temp = temp
          .filter((feature) => (
            feature.properties.name.includes(this.searchText)
              || feature.properties.address.includes(this.searchText)
          ));
      }

      return temp;
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

      this.mapView = mapView;

      // 瀏覽器抓現在位置
      navigator.geolocation.getCurrentPosition((pos) => {
        mapView.setView([pos.coords.latitude, pos.coords.longitude], 15);
        marker([pos.coords.latitude, pos.coords.longitude], { icon: getLeafletColorMarkers('red') })
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
              if (feature.properties.mask_adult) {
                return L.marker(latlng, { icon: getLeafletColorMarkers('orange') });
              }
              if (feature.properties.mask_child) {
                return L.marker(latlng, { icon: getLeafletColorMarkers('gold') });
              }
              return L.marker(latlng, { icon: getLeafletColorMarkers('grey') });
            },
            onEachFeature(feature, layer) {
              layer.bindPopup(feature.properties.name);
            },
          });

          this.geoJSONLayer = geoJSONLayer;

          const markerCluster = markerClusterGroup();
          markerCluster.addLayer(geoJSONLayer);
          mapView.addLayer(markerCluster);

          this.features = response.data.features;
        })
        .catch((error) => {
          console.error(error);
        });
    },
    infiniteHandler($state: any): void {
      setTimeout(() => {
        const temp = [];
        for (
          let i = this.infiniteFeatures.length;
          i <= 50 + this.infiniteFeatures.length;
          i += 1
        ) {
          if (this.featuresFilteredByCurrentSelectedCategory[i]) {
            temp.push(this.featuresFilteredByCurrentSelectedCategory[i]);
          }
        }
        this.infiniteFeatures = this.infiniteFeatures.concat(temp);
        $state.loaded();
        if (
          this.infiniteFeatures.length === this.featuresFilteredByCurrentSelectedCategory.length
        ) {
          $state.complete();
        }
      }, 500);
    },
    flyToCoordinates(coordinates: [number, number]): void {
      if (this.mapView) {
        this.mapView.flyTo(coordinates, 18);
        if (this.geoJSONLayer) {
          this.geoJSONLayer.eachLayer((layer: any) => {
            if (isEqual(layer.feature.geometry.coordinates, coordinates.reverse())) {
              layer.openPopup();
            }
          });
        }
      }
    },
  },
});
