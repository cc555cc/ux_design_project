import HomeSection from "./sections/home"
import OrderSection from "./sections/order"
import AboutSection from "./sections/about"
import AccountSection from "./sections/account"
import LoginSignupSection from "./sections/login_signup"
import Navbar, { type Section } from "./components/navbar"
import { useAuth } from "./hook/useAuth"
import { useState, useEffect } from "react"

const SECTIONS: Section[] = ["home", "order", "about", "account", "login"]

// "#order" -> "order"; anything unknown falls back to "home"
function sectionFromHash(): Section {
  const hash = window.location.hash.slice(1)
  return SECTIONS.includes(hash as Section) ? (hash as Section) : "home"
}

function App() {
  const [currentSection, setCurrentSection] = useState<Section>(sectionFromHash)
  const user = useAuth((state) => state.user)

  // runs whenever the # part of the URL changes (nav click, back/forward button)
  useEffect(() => {
    const onHashChange = () => {
      setCurrentSection(sectionFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  // Redirect between #account and #login based on auth state
  useEffect(() => {
    if (currentSection === "account" && !user) {
      window.location.replace("#login")
    } else if (currentSection === "login" && user) {
      window.location.replace("#account")
    }
  }, [currentSection, user])

  const effectiveSection: Section =
    currentSection === "account" && !user
      ? "login"
      : currentSection === "login" && user
      ? "account"
      : currentSection

  return (
    <div>
      <Navbar currentSection={effectiveSection} />
      {effectiveSection === "home" && <HomeSection />}
      {effectiveSection === "order" && <OrderSection />}
      {effectiveSection === "about" && <AboutSection />}
      {effectiveSection === "account" && <AccountSection />}
      {effectiveSection === "login" && <LoginSignupSection />}
    </div>
  )
}

export default App
