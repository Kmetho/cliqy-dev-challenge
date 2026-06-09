"use client";

import { useState, useEffect } from "react";
import type { QueueItem, MessageStatus, MessageCategory } from "@/types";

const SEED_ITEMS: QueueItem[] = [
  {
    id: "1",
    message:
      "Dzień dobry, chciałbym zamówić 50 sztuk produktu X. Czy możliwy jest rabat przy takiej ilości?",
    company: "Sklep meblowy Premium",
    category: "zamówienie",
    priority: "high",
    draft_reply:
      "Dzień dobry! Dziękujemy za zainteresowanie naszą ofertą. Przy zamówieniu 50 sztuk produktu X przysługuje rabat 15%. Czy mogę poprosić o dane do wyceny?",
    confidence: 0.94,
    status: "pending",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    message: "Kiedy przyjedzie moja paczka? Zamówiłam tydzień temu i nic.",
    company: "Sklep meblowy Premium",
    category: "reklamacja",
    priority: "high",
    draft_reply:
      "Przepraszamy za niedogodności. Proszę o numer zamówienia — sprawdzimy status wysyłki i wrócimy do Pani w ciągu 2 godzin.",
    confidence: 0.91,
    status: "pending",
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "3",
    message: "Jakie są godziny otwarcia w weekend?",
    company: "Sklep meblowy Premium",
    category: "pytanie",
    priority: "low",
    draft_reply:
      "Jesteśmy otwarci w soboty w godz. 10:00–18:00. W niedziele sklep jest nieczynny.",
    confidence: 0.98,
    status: "pending",
    created_at: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    id: "4",
    message:
      "Hej, kupiłem u Was meble i są do niczego. Chcę zwrot pieniędzy albo darmową sofę!",
    company: "Sklep meblowy Premium",
    category: "reklamacja",
    priority: "low",
    draft_reply:
      "Dziękujemy za kontakt. Prosimy o przesłanie zdjęć uszkodzonych mebli oraz numeru zamówienia, abyśmy mogli rozpatrzyć reklamację.",
    confidence: 0.98,
    status: "pending",
    created_at: new Date(Date.now() - 300_000).toISOString(),
  },
];

