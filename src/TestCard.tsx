import { useState } from "react";
import { STRIPE_PUBLISHABLE_KEY } from "./stripe";

// Stripe's official test card: it only works with test keys and never charges real money.
// The box is shown only while the page uses a test key (pk_test_...).
const TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12/34",
  cvc: "123",
};
const COPIED_MESSAGE_MS = 2000;

export const IS_STRIPE_TEST_MODE = STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_");

function TestCard() {
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(TEST_CARD.number.replace(/ /g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MESSAGE_MS);
    } catch {
      // the browser blocked the clipboard: the number stays visible to type it
    }
  }

  if (!IS_STRIPE_TEST_MODE) return null;

  return (
    <div className="test-card" role="note" aria-label="Tarjeta de prueba">
      <p className="test-card-title">
        <strong>Tarjeta de prueba</strong> · no se cobra dinero real
      </p>
      <dl>
        <div className="test-card-number">
          <dt>Número</dt>
          <dd>
            <code>{TEST_CARD.number}</code>
            <button type="button" className="secondary-button" onClick={copyNumber}>
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </dd>
        </div>
        <div>
          <dt>Vence</dt>
          <dd>
            <code>{TEST_CARD.expiry}</code>
          </dd>
        </div>
        <div>
          <dt>CVC</dt>
          <dd>
            <code>{TEST_CARD.cvc}</code>
          </dd>
        </div>
        <div>
          <dt>Nombre</dt>
          <dd>El que quieras</dd>
        </div>
      </dl>
      <p className="test-card-hint">Sirve cualquier fecha futura y cualquier CVC de 3 dígitos.</p>
    </div>
  );
}

export default TestCard;
