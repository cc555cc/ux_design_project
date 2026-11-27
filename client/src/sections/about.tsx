import aboutPic from "../assets/about_pic.jpg"
import shopPic from "../assets/store-icon.svg"
import { useRef, useState } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"
import GoogleMap from "../components/map.tsx"
import { SHOPS } from "../data/shops.ts"

//only one section should show at a time: about us paragrah or the contact info//
//when scroll away from one section, it fades away while the next one fades in//
function AboutSection(){
    const reduce = useReducedMotion()
    const containerRef = useRef<HTMLDivElement>(null)
    const aboutRef = useRef<HTMLDivElement>(null)
    const contactRef = useRef<HTMLDivElement>(null)

    //map//
    const [selected, setSelected] = useState<string | null>(null)


    //About will fades out as user scrolls up//
    const { scrollYProgress: aboutProgress } = useScroll({
        container: containerRef,
        target: aboutRef,
        offset: ["start start", "end start"],
    })
    const aboutOpacity = useTransform(aboutProgress, [0, 0.6], reduce ? [1, 1] : [1, 0])
    const aboutY = useTransform(aboutProgress, [0, 0.6], reduce ? [0, 0] : [0, -40])

    //0 when contact enters at the bottom, 1 when it snaps into place at the top//
    const { scrollYProgress: contactProgress } = useScroll({
        container: containerRef,
        target: contactRef,
        offset: ["start end", "start start"],
    })
    const contactOpacity = useTransform(contactProgress, [0.4, 1], reduce ? [1, 1] : [0, 1])
    const contactY = useTransform(contactProgress, [0.4, 1], reduce ? [0, 0] : [40, 0])

    const panel = "h-dvh snap-start snap-always px-30 pt-[15vh]"

    return(
        <section
            id="aboutPage"
            ref={containerRef}
            className="h-dvh overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none]"
        >
            {/* about us paragraph and pic section */}
            <motion.div ref={aboutRef} style={{ opacity: aboutOpacity, y: aboutY }} className={panel}>
                <h2 className="font-gasoek text-4xl text-[#D62828]">About Us</h2>
                <div className="mt-6 grid items-start gap-10 md:grid-cols-2">
                    <AboutParagraph />
                    <img src={aboutPic} alt="Long Story Sub order being delivered to a customer"
                         className="max-h-[60vh] w-full rounded-2xl object-cover" />
                </div>
            </motion.div>

            {/* store contacts section */}
            <motion.div ref={contactRef} style={{ opacity: contactOpacity, y: contactY }} className={panel}>
                <h2 className="font-gasoek text-4xl text-[#D62828] pb-[0-vh]">Contact Us!</h2>
                <StoreContactInfo/>
                {/*map and list of shop side by side*/}
                <div className="mt-6 grid gap-6 md:h-[55vh] md:grid-cols-[3fr_2fr]">
                    <GoogleMap selectedStore={selected}/>
                    <ShopList selectedStore={selected} onSelect={setSelected}/>
                </div>
            </motion.div>
        </section>
    )
}

function Highlight({children}: {children: React.ReactNode}){
        return <span className="font-semibold text-[#D62828]">{children}</span>
}

function AboutParagraph(){
    return (
        <div className="space-y-4 text-2xl leading-relaxed text-gray-700 pt-[0vh]">
            <p>
                At <Highlight>Long Story Sub</Highlight>, ordering a sandwich should be as
                <Highlight> enjoyable</Highlight> as eating one. Just chat with our assistant and watch your
                sub come together, one layer at a time.
            </p>
            <p>
                It's <Highlight>convenient</Highlight>, too: order from wherever you are and we'll bring it
                <Highlight> straight to your door</Highlight>. Change your mind ("hold the onions") and your
                order updates instantly. Prefer to grab it yourself? Pickup and walk-ins are welcome.
            </p>
            <p>
                Most of all, it's <Highlight>accessible</Highlight>. No special wording, no complicated
                steps. Just say it the way you'd tell someone behind the counter.
            </p>
        </div>
    )
}

function StoreContactInfo(){
    return(
        <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-100 p-6">
                <h3 className="font-gasoek text-xl text-gray-900">Delivery Hours</h3>
                <p className="mt-2 text-gray-700">
                    Open daily, 9 AM – 9 PM<br />
                    Delivering within 5 km of the shop
                </p>
            </div>

            <div className="rounded-2xl bg-gray-100 p-6">
                <h3 className="font-gasoek text-xl text-gray-900">Contact</h3>
                <p className="mt-2 text-gray-700">
                    <a href="tel:+15551234567" className="hover:text-[#D62828]">(555) 123-4567</a><br />
                    <a href="mailto:hello@longstorysub.com" className="hover:text-[#D62828]">hello@longstorysub.com</a>
                </p>
            </div>
        </div>
    )
}

//straight-line distance in km between two map points (haversine formula)//
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

function ShopList({selectedStore, onSelect}: {selectedStore: string | null; onSelect: (name:string) => void}) {
  //km from the user to each shop, once they've shared their location//
  const [distances, setDistances] = useState<Record<string, number> | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const nearest = distances
    ? SHOPS.reduce((best, shop) => (distances[shop.name] < distances[best.name] ? shop : best)).name
    : null

  //asks the browser for the user's location, then picks the closest shop (the map moves to it)//
  const findNearest = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("Your browser can't share your location. Pick a shop from the list instead.")
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude }
        const found = Object.fromEntries(SHOPS.map((shop) => [shop.name, distanceKm(here, shop.position)]))
        setDistances(found)
        setLocating(false)
        onSelect(SHOPS.reduce((best, shop) => (found[shop.name] < found[best.name] ? shop : best)).name)
      },
      (error) => {
        setLocating(false)
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? "Location access was blocked. Allow it in your browser, or pick a shop from the list."
            : "We couldn't find your location. Please try again or pick a shop from the list."
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <button
        type="button"
        onClick={findNearest}
        disabled={locating}
        className="flex items-center justify-center gap-2 self-start rounded-full bg-[#D62828] px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {locating ? "Finding you…" : "Find the nearest pickup"}
      </button>
      {locateError ? <p role="alert" className="text-base text-red-700">{locateError}</p> : null}

      <ul className="flex flex-col gap-3 overflow-y-auto">
        {SHOPS.map(shop => (
          <li key={shop.name}>
            <button
              type="button"
              onClick={() => onSelect(shop.name)}
              aria-pressed={selectedStore === shop.name}
              className={`flex w-full items-center gap-3 border-b-3 p-4 text-left transition-colors hover:bg-gray-100 ${
                selectedStore === shop.name ? "border-[#D62828]" : "border-transparent"
              }`}
            >
              <img src={shopPic} alt="" className="h-8 w-8 shrink-0" />
              <div>
                <h3 className="font-gasoek text-xl text-gray-900">{shop.name}</h3>
                <p className="text-base text-gray-700">Pickup &amp; walk-in orders welcome</p>
              </div>
              {distances ? (
                <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                  shop.name === nearest ? "bg-[#D62828] text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  {shop.name === nearest ? "Nearest · " : ""}{distances[shop.name].toFixed(1)} km
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AboutSection