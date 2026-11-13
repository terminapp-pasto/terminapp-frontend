import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest, errorText, formatLongDate } from "./api";
import DepartureCard from "./DepartureCard";
import { SendIcon } from "./Icons";
import type { ChatMessage, Departure } from "./types";
import { CHAT_MESSAGE_MAX_LENGTH } from "./validation";

type ChatStatus = "ready" | "loading" | "error";
type ChatResponse = { reply: string; departures: Departure[] };
type SearchResponse = { departures: Departure[] };

// Ideas for the first message, so nobody stares at an empty box.
const SUGGESTIONS = [
  "Quiero ir a Cali mañana en la mañana",
  "¿Qué buses hay a Ipiales hoy?",
  "El pasaje más barato a Bogotá este viernes",
];

// The seats and prices shown in the chat can change (someone buys, a price changes).
// Coming back to the chat asks /search again for each day and destination shown, so the
// cards are up to date. It does not call the AI again, so it costs nothing.
async function refreshDepartures(messages: ChatMessage[]): Promise<ChatMessage[] | null> {
  const searches = new Map<string, { destination: string; date: string }>();
  for (const message of messages) {
    for (const departure of message.departures ?? []) {
      if (departure.date) {
        searches.set(`${departure.destination}|${departure.date}`, {
          destination: departure.destination,
          date: departure.date,
        });
      }
    }
  }
  if (searches.size === 0) return null;

  const fresh = new Map<string, Departure>();
  await Promise.all(
    [...searches.values()].map(async ({ destination, date }) => {
      const params = new URLSearchParams({ destination, date, from_time: "00:00", sort_by: "time" });
      const data = await apiRequest<SearchResponse>(`/search?${params}`);
      for (const departure of data.departures) fresh.set(`${departure.schedule_id}|${date}`, { ...departure, date });
    })
  );
  return messages.map((message) =>
    message.departures
      ? {
          ...message,
          departures: message.departures.map(
            (departure) => fresh.get(`${departure.schedule_id}|${departure.date}`) ?? departure
          ),
        }
      : message
  );
}

const SLOW_RESPONSE_MS = 6000;
// The backend only reads the latest messages, so sending more only makes long chats fail.
const MESSAGES_SENT_TO_SERVER = 20;
const GREETING: ChatMessage = {
  role: "assistant",
  text: "¡Hola! ¿A dónde quieres viajar hoy?",
};

// Shows the AI text keeping line breaks and **bold**, without inserting HTML
// (so no code can be injected into the page).
function AssistantText({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  return (
    <>
      {lines.map((line, lineIndex) => (
        <p key={lineIndex}>
          {line
            .split("**")
            .map((part, partIndex) => (partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part))}
        </p>
      ))}
    </>
  );
}

type Props = {
  onBuy: (departure: Departure) => void;
  isActive: boolean; // the chat is on screen
  refreshKey: number; // changes after a purchase or a payment
};

function Chat({ onBuy, isActive, refreshKey }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSlow, setIsSlow] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Every time the user comes back to the chat (or a purchase ends), update the
  // free seats and prices of the departures already shown.
  useEffect(() => {
    if (!isActive) return;
    let isCurrent = true;
    const shown = messagesRef.current;
    refreshDepartures(shown)
      .then((updated) => {
        // only if nothing new was written meanwhile
        if (isCurrent && updated && messagesRef.current === shown) setMessages(updated);
      })
      .catch(() => {
        // offline: keep the cards as they were
      });
    return () => {
      isCurrent = false;
    };
  }, [isActive, refreshKey]);

  // Scroll the conversation down to the last message.
  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, status, isSlow]);

  // If the answer is slow, say that the server is waking up.
  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(() => setIsSlow(true), SLOW_RESPONSE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  async function sendConversation(conversation: ChatMessage[]) {
    setMessages(conversation);
    setStatus("loading");
    setErrorMessage("");
    setIsSlow(false);

    try {
      const data = await apiRequest<ChatResponse>("/chat", {
        method: "POST",
        body: {
          messages: conversation.slice(-MESSAGES_SENT_TO_SERVER).map(({ role, text }) => ({ role, text })),
        },
      });
      setMessages([...conversation, { role: "assistant", text: data.reply, departures: data.departures }]);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(errorText(error));
      setStatus("error");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanText = draft.trim();
    if (!cleanText || status === "loading") return;
    setDraft("");
    sendConversation([...messages, { role: "user", text: cleanText }]);
  }

  function pickSuggestion(text: string) {
    if (status === "loading") return;
    sendConversation([...messages, { role: "user", text }]);
  }

  function startNewConversation() {
    setMessages([GREETING]);
    setStatus("ready");
    setErrorMessage("");
  }

  const onlyGreeting = messages.length === 1;

  const inputForm = (
    <form className={`chat-input${onlyGreeting ? " highlighted" : ""}`} onSubmit={handleSubmit}>
      <label htmlFor="message" className="sr-only">
        Escribe tu mensaje
      </label>
      <input
        id="message"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="¿A dónde quieres viajar?"
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        autoComplete="off"
      />
      <button type="submit" disabled={status === "loading" || draft.trim() === ""}>
        <SendIcon size={18} />
        <span className="send-text">Enviar</span>
      </button>
    </form>
  );

  return (
    <section className="chat" aria-label="Chat con el asistente">
      <div className="chat-bar">
        <span className="chat-title">
          <span className="dot" aria-hidden="true"></span>
          Asistente de viajes
        </span>
        {!onlyGreeting && (
          <button
            type="button"
            className="text-button"
            onClick={startNewConversation}
            disabled={status === "loading"}
          >
            Nueva conversación
          </button>
        )}
      </div>

      <div className={`chat-messages${onlyGreeting ? " at-start" : ""}`} ref={messageListRef} aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`row ${message.role}`}>
            <div className="bubble">
              {message.role === "assistant" ? <AssistantText text={message.text} /> : <p>{message.text}</p>}
            </div>
            {message.departures && message.departures.length > 0 && message.departures[0].date && (
              <p className="results-date">Salidas del {formatLongDate(message.departures[0].date)}</p>
            )}
            {message.departures && message.departures.length > 0 && (
              <ul className="results in-chat">
                {message.departures.map((departure) => (
                  <DepartureCard key={departure.schedule_id} departure={departure} onBuy={onBuy} />
                ))}
              </ul>
            )}
          </div>
        ))}

        {status === "loading" && (
          <div className="row assistant">
            <div className="bubble typing">
              <span className="dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
              {isSlow ? (
                <p>El servidor se está activando. La primera respuesta puede tardar hasta un minuto…</p>
              ) : (
                <p className="sr-only">El asistente está escribiendo</p>
              )}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="row assistant">
            <div className="bubble error" role="alert">
              <p>{errorMessage}</p>
              <button type="button" className="retry-button" onClick={() => sendConversation(messages)}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {onlyGreeting && status === "ready" && (
          <div className="chat-start">
            {inputForm}
            <div className="chat-suggestions" aria-label="Ideas para empezar">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => pickSuggestion(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!onlyGreeting && inputForm}
    </section>
  );
}

export default Chat;
