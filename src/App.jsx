import { useRef } from "react"
import { FaInstagram, FaLinkedin, FaGithub } from "react-icons/fa"

import GooeyNav from "./components/GooeyNav/GooeyNav"
import Hyperspeed from "./components/Hyperspeed/Hyperspeed"
import { hyperspeedPresets } from "./components/Hyperspeed/hyperspeedPresets"
import RotatingText from "./components/RotatingText/RotatingText"
import TargetCursor from "./components/TargetCursor/TargetCursor"
import DecryptedText from "./components/DecryptedText/DecryptedText"
import GradientText from "./components/GradientText/GradientText"
import VariableProximity from "./components/VariableProximity/VariableProximity"
import Forum from "./components/Forum/Forum"
import LogoLoop from "./components/LogoLoop/LogoLoop"
import UploadHub from "./components/UploadHub/UploadHub"
import GradualBlur from "./components/GradualBlur/GradualBlur"

import { siteTexts } from "./i18n/siteTexts"
import { useAiTranslation } from "./i18n/useAiTranslation"

function App() {
  const titleRef = useRef(null)
  const { texts } = useAiTranslation(siteTexts)

  const items = [
    { label: texts.nav.home, href: "#home" },
    { label: texts.nav.forum, href: "#forum" },
    { label: texts.nav.upload, href: "#upload" },
  ]

  const socialLinks = [
    {
      node: <FaInstagram />,
      title: "Instagram",
      href: "https://www.instagram.com/nadiamateus8",
    },
    {
      node: <FaLinkedin />,
      title: "LinkedIn",
      href: "https://www.linkedin.com/in/nádia-mateus-16813a258",
    },
    {
      node: <FaGithub />,
      title: "GitHub",
      href: "https://github.com/nadiabettencourt20-ux",
    },
  ]

  return (
    <div className="app notranslate" translate="no">
      <TargetCursor
        targetSelector="a, button, h1, h2, h3, p, textarea, input, .rotating-main, .title-interactive, .forum-post, .forum-composer, .upload-card"
        spinDuration={2}
        hideDefaultCursor
        hoverDuration={0.2}
      />

      <div className="background-layer">
        <Hyperspeed effectOptions={hyperspeedPresets.one} />
      </div>

      <GradualBlur
        target="page"
        position="bottom"
        height="8rem"
        strength={1.6}
        divCount={5}
        curve="bezier"
        exponential
        opacity={0.9}
        zIndex={50}
      />

      <header className="site-header">
        <GooeyNav
          items={items}
          particleCount={16}
          particleDistances={[80, 12]}
          particleR={90}
          initialActiveIndex={0}
          animationTime={500}
          timeVariance={100}
          colors={[1, 2, 3, 4, 2, 3, 1, 4]}
        />
      </header>

      <main className="page-content">
        <section className="hero" id="home">
          <h1 className="hero-title title-interactive" ref={titleRef}>
            <GradientText
              colors={["#00D4FF", "#7C3AED", "#FF9FFC", "#00D4FF"]}
              animationSpeed={7}
              showBorder={false}
              direction="horizontal"
              className="title-gradient"
            >
              <VariableProximity
                label={texts.home.title}
                className="title-variable"
                fromFontVariationSettings="'wght' 650, 'opsz' 18"
                toFontVariationSettings="'wght' 1000, 'opsz' 80"
                containerRef={titleRef}
                radius={170}
                falloff="gaussian"
              />
            </GradientText>
          </h1>

          <div className="hero-rotating">
            <span>{texts.home.rotatingPrefix}</span>

            <RotatingText
              texts={texts.home.rotating}
              mainClassName="rotating-main"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.03}
              splitLevelClassName="rotating-split"
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 400,
              }}
              rotationInterval={2500}
              splitBy="characters"
              auto
              loop
            />
          </div>

          <p className="hero-description">
            <DecryptedText
              text={texts.home.description}
              speed={45}
              maxIterations={12}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*"
              animateOn="hover"
              revealDirection="start"
              sequential={false}
              className="decrypted-revealed"
              encryptedClassName="decrypted-encrypted"
            />
          </p>
        </section>

        <Forum texts={texts.forum} />

        <UploadHub texts={texts.upload} />

        <footer className="social-footer">
          <LogoLoop
            logos={socialLinks}
            speed={80}
            direction="left"
            logoHeight={30}
            gap={28}
            hoverSpeed={0}
            scaleOnHover
            fadeOut
            fadeOutColor="#020617"
            ariaLabel="Redes sociais de Nádia Mateus"
          />
        </footer>
      </main>
    </div>
  )
}

export default App