// Loads Stripe.js and draws the payment form INSIDE the page (embedded
// payment), so the user never leaves TerminAPP.
//
// Only the PUBLISHABLE key (pk_test_...) is used, which is safe in the
// browser. The secret key lives only in the backend.

export const STRIPE_PUBLISHABLE_KEY: string = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

// Stripe renamed the embedded payment: newer accounts use "embedded_page"
// (Stripe.js "endive") and older ones "embedded" (Stripe.js v3).
const NEW_EMBEDDED_MODE = "embedded_page";
const SCRIPT_FOR_NEW_MODE = "https://js.stripe.com/endive/stripe.js";
const SCRIPT_FOR_OLD_MODE = "https://js.stripe.com/v3/";

export type EmbeddedCheckout = {
  mount: (element: HTMLElement) => void;
  destroy?: () => void;
  unmount?: () => void;
};

type CheckoutOptions = { fetchClientSecret: () => Promise<string> };

type StripeInstance = {
  createEmbeddedCheckoutPage?: (options: CheckoutOptions) => Promise<EmbeddedCheckout>;
  initEmbeddedCheckout?: (options: CheckoutOptions) => Promise<EmbeddedCheckout>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
let stripeInstance: StripeInstance | null = null;

function loadStripeScript(uiMode: string) {
  if (window.Stripe) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = uiMode === NEW_EMBEDDED_MODE ? SCRIPT_FOR_NEW_MODE : SCRIPT_FOR_OLD_MODE;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("No se pudo cargar el formulario de pago. Revisa tu internet."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Creates the Stripe payment form for a client_secret and mounts it in the element.
export async function mountEmbeddedCheckout(
  clientSecret: string,
  uiMode: string,
  element: HTMLElement
): Promise<EmbeddedCheckout> {
  if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error("Falta configurar la clave publicable de Stripe (VITE_STRIPE_PUBLISHABLE_KEY).");
  }
  await loadStripeScript(uiMode);
  if (!window.Stripe) throw new Error("No se pudo cargar el formulario de pago.");
  stripeInstance ??= window.Stripe(STRIPE_PUBLISHABLE_KEY);

  const options = { fetchClientSecret: async () => clientSecret };
  const createCheckout = stripeInstance.createEmbeddedCheckoutPage ?? stripeInstance.initEmbeddedCheckout;
  if (!createCheckout) throw new Error("Esta versión de Stripe no permite el pago embebido.");

  const checkout = await createCheckout.call(stripeInstance, options);
  checkout.mount(element);
  return checkout;
}

export function removeEmbeddedCheckout(checkout: EmbeddedCheckout | null) {
  if (!checkout) return;
  try {
    if (checkout.destroy) checkout.destroy();
    else checkout.unmount?.();
  } catch {
    // it was already unmounted
  }
}
