import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "./api";
import type { AdminCall } from "./AdminPanel";
import type { AssistantAction } from "./adminApi";
import { CheckIcon, SendIcon } from "./Icons";
import type { Session } from "./session";

type Message = {
  role: "user" | "assistant";
  text: string;
  actions?: (AssistantAction & { state: "pending" | "done" | "discarded" | "error"; note?: string })[];
};

type Props = {
  call: AdminCall;
  session: Session;
  onChanged: () => void;
};

const MESSAGE_MAX_LENGTH = 500;
const EXAMPLES = [
  "¿Qué tan lleno va el bus a Cali hoy?",
  "Cámbiame el precio de Cali a 85 mil",
  "Deja el tiempo para pagar en 8 minutos",
];

// The browser's speech recognition (Chrome and Edge). Typed by hand because
// TypeScript does not include it.
type SpeechRecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognition(): SpeechRecognitionConstructor | null {
  const browser = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-CO";
  window.speechSynthesis.speak(utterance);
}

// AI assistant of the panel. It looks things up and prepares changes, but nothing
// changes until the person presses "Confirmar" on each one. It can be used by voice.
function AdminAssistant({ call, session, onChanged }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        `Hola, ${session.user.name.split(" ")[0]}. Pídeme lo que necesites del panel, escribiendo o con el micrófono. ` +
        "Yo preparo los cambios y tú los confirmas.",
    },
  ]);
  const [text, setText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const Recognition = speechRecognition();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isThinking]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    []
  );

  async function send(content: string) {
    const clean = content.trim().slice(0, MESSAGE_MAX_LENGTH);
    if (!clean || isThinking) return;
    const history: Message[] = [...messages, { role: "user", text: clean }];
    setMessages(history);
    setText("");
    setIsThinking(true);
    try {
      const answer = await call<{ reply: string; actions: AssistantAction[] }>("/admin/assistant", {
        // the greeting is only for the screen; the conversation starts with the person
        messages: history.slice(1).map(({ role, text: messageText }) => ({ role, text: messageText })),
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer.reply,
          actions: answer.actions.map((action) => ({ ...action, state: "pending" as const })),
        },
      ]);
      if (readAloud) speak(answer.reply);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", text: errorText(error) }]);
    } finally {
      setIsThinking(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(text);
  }

  function toggleListening() {
    if (!Recognition) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    setVoiceError("");
    const recognition = new Recognition();
    recognition.lang = "es-CO";
    recognition.interimResults = true;
    recognition.continuous = false;
    let heard = "";
    recognition.onresult = (event) => {
      heard = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setText(heard);
    };
    recognition.onerror = (event) => {
      setVoiceError(
        event.error === "not-allowed"
          ? "El navegador no dio permiso para usar el micrófono."
          : "No te escuché bien. Intenta de nuevo o escríbelo."
      );
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (heard.trim()) send(heard);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function decide(messageIndex: number, actionIndex: number, confirm: boolean) {
    const action = messages[messageIndex].actions?.[actionIndex];
    if (!action) return;
    const update = (state: "done" | "discarded" | "error", note?: string) =>
      setMessages((current) =>
        current.map((message, i) =>
          i !== messageIndex
            ? message
            : {
                ...message,
                actions: message.actions?.map((item, j) => (j === actionIndex ? { ...item, state, note } : item)),
              }
        )
      );
    if (!confirm) {
      update("discarded");
      return;
    }
    try {
      await call(action.path, action.body);
      update("done");
      onChanged();
      if (readAloud) speak("Listo, cambio aplicado.");
    } catch (error) {
      update("error", errorText(error));
    }
  }

  return (
    <div className="admin-section assistant">
      <div className="assistant-log" aria-live="polite">
        {messages.map((message, messageIndex) => (
          <div key={messageIndex} className={`assistant-message ${message.role}`}>
            <p>{message.text}</p>
            {message.actions?.map((action, actionIndex) => (
              <div key={actionIndex} className={`assistant-action ${action.state}`}>
                <p>
                  <b>Cambio propuesto:</b> {action.summary}
                </p>
                {action.state === "pending" && (
                  <div className="assistant-action-buttons">
                    <button type="button" className="primary-button small" onClick={() => decide(messageIndex, actionIndex, true)}>
                      <CheckIcon size={16} /> Confirmar
                    </button>
                    <button type="button" className="secondary-button small" onClick={() => decide(messageIndex, actionIndex, false)}>
                      Descartar
                    </button>
                  </div>
                )}
                {action.state === "done" && <p className="action-result">Hecho. Ya quedó guardado.</p>}
                {action.state === "discarded" && <p className="action-result">Descartado: no se cambió nada.</p>}
                {action.state === "error" && <p className="action-result error">{action.note}</p>}
              </div>
            ))}
          </div>
        ))}
        {isThinking && (
          <div className="assistant-message assistant thinking">
            <p>Pensando…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 1 && (
        <div className="assistant-examples">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => send(example)}>
              {example}
            </button>
          ))}
        </div>
      )}

      <form className="assistant-form" onSubmit={submit}>
        {Recognition && (
          <button
            type="button"
            className={`mic-button${isListening ? " listening" : ""}`}
            aria-pressed={isListening}
            aria-label={isListening ? "Dejar de escuchar" : "Hablar con el asistente"}
            onClick={toggleListening}
          >
            <MicIcon />
          </button>
        )}
        <label htmlFor="assistant-input" className="sr-only">
          Mensaje para el asistente
        </label>
        <input
          id="assistant-input"
          value={text}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={isListening ? "Te escucho…" : "Escribe o toca el micrófono"}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="primary-button" disabled={!text.trim() || isThinking} aria-label="Enviar">
          <SendIcon size={18} />
        </button>
      </form>
      <div className="assistant-options">
        <label className="check-line">
          <input type="checkbox" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} />
          Leer las respuestas en voz alta
        </label>
        {!Recognition && <span>Para hablarle, abre el panel en Chrome o Edge.</span>}
        {voiceError && <span className="voice-error">{voiceError}</span>}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export default AdminAssistant;
