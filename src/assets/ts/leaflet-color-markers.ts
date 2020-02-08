import { Icon } from 'leaflet';

type Color = 'blue' | 'gold' | 'red' | 'green' | 'orange' | 'yellow' | 'violet' | 'grey' | 'black';

// eslint-disable-next-line import/prefer-default-export
export const getLeafletColorMarkers = (color: Color): Icon => new Icon({
  iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
