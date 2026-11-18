import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps"
import { SHOPS } from "../data/shops"
import { useEffect } from "react"

function StoreMap({ selectedStore }: {selectedStore: string | null}){
    return(
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
            <div className="h-[35vh] w-full overflow-hidden rounded-2xl md:h-full">
                <Map defaultCenter={{ lat: 43.68, lng: -79.375 }} defaultZoom={12} mapId="DEMO_MAP_ID"
                    gestureHandling="cooperative" disableDefaultUI>
                {SHOPS.map(shop => (
                    <AdvancedMarker key={shop.name} position={shop.position} title={shop.name} />
                ))}
                <FocusOnStore selectedStore={selectedStore} />
                </Map>
            </div>
        </APIProvider>
    )
}

function FocusOnStore({ selectedStore }: { selectedStore: string | null }) {
  const map = useMap()

  useEffect(() => {
    const shop = SHOPS.find(s => s.name === selectedStore)
    if (!map || !shop) return
    map.panTo(shop.position)
    map.setZoom(15)
  }, [map, selectedStore])

  return null
}

export default StoreMap