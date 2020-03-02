import './index.scss';
import './plugins/leaflet-plugins';
import './plugins/vue-plugins';
import './plugins/fontawesome';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import L, {
  map, tileLayer, marker, geoJSON, markerClusterGroup, Map, GeoJSON,
} from 'leaflet';
import 'leaflet.markercluster';
import { point, distance } from '@turf/turf';
import Vue from 'vue';
import InfiniteLoading from 'vue-infinite-loading';
import Axios from 'axios';
import { format, getDay, formatDistanceToNow, isValid } from 'date-fns';
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

const vm = new Vue({
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
    modalShow: false,
    modalByFeature: {} as Feature,
    leftPaneVisible: true,
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
    availables(): [string[], string[], string[]] {
      const availableArray = this.modalByFeature.properties.available.split('、');
      const mappedavailableArray = availableArray.map((str) => ({
        weekday: str.slice(0, 3),
        period: str.slice(3, 5),
        onOff: str.slice(5, 7) === '看診' ? 'o' : 'x',
      }));
      const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
      const morningAvailable = weekdays.map((weekday) => {
        const filteredArray = mappedavailableArray.filter((available) => available.period === '上午');
        let selectedResult = 'x';
        for (let i = 0; i < filteredArray.length; i += 1) {
          if (filteredArray[i].weekday === weekday) {
            selectedResult = filteredArray[i].onOff;
            break;
          }
        }
        return selectedResult;
      });
      const afternoonAvailable = weekdays.map((weekday) => {
        const filteredArray = mappedavailableArray.filter((available) => available.period === '下午');
        let selectedResult = 'x';
        for (let i = 0; i < filteredArray.length; i += 1) {
          if (filteredArray[i].weekday === weekday) {
            selectedResult = filteredArray[i].onOff;
            break;
          }
        }
        return selectedResult;
      });
      const eveningAvailable = weekdays.map((weekday) => {
        const filteredArray = mappedavailableArray.filter((available) => available.period === '晚上');
        let selectedResult = 'x';
        for (let i = 0; i < filteredArray.length; i += 1) {
          if (filteredArray[i].weekday === weekday) {
            selectedResult = filteredArray[i].onOff;
            break;
          }
        }
        return selectedResult;
      });
      return [morningAvailable, afternoonAvailable, eveningAvailable];
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
          .bindPopup('<h4>目前位置</h4>')
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
              if (isValid(new Date(feature.properties.updated))) {
                layer.bindPopup(`
                  <h4 class="font-weight-bold">${feature.properties.name}</h4>
                  <div>${feature.properties.address}</div>
                  <div>營業時間｜9:00 - 22:30</div>
                  <div>連絡電話｜${feature.properties.phone}</div>
                  <div class="text-muted">資訊更新於 ${formatDistanceToNow(new Date(feature.properties.updated), { locale: zhTWLocale })}前</div>
                  <div class="py-2">
                    ${feature.properties.mask_adult ? `<button class="btn btn-warning maskAdultBtn">
                      成人口罩 ${feature.properties.mask_adult} 個
                    </button>` : ''}
                    ${feature.properties.mask_child ? `<button class="btn btn-warning maskChildBtn">
                      兒童口罩 ${feature.properties.mask_child} 個
                    </button>` : ''}
                    ${!(feature.properties.mask_adult + feature.properties.mask_child) ? `<button class="btn btn-secondary">
                      口罩缺貨中 ${feature.properties.mask_adult} 個
                    </button>` : ''}
                  </div>
                  <button
                    class="btn btn-info btn-block text-white"
                    onClick="openModal('${feature.properties.id}')"
                  >
                    詳細資訊
                  </button>
                  <a
                    href="http://maps.google.com/?q=${(feature.geometry as any).coordinates[1]},${(feature.geometry as any).coordinates[0]}"
                    target="_blank"
                    class="btn btn-success btn-block text-white"
                  >
                    Google 路線導航
                  </a>
                `);
              } else {
                layer.bindPopup(`
                  <h4 class="font-weight-bold">${feature.properties.name}</h4>
                  <div>${feature.properties.address}</div>
                  <div>營業時間｜9:00 - 22:30</div>
                  <div>連絡電話｜${feature.properties.phone}</div>
                  <div class="text-muted">無紀錄</div>
                  <div class="py-2">
                    ${feature.properties.mask_adult ? `<button class="btn btn-warning maskAdultBtn">
                      成人口罩 ${feature.properties.mask_adult} 個
                    </button>` : ''}
                    ${feature.properties.mask_child ? `<button class="btn btn-warning maskChildBtn">
                      兒童口罩 ${feature.properties.mask_child} 個
                    </button>` : ''}
                    ${!(feature.properties.mask_adult + feature.properties.mask_child) ? `<button class="btn btn-secondary">
                      口罩缺貨中 ${feature.properties.mask_adult} 個
                    </button>` : ''}
                  </div>
                  <button
                    class="btn btn-info btn-block text-white"
                    onClick="openModal('${feature.properties.id}')"
                  >
                    詳細資訊
                  </button>
                  <a
                    href="http://maps.google.com/?q=${(feature.geometry as any).coordinates[1]},${(feature.geometry as any).coordinates[0]}"
                    target="_blank"
                    class="btn btn-success btn-block text-white"
                  >
                    Google 路線導航
                  </a>
                `);
              }
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
        this.leftPaneVisible = false;

        this.mapView.flyTo(coordinates, 18);

        this.mapView.once('moveend', () => {
          if (this.geoJSONLayer) {
            this.geoJSONLayer.eachLayer((layer: any) => {
              const from = point(
                [layer.feature.geometry.coordinates[0], layer.feature.geometry.coordinates[1]],
              );
              const to = point([coordinates[1], coordinates[0]]);

              const distanceResult = distance(from, to, { units: 'meters' });
              if (distanceResult < 1) {
                layer.openPopup();
              }
            });
          }
        });
      }
    },
    setModalByFeature(propertiesID: string): void {
      const foundFeature = this.features.find((feature) => feature.properties.id === propertiesID);
      if (foundFeature) {
        this.modalByFeature = foundFeature;
      }
    },
  },
});

function openModal(propertiesID: string): void {
  vm.modalShow = true;
  vm.setModalByFeature(propertiesID);
}

Object.assign(window, { openModal });
