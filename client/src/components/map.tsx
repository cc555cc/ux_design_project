import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps"
import { SHOPS } from "../data/shops"

function StoreMap(shop_num){
    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
            <div className="mt-6 h-[60vh] w-[50%] overflow-hidden rounded-2xl">
                <Map defaultCenter={{ lat: 43.68, lng: -79.375 }} defaultZoom={12} mapId="DEMO_MAP_ID"
                    gestureHandling="cooperative" disableDefaultUI>
                    {SHOPS.map(shop => (
                        <AdvancedMarker key={shop.name} position={shop.position} title={shop.name} />
                    ))}
                </Map>
            </div>
        </APIProvider>
    )
}

export default StoreMap