import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const ProfileChatPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const initials = useMemo(() => {
    const source = profile?.name || profile?.username || "?";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile]);

  const loadThread = async () => {
    const [profileResponse, threadResponse] = await Promise.all([
      apiRequest(`/api/users/${id}/profile`),
      apiRequest(`/api/chat/with/${id}`),
    ]);

    setProfile(profileResponse.user);
    setMessages(threadResponse.messages || []);
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await loadThread();
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    const intervalId = setInterval(() => {
      loadThread().catch(() => {});
    }, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [id]);

  const sendMessage = async (event) => {
    event.preventDefault();

    try {
      setSending(true);
      setError("");
      await apiRequest(`/api/chat/with/${id}`, {
        method: "POST",
        body: JSON.stringify({ body: draft }),
      });
      setDraft("");
      setMessage("Message sent.");
      await loadThread();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <aside className="surface-card p-6">
        {loading && !profile ? (
          <p className="text-staps-ink/65">Loading profile...</p>
        ) : error && !profile ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Shopper profile
            </p>
            <div className="mt-5 flex items-center gap-4">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-20 w-20 rounded-[1.6rem] object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-[#eef2ff] font-display text-2xl font-bold text-[#5a49d6]">
                  {initials}
                </div>
              )}
              <div>
                <h1 className="font-display text-2xl font-extrabold text-staps-ink">
                  {profile?.name}
                </h1>
                <p className="text-sm text-staps-ink/65">@{profile?.username || "shopper"}</p>
                <p className="mt-1 text-sm text-staps-ink/55">
                  {profile?.role === "vendor" ? "Vendor account" : "Shopper account"}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-[1.6rem] bg-[#f8f9fd] p-4 text-sm text-staps-ink/65">
              Chat is available for shoppers and vendors who already have an order relationship on
              STAPS.
            </div>
            <Link to="/dashboard" className="secondary-button mt-6">
              Back to dashboard
            </Link>
          </>
        )}
      </aside>

      <section className="surface-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
          Direct chat
        </p>
        <h2 className="mt-2 font-display text-3xl font-extrabold">Message {profile?.name || "user"}</h2>

        {(message || error) && (
          <p className={`mt-4 text-sm ${error ? "text-red-600" : "text-[#6e54ef]"}`}>
            {error || message}
          </p>
        )}

        <div className="mt-6 rounded-[1.8rem] bg-[#f8f9fd] p-4">
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {messages.length ? (
              messages.map((entry) => {
                const mine = String(entry.sender?.id) === String(user?.id);

                return (
                  <div
                    key={entry.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[32rem] rounded-[1.4rem] px-4 py-3 text-sm shadow-sm ${
                        mine
                          ? "bg-[#6e54ef] text-white"
                          : "border border-staps-ink/8 bg-white text-staps-ink"
                      }`}
                    >
                      <p className="leading-6">{entry.body}</p>
                      <p className={`mt-2 text-[0.72rem] ${mine ? "text-white/75" : "text-staps-ink/45"}`}>
                        {formatTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-staps-ink/60">
                No messages yet. Start the conversation here.
              </p>
            )}
          </div>
        </div>

        <form onSubmit={sendMessage} className="mt-5 space-y-3">
          <textarea
            className="field min-h-28"
            placeholder="Write your message..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex justify-end">
            <button className="primary-button" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
