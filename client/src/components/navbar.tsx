import store_logo from "../assets/logo.svg"
import { useState, useEffect, useRef } from 'react'

export type Section = "home" | "order" | "about" | "account"

type NavbarButtonProps = {
  text: string
  href: string
  active: boolean
  highlight?: boolean
  onDark: boolean
}

const sections: { label: string, id: Section, highlight?: boolean }[] = [
    {label: "New & Popular", id: "home"},
    {label: "Order Now !", id: "order", highlight: true},
    {label: "About Us", id: "about"},
];

function Navbar({currentSection}: {currentSection: Section}) {
    const logoRef = useRef<HTMLDivElement>(null) // measure where the logo is on screen //
    const [logoNeedBacking, setLogoNeedBacking] = useState(false); //control whether the logo needs a backing or not//

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

    }, [currentSection]);


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
        
        <div className="flex h-full items-center">
                        {sections.map((s) => (
                <NavbarButton
                    key={s.id}
                    text={s.label}
                    href={`#${s.id}`}
                    active={currentSection === s.id}
                    highlight={s.highlight}
                    onDark={logoNeedBacking}
                />
            ))}

            <a
                href="#account"
                aria-label="Account"
                className="flex h-full items-center pl-6"
            >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-700 transition hover:bg-white ${
                    currentSection === "account" ? "ring-2 ring-red-500" : ""
                }`}>

                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                </span>
            </a>
        </div>   
    </nav>
  )
}

function NavbarButton({ text, href, active, highlight, onDark }: NavbarButtonProps) {
    const color = highlight
        ? "text-red-600 hover:text-red-500"
        : onDark
        ? "text-white hover:text-amber-300"
        : "text-gray-900 hover:text-red-600"

    return (
        <a
            href={href}
            className={`flex h-full items-center px-6 font-gasoek text-lg transition-colors duration-300 ${color} ${
                active ? "underline decoration-2 underline-offset-8" : ""
            }`}
        >
            {text}
        </a>
    )
}


export default Navbar