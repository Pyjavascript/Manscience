import bg from "../../assets/Ai/bg.svg";

// bg.svg is built from very large Gaussian blurs, which are expensive to
// rasterize. Keeping it on its own GPU layer means it is drawn once and is
// never repainted when buttons or animations change on top of it.
const PageBackground = () => (
  <div
    aria-hidden="true"
    className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none"
    style={{
      backgroundImage: `url("${bg}")`,
      transform: "translateZ(0)",
      willChange: "transform",
    }}
  />
);

export default PageBackground;
