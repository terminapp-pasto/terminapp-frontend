// To change the logo, replace src/assets/logo.svg (or import another image
// here, for example logo.png). The whole site uses this component.
import logo from "./assets/logo.svg";

function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="logo">
      <img src={logo} width={size} height={size} alt="" />
      <span className="logo-text">
        Termin<span>APP</span>
      </span>
    </span>
  );
}

export default Logo;
