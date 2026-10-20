// Para cambiar el logo, reemplaza el archivo src/assets/logo.svg (o pon aquí
// otra imagen, por ejemplo logo.png). Todo el sitio usa este componente.
import logo from "./assets/logo.svg";

function Logo({ tamano = 36 }: { tamano?: number }) {
  return (
    <span className="logo">
      <img src={logo} width={tamano} height={tamano} alt="" />
      <span className="logo-texto">
        Termin<span>APP</span>
      </span>
    </span>
  );
}

export default Logo;
