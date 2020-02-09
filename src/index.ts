import 'normalize.css';
import 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import L, {
  map, tileLayer, marker, geoJSON, markerClusterGroup,
} from 'leaflet';
import 'leaflet.markercluster';
import Vue from 'vue';
import Axios from 'axios';
import { getLeafletColorMarkers } from './assets/ts/leaflet-color-markers';

require('./index.scss');

function initMap(mapDiv: Element | Vue | Vue[] | Element[]): void {
  const mapView = map(mapDiv as string | HTMLElement, {
    center: [24.156547, 120.712760],
    zoom: 12,
  });

  navigator.geolocation.getCurrentPosition((pos) => {
    mapView.setView([pos.coords.latitude, pos.coords.longitude], 12);
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
        onEachFeature(feature, layer) {
          layer.bindPopup(feature.properties.name);
        },
      });
      const markerCluster = markerClusterGroup();
      markerCluster.addLayer(geoJSONLayer);
      mapView.addLayer(markerCluster);
    })
    .catch((error) => {
      console.error(error);
    });

  // marker([23.7698189, 120.8957000], { icon: getLeafletColorMarkers('black') })
  //   .addTo(mapView)
  //   .bindPopup('<h1>哈囉</h1>')
  //   .openPopup();

  // marker([23.8698189, 120.4957000])
  //   .addTo(mapView)
  //   .bindPopup('<h1>哈囉 2</h1>');
}

const vm = new Vue({
  el: '#app',
  mounted(): void {
    initMap(this.$refs.mapDiv);
  },
});
