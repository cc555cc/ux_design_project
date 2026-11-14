import HomeSection from "./sections/home"
import OrderSection from "./sections/order"
import AboutSection from "./sections/about"
import AccountSection from "./sections/account"
import Navbar, { type Section } from "./components/navbar"
import { useState, useEffect } from 'react'

const SECTIONS: Section[] = ["home", "order", "about", "account"]

// "#order" -> "order"; anything unknown falls back to "home"
function sectionFromHash(): Section {
  const hash = window.location.hash.slice(1)
  return SECTIONS.includes(hash as Section) ? (hash as Section) : "home"
}

function App() {
  const [currentSection, setCurrentSection] = useState<Section>(sectionFromHash)

  // runs whenever the # part of the URL changes (nav click, back/forward button)
  useEffect(() => {
    const onHashChange = () => {
      setCurrentSection(sectionFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return (
    <div>
      <Navbar currentSection={currentSection} />
      {currentSection === "home" && <HomeSection />}
      {currentSection === "order" && <OrderSection />}
      {currentSection === "about" && <AboutSection />}
      {currentSection === "account" && <AccountSection />}
    </div>
  )
}

export default App
