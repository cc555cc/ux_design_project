import aboutPic from "../assets/about_pic.jpg"
import { useRef } from "react"
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
                <div className="mt-6 grid h-[45vh] gap-6 md:grid-cols-[2fr_1fr]">
                    <GoogleMap/>
                    <ShopList/>
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
                At <Highlight>Long Story Sub</Highlight>, we think ordering a sandwich online should be as
                <Highlight> enjoyable</Highlight> as eating one. Instead of clicking through endless menus,
                you simply chat with our assistant and watch your sub come together one layer at a time:
                the bread, the size, your favorite fillings and the perfect sauce. Every order is a little
                story, and you're the one writing it.
            </p>                  
            <p>
                It's also built to be <Highlight>convenient</Highlight>. Order from your couch, your desk or
                wherever you are, and we'll bring your sub <Highlight>straight to your door</Highlight>.
                Change your mind as often as you like ("hold the onions", "swap the swiss for cheddar") and
                your order updates instantly, with no starting over. Prefer to grab it yourself? Our shop is
                open for pickup and walk-in orders too.
            </p>            
            <p>
                Most of all, we want ordering to be <Highlight>accessible</Highlight> to everyone. There's
                no special wording to learn and no complicated steps to follow. Just type the way you'd talk
                to someone behind the counter, and we'll take care of the rest. A great sandwich should be
                easy for anyone to get.
            </p>        
        </div>
    )
}

function StoreContactInfo(){
    return(
        <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-100 p-6">
                <h3 className="font-gasoek text-xl text-gray-900">Delivery Hours</h3>
                <p className="mt-2 text-gray-700">
                    Open daily, 9 AM – 9 PM<br />
                    Delivering within 5 km of the shop
                </p>
            </div>
            <div className="rounded-2xl bg-gray-100 p-6">
                <h3 className="font-gasoek text-xl text-gray-900">Visit the Shop</h3>
                <p className="mt-2 text-gray-700">
                    123 Main Street<br />
                    Pickup &amp; walk-in orders welcome
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

function ShopList(){
    return(
        <ul>
            {SHOPS.map(shop => (
                <li key={shop.name} className="rounded-2xl bg-gray-100 p-6">
                    <h3 className="font-gasoek text-xl text-gray-900">{shop.name}</h3>
                    <p className="mt-2 text-gray-700">Pickup &amp; walk-in orders welcome</p>
                </li>
            ))}
        </ul>
    )
}

export default AboutSection