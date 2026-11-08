import store_logo from "../assets/logo.svg"
import { useState, useEffect, useRef } from 'react'

type NavbarButtonProps = {
  text: string
  href: string
  active: boolean
  onClick: () => void
}

const sections = [
    {label: "New & Popular", href: "#homePage"},
    {label: "Order", href: "#orderPage"},
    {label: "About Us", href: "#aboutPage"},
    {label: "Account", href: "#accountPage"},
];

function Navbar() {
    const logoRef = useRef<HTMLDivElement>(null) // measure where the logo is on screen //
    const [logoNeedBacking, setLogoNeedBacking] = useState(false); //control whether the logo needs a backing or not//

    const [selectedSection, setSelectedSection] = useState("#homePage");

    useEffect(() => {
        const check = () => {
            const logo = logoRef.current;
            if (logo == null) return;

            //center point of logo//
            const r = logo.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;

            const content_behind = document.elementsFromPoint(x, y).find((el) => !el.closest("nav"));

            const theme = content_behind?.closest<HTMLElement>("[data-nav-theme]")?.dataset.navTheme;
            setLogoNeedBacking(theme === "dark");
        };

        //when user do these action, check if the changes make logo font color overlap with content color//
        check();
        window.addEventListener("scroll", check, { passive: true });
        window.addEventListener("resize", check);

        return () => {
            window.removeEventListener("scroll", check);
            window.removeEventListener("resize", check);
        };

    }, []);


    return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[10vh] items-center justify-between bg-transparent px-6 py-2">
        {/*where the site logo locate*/}
        <div
            ref={logoRef}
            className={`h-full rounded-xl px-3 py-1 transition-all duration-300 ${
                logoNeedBacking
                ? "bg-white/75 shadow-lg backdrop-blur-md"
                : "bg-transparent"
        }`}>
            <img src={store_logo} alt="Long Story Sub" className="h-full w-auto" />
        </div>
        
        <div className={`flex h-full items-center gap-2 rounded-xl px-3 transition-all duration-300 ${
            logoNeedBacking ? "bg-white/75 shadow-lg backdrop-blur-md" : "bg-transparent"
        }`}>
            {sections.map((s) => (
                <NavbarButton
                    key={s.href}
                    text={s.label}
                    href={s.href}
                    active={selectedSection === s.href}
                    onClick={() => setSelectedSection(s.href)}
                />
            ))}
        </div>   
    </nav>
  )
}

function NavbarButton({ text, href, active, onClick }: NavbarButtonProps) {
    return (
        <a 
            href={href}
            onClick={onClick}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
            active ? "bg-red-600 text-white" : "text-gray-900 hover:bg-orange-100"
        }`}>
            {text}
        </a>
    )
}

export default Navbar