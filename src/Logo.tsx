// Para cambiar el logo, reemplaza el archivo src/assets/logo.svg (o pon aquí
// otra imagen, por ejemplo logo.png). Todo el sitio usa este componente.
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