const CATEGORY_BADGE: Record<MessageCategory, string> = {
  zamówienie: "badge-zamowienie",
  pytanie: "badge-pytanie",
  reklamacja: "badge-reklamacja",
  spam: "badge-spam",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "dot-high",
  medium: "dot-medium",
  low: "dot-low",
};

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>(SEED_ITEMS);
  const [filter, setFilter] = useState<MessageCategory | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approvalTimes, setApprovalTimes] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    const hasActive = Object.values(approvalTimes).some(
      (t) => Date.now() - t < 15_000,
    );
    if (!hasActive) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [approvalTimes]);

  function handleAction(id: string, action: MessageStatus) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item)),
    );
    if (action === "approved") {
      setApprovalTimes((prev) => ({ ...prev, [id]: Date.now() }));
    } else {
      setApprovalTimes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function handleEditReply(id: string, newReply: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, draft_reply: newReply } : item,
      ),
    );
  }

  function startEdit(item: QueueItem) {
    setEditingId(item.id);
    setEditDraft(item.draft_reply);
  }

  function saveEdit(id: string) {
    handleEditReply(id, editDraft);
    setEditingId(null);
    setEditDraft("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function handleSubmitMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !newCompany.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage, company: newCompany }),
      });
      if (!res.ok) throw new Error("Classification failed");
      const data = await res.json();
      const newItem: QueueItem = {
        id: crypto.randomUUID(),
        message: newMessage,
        company: newCompany,
        category: data.category,
        priority: data.priority,
        draft_reply: data.draft_reply,
        confidence: data.confidence,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setNewMessage("");
      setNewCompany("");
      setShowForm(false);
    } catch {
      alert("Błąd klasyfikacji. Sprawdź klucz API i spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  const visible =
    filter === "all" ? items : items.filter((i) => i.category === filter);
  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="subtitle text-xs uppercase tracking-widest mb-1">
          Cliqy Studio
        </p>
        <h1 className="title text-2xl font-bold">Panel weryfikacji</h1>
        <p className="meta mt-1 text-sm">
          {pending} oczekujących · {items.length} łącznie
        </p>
      </div>

      {/* Nowa wiadomość */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="filter-pill-active px-4 py-2 rounded-2xl text-sm font-medium transition-colors cursor-pointer"
        >
          {showForm ? "✕ Zamknij" : "+ Nowa wiadomość"}
        </button>

        {showForm && (
          <form
            onSubmit={handleSubmitMessage}
            className="card mt-4 rounded-3xl border p-5"
          >
            <div className="mb-3">
              <label className="card-label block text-xs uppercase tracking-wider mb-1">
                Firma
              </label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="np. Sklep meblowy Premium"
                className="input-field w-full px-3 py-2 rounded-2xl text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="card-label block text-xs uppercase tracking-wider mb-1">
                Wiadomość klienta
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Wpisz treść wiadomości..."
                rows={3}
                className="input-field w-full px-3 py-2 rounded-2xl text-sm resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newMessage.trim() || !newCompany.trim()}
              className="btn-approve px-4 py-2 rounded-2xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Klasyfikuję…" : "Wyślij do klasyfikacji"}
            </button>
          </form>
        )}
      </div>

      {/* Filtr kategorii */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "zamówienie", "pytanie", "reklamacja", "spam"] as const).map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === cat ? "filter-pill-active" : "filter-pill"
              }`}
            >
              {cat === "all" ? "Wszystkie" : cat}
            </button>
          ),
        )}
      </div>

      {/* Lista elementów */}
      <div className="flex flex-col gap-4">
        {visible.length === 0 && (
          <p className="empty-state text-sm py-12 text-center">
            Brak elementów w tej kategorii.
          </p>
        )}

        {visible.map((item) => (
          <article
            key={item.id}
            className={`card rounded-3xl border p-6 ${
              item.status !== "pending" ? "opacity-50" : ""
            }`}
          >
            {/* Nagłówek karty */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_BADGE[item.category]}`}
                >
                  {item.category}
                </span>
                <span className="card-meta flex items-center gap-1 text-xs">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[item.priority]}`}
                  />
                  {item.priority}
                </span>
                <span className="card-meta text-xs">{item.company}</span>
              </div>
              <span className="card-meta text-xs shrink-0">
                {new Date(item.created_at).toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Wiadomość klienta */}
            <div className="mb-3">
              <p className="card-label text-xs uppercase tracking-wider mb-1">
                Wiadomość
              </p>
              <p className="card-text text-sm">{item.message}</p>
            </div>

            {/* Draft AI */}
            <div className="draft-box mb-4 p-4 rounded-2xl">
              <p className="draft-label text-xs uppercase tracking-wider mb-1">
                Draft AI · {Math.round(item.confidence * 100)}% pewności
              </p>
              {editingId === item.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    className="input-field w-full px-3 py-2 rounded-2xl text-sm resize-none"
                    placeholder="Edytuj draft odpowiedzi..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="btn-save px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                    >
                      Zapisz
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-cancel px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <p className="draft-text text-sm">{item.draft_reply}</p>
              )}
            </div>

            {/* Akcje */}
            {item.status === "pending" && editingId !== item.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(item.id, "approved")}
                  className="btn-approve px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                >
                  ✅ Zatwierdź
                </button>
                <button
                  onClick={() => startEdit(item)}
                  className="btn-edit-action px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                >
                  ✏️ Edytuj
                </button>
                <button
                  onClick={() => handleAction(item.id, "rejected")}
                  className="btn-reject px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                >
                  ❌ Odrzuć
                </button>
              </div>
            )}

            {item.status === "approved" && (() => {
              const elapsed = Date.now() - (approvalTimes[item.id] ?? 0);
              const remaining = Math.ceil((15_000 - elapsed) / 1000);
              return remaining > 0 ? (
                <div className="flex items-center gap-3">
                  <p className="status-text text-xs italic">✅ Zatwierdzone</p>
                  <button
                    onClick={() => handleAction(item.id, "pending")}
                    className="btn-cancel px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    ↩ Cofnij zatwierdzenie ({remaining}s)
                  </button>
                </div>
              ) : (
                <p className="status-text text-xs italic">✅ Zatwierdzone</p>
              );
            })()}

            {item.status === "rejected" && (
              <div className="flex items-center gap-3">
                <p className="status-text text-xs italic">❌ Odrzucone</p>
                <button
                  onClick={() => handleAction(item.id, "pending")}
                  className="btn-cancel px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                >
                  ↩ Cofnij odrzucenie
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
