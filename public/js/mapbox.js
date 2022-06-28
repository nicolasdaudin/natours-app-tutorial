export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoibmljb2xhc2RhdWRpbiIsImEiOiJjbDRzYmtwb3MwMWFlM2NtejZjdm02d2hjIn0.TZwIjL2T1eZKh9nzkSpUBA';
  var map = new mapboxgl.Map({
    container: 'map', // put the map in an element with id of 'map'
    style: 'mapbox://styles/nicolasdaudin/cl4skbg08000016s9gkxlkwrk',
    scrollZoom: false,
    // center: [-118.111, 34.111],
    // zoom: 6,
    // interactive: false, // won't move if false.
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day} : ${loc.description}</p>`)
      .addTo(map);

    // extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: { top: 200, bottom: 150, left: 100, right: 100 },
  });
};
