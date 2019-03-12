export default `
  type GeoData {
    createdAt: String
    location: Location
    speed: Float
    altitude: Float
    accuracy: Int
  }

  type Location {
    coordinates: [Float]
  }
`;
