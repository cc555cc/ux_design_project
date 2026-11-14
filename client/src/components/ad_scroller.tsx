import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import ad1 from "../assets/long_story_sub_first_order_offer_final_1920x1080.jpg"
import ad2 from "../assets/long_story_sub_short_wait_final_1920x1080.jpg"
import ad3 from "../assets/long_story_sub_cross_section_final_1920x1080.jpg"

const ADS = [
  { src: ad1, alt: "First order offer" },
  { src: ad2, alt: "Short wait times" },
  { src: ad3, alt: "Sandwich cross-section" },
]

const INTERVAL_MS = 5000

//direction: 1 = slide in from the right, -1 = slide in from the left//
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%" }),
}

function AdScroller() {
  //index and direction are kept together so they always update at the same time//
  const [[index, direction], setSlide] = useState<[number, number]>([0, 1])
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()

  const step = (amount: number) =>
    setSlide(([i]) => [(i + amount + ADS.length) % ADS.length, amount])

  const goTo = (target: number) =>
    setSlide(([i]) => [target, target > i ? 1 : -1])

  //auto-advance; index is a dependency so the timer restarts after a manual click//
  useEffect(() => {
    if (paused || reduceMotion) return
    const id = setInterval(() => {
      setSlide(([i]) => [(i + 1) % ADS.length, 1])
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [paused, reduceMotion, index])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      data-nav-theme="dark"
      className="relative h-dvh w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={index}
          src={ADS[index].src}
          alt={ADS[index].alt}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>

      {/* prev / next arrows */}
      <button
        onClick={() => step(-1)}
        aria-label="Previous ad"
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/70 px-3 py-2 text-2xl font-bold text-gray-900 shadow hover:bg-white"
      >
        ‹
      </button>
      <button
        onClick={() => step(1)}
        aria-label="Next ad"
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/70 px-3 py-2 text-2xl font-bold text-gray-900 shadow hover:bg-white"
      >
        ›
      </button>

      {/* dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {ADS.map((ad, i) => (
          <button
            key={ad.src}
            onClick={() => goTo(i)}
            aria-label={`Show ad ${i + 1}`}
            aria-current={i === index}
            className={`h-3 rounded-full transition-all duration-300 ${
              i === index ? "w-8 bg-red-600" : "w-3 bg-white/70 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </section>
  )
}

export default AdScroller

