"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import heroImage from "./assets/book-club-hero.png";
import { signOutAction } from "./app/auth-actions.js";
import {
  createReadingCheckinAction,
  createSuggestionAction,
  deleteRecommendationAction,
  deleteSuggestionAction,
  drawBookAction,
  joinReadingCycleAction,
  leaveReadingCycleAction,
  promoteSuggestionToRecommendationAction,
  toggleRecommendationReadAction,
  updateReadingCycleRulesAction,
  updateProfileAction,
  voteSuggestionAction
} from "./app/book-actions.js";

const emptyState = {
  recommendations: [],
  suggestions: [],
  members: [],
  history: [],
  activeCycle: null,
  cycles: [],
  profile: null,
  profiles: [],
  discordHandles: [],
  leaderboard: [],
  checkins: [],
  activeParticipants: [],
  currentUserParticipates: false,
  setupError: ""
};

const moods = ["Debate forte", "Leitura leve", "Clássico", "Surpresa"];
const weekDays = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo"
];

const routes = [
  { href: "/", label: "Início" },
  { href: "/recomendacoes", label: "Acervo" },
  { href: "/sugestoes", label: "Sugestões" },
  { href: "/sorteio", label: "Sorteio" },
  { href: "/perfil", label: "Perfil" }
];

export default function App({ initialState = emptyState, userEmail, page = "home" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(() => normalizeState(initialState));
  const [activeFilter, setActiveFilter] = useState("all");
  const [bookSearch, setBookSearch] = useState("");
  const [selectedDrawBookIds, setSelectedDrawBookIds] = useState([]);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();
  const toastTimerRef = useRef(null);

  useEffect(() => {
    setState(normalizeState(initialState));
  }, [initialState]);

  const recommendations = state.recommendations;
  const suggestions = state.suggestions;
  const history = state.history;
  const activeCycle = state.activeCycle;
  const profile = state.profile;
  const profiles = state.profiles;
  const discordHandles = state.discordHandles;
  const leaderboard = state.leaderboard;
  const checkins = state.checkins;
  const activeParticipants = state.activeParticipants;
  const currentUserParticipates = state.currentUserParticipates;
  const setupError = state.setupError;
  const profileLabel = profile?.displayName || userEmail;

  const filteredRecommendations = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();

    return recommendations.filter((book) => {
      const matchesMood = activeFilter === "all" || book.mood === activeFilter;
      const matchesSearch =
        !query ||
        [book.title, book.author, book.recommender, book.reason].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      return matchesMood && matchesSearch;
    });
  }, [activeFilter, bookSearch, recommendations]);

  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => b.votes - a.votes);
  }, [suggestions]);

  const latestDraw = history[0];

  useEffect(() => {
    const availableBookIds = recommendations.filter((book) => !book.isRead).map((book) => book.id);

    setSelectedDrawBookIds((currentIds) => {
      const stillAvailableIds = currentIds.filter((id) => availableBookIds.includes(id));
      return stillAvailableIds.length ? stillAvailableIds : availableBookIds;
    });
  }, [recommendations]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2600);
  };

  const runAction = (operation, options = {}) => {
    startTransition(async () => {
      const result = await operation();
      notify(result.message);

      if (result.ok) {
        options.form?.reset();
        options.onSuccess?.(result);
        router.refresh();
      }

      if (result.ok && result.redirectTo) {
        router.replace(result.redirectTo);
      }
    });
  };

  const addSuggestion = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction(() => createSuggestionAction(new FormData(form)), { form });
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction(() => updateProfileAction(new FormData(form)));
  };

  const addCheckin = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction(() => createReadingCheckinAction(new FormData(form)), { form });
  };

  const commonProps = {
    activeFilter,
    activeCycle,
    activeParticipants,
    addCheckin,
    filteredRecommendations,
    checkins,
    currentUserParticipates,
    isPending: isPending || Boolean(setupError),
    leaderboard,
    latestDraw,
    profile,
    profiles,
    discordHandles,
    bookSearch,
    recommendations,
    saveProfile,
    setActiveFilter,
    setBookSearch,
    selectedDrawBookIds,
    setSelectedDrawBookIds,
    sortedSuggestions,
    suggestions,
    history,
    addSuggestion,
    joinReadingCycle: () => runAction(() => joinReadingCycleAction(activeCycle?.id)),
    leaveReadingCycle: () => runAction(() => leaveReadingCycleAction(activeCycle?.id)),
    runAction
  };

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Ir para o início">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <span>Tropa do Calvo</span>
        </Link>

        <nav className="nav-links" aria-label="Navegação principal">
          {routes.map((route) => (
            <Link
              className={pathname === route.href ? "is-active" : ""}
              href={route.href}
              key={route.href}
            >
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="user-menu">
          <span>{profileLabel}</span>
          <button
            className="button button-compact"
            type="button"
            disabled={isPending}
            onClick={() => runAction(() => signOutAction())}
          >
            Sair
          </button>
        </div>
      </header>

      <main>
        {setupError ? <SetupNotice message={setupError} /> : null}
        {page === "home" && <HomePage {...commonProps} />}
        {page === "recommendations" && <RecommendationsPage {...commonProps} />}
        {page === "suggestions" && <SuggestionsPage {...commonProps} />}
        {page === "draw" && <DrawPage {...commonProps} />}
        {page === "profile" && <ProfilePage {...commonProps} userEmail={userEmail} />}
      </main>

      <div className={`toast${toast ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}

function HomePage({ activeCycle, profile, profiles, recommendations, suggestions }) {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <Image className="hero-image" src={heroImage} alt="" aria-hidden="true" fill priority sizes="100vw" />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">Clube do livro dos amigos</p>
          <h1 id="hero-title">Tropa do Calvo</h1>
          <p className="hero-copy">
            Um painel restrito para indicar boas leituras, organizar a rodada,
            lembrar metas e manter a tropa lendo com pontos.
          </p>
          <div className="hero-actions" aria-label="Ações principais">
            <Link className="button button-primary" href="/sugestoes">
              Indicar livro
            </Link>
            <Link className="button button-secondary" href="/sorteio">
              Montar sorteio
            </Link>
          </div>
          <div className="hero-stats" aria-label="Resumo do clube">
            <Stat value={recommendations.length} label="livros no acervo" />
            <Stat value={suggestions.length} label="sugestões" />
            <Stat value={profiles.length} label="perfis" />
          </div>
        </div>
      </section>

      <section className="current-band" aria-labelledby="current-title">
        <div className="section-shell current-grid">
          <div>
            <p className="section-kicker">Rodada atual</p>
            <h2 id="current-title">A leitura fica melhor quando todo mundo palpita.</h2>
          </div>
          <SummaryItem
            label="Rodada ativa"
            value={
              activeCycle
                ? `${activeCycle.bookTitle}, de ${activeCycle.bookAuthor}`
                : "Nada sorteado por enquanto"
            }
          />
          <SummaryItem
            label="Regras"
            value={
              activeCycle
                ? isCycleConfigured(activeCycle)
                  ? getCycleRulesSummary(activeCycle)
                  : "Aguardando o grupo definir após o sorteio"
                : "A leitura abre depois do sorteio"
            }
          />
        </div>
      </section>

      <section className="home-section">
        <div className="section-shell">
          <div className="quick-grid">
            <QuickCard
              href="/recomendacoes"
              kicker="Acervo"
              title="Livros salvos"
              copy="Consulta dos livros armazenados, com busca e status de leitura."
            />
            <QuickCard
              href="/sugestoes"
              kicker="Votação"
              title="Sugestões"
              copy="Candidatos para a próxima leitura coletiva, organizados por apoios."
            />
            <QuickCard
              href="/sorteio"
              kicker="Rodada"
              title="Sorteio"
              copy="Escolha quais livros do acervo entram na rodada e sorteie."
            />
            <QuickCard
              href="/perfil"
              kicker={`${profile?.points ?? 0} pontos`}
              title="Perfil"
              copy="Cadastre seu vulgo no Discord e registre check-ins de leitura."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function SetupNotice({ message }) {
  return (
    <section className="setup-notice" aria-labelledby="setup-title">
      <div className="section-shell">
        <div className="panel setup-panel">
          <p className="section-kicker">Setup do Supabase</p>
          <h2 id="setup-title">Banco ainda não está pronto.</h2>
          <p>{message}</p>
          <p>
            No Supabase, abra <strong>SQL Editor</strong>, cole o conteúdo de{" "}
            <code>supabase/schema.sql</code> e execute no mesmo projeto configurado no{" "}
            <code>.env</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

function RecommendationsPage({
  activeFilter,
  bookSearch,
  filteredRecommendations,
  isPending,
  setActiveFilter,
  setBookSearch,
  recommendations,
  runAction
}) {
  const readCount = recommendations.filter((book) => book.isRead).length;
  const unreadCount = recommendations.length - readCount;

  return (
    <section className="workspace-section page-section" aria-labelledby="recommendations-title">
      <div className="section-shell acervo-hero">
        <SectionHeading
          kicker="Acervo da tropa"
          title="Consulta dos livros do grupo"
          copy="Aqui o acervo é só listagem, busca e status de leitura. Novas ideias entram pela página de sugestões."
          id="recommendations-title"
        />
        <div className="panel acervo-summary">
          <SummaryStat label="No acervo" value={recommendations.length} />
          <SummaryStat label="Disponíveis" value={unreadCount} />
          <SummaryStat label="Lidos" value={readCount} />
        </div>
      </div>

      <div className="section-shell compact-shell">
        <div className="library-controls panel">
          <label className="search-field">
            <span>Buscar no acervo</span>
            <input
              value={bookSearch}
              type="search"
              placeholder="Título, autor, indicação ou motivo"
              onChange={(event) => setBookSearch(event.target.value)}
            />
          </label>
          <Link className="button button-secondary" href="/sugestoes">
            Sugerir livro
          </Link>
        </div>

        <div className="toolbar" aria-label="Filtros de recomendações">
          <FilterButton active={activeFilter === "all"} onClick={() => setActiveFilter("all")}>
            Todas
          </FilterButton>
          {moods.map((mood) => (
            <FilterButton key={mood} active={activeFilter === mood} onClick={() => setActiveFilter(mood)}>
              {mood}
            </FilterButton>
          ))}
        </div>

        <div className="book-grid" aria-live="polite">
          {filteredRecommendations.length ? (
            filteredRecommendations.map((book) => (
              <RecommendationCard
                key={book.id}
                book={book}
                disabled={isPending}
                onRemove={() => runAction(() => deleteRecommendationAction(book.id))}
                onToggleRead={() => runAction(() => toggleRecommendationReadAction(book.id, !book.isRead))}
              />
            ))
          ) : (
            <EmptyState message="Nenhum livro encontrado nesse filtro." />
          )}
        </div>
      </div>
    </section>
  );
}

function SuggestionsPage({ isPending, sortedSuggestions, addSuggestion, runAction, discordHandles = [] }) {
  const hasDiscordHandles = discordHandles.length > 0;

  return (
    <section className="suggestion-section page-section" aria-labelledby="suggestions-title">
      <div className="section-shell split-layout reversed">
        <SectionHeading
          kicker="Próxima leitura"
          title="Ideias antes de virar acervo"
          copy="Aqui ficam propostas para o grupo avaliar. Quando a tropa decidir, o livro pode ser salvo no acervo e participar de sorteios."
          id="suggestions-title"
        />

        <form className="panel form-panel" onSubmit={addSuggestion}>
          <div className="field-pair">
            <Field label="Título" name="title" required />
            <Field label="Autor" name="author" required />
          </div>
          <div className="field-pair">
            <label>
              <span>Sugerido por</span>
              <select name="suggestedBy" defaultValue="" required disabled={!hasDiscordHandles}>
                <option value="" disabled>
                  {hasDiscordHandles ? "Selecione o vulgo" : "Sem vulgos cadastrados"}
                </option>
                {discordHandles.map((handle) => (
                  <option key={handle} value={handle}>
                    {handle}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Páginas" name="pages" type="number" min="1" max="2000" placeholder="320" />
          </div>
          <Field
            label="Link do Google Drive"
            name="fileUrl"
            type="url"
            inputMode="url"
            placeholder="https://drive.google.com/..."
          />
          <Textarea label="Defesa da indicação" name="pitch" rows="4" required />
          <button className="button button-primary" type="submit" disabled={isPending || !hasDiscordHandles}>
            Adicionar sugestão
          </button>
        </form>
      </div>

      <div className="section-shell compact-shell">
        <div className="suggestion-list" aria-live="polite">
          {sortedSuggestions.length ? (
            sortedSuggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                disabled={isPending}
                onPromote={() => runAction(() => promoteSuggestionToRecommendationAction(suggestion.id))}
                onVote={() => runAction(() => voteSuggestionAction(suggestion.id))}
                onRemove={() => runAction(() => deleteSuggestionAction(suggestion.id))}
              />
            ))
          ) : (
            <EmptyState message="Nenhuma sugestão aguardando avaliação." />
          )}
        </div>
      </div>
    </section>
  );
}

function DrawPage({
  activeCycle,
  activeParticipants,
  currentUserParticipates,
  isPending,
  latestDraw,
  history,
  joinReadingCycle,
  leaveReadingCycle,
  recommendations,
  selectedDrawBookIds,
  setSelectedDrawBookIds,
  runAction
}) {
  const [drawBookSearch, setDrawBookSearch] = useState("");
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const availableBooks = recommendations.filter((book) => !book.isRead);
  const readBooks = recommendations.filter((book) => book.isRead);
  const drawQuery = drawBookSearch.trim().toLowerCase();
  const visibleAvailableBooks = availableBooks.filter((book) => {
    return (
      !drawQuery ||
      [book.title, book.author, book.recommender, book.reason].some((value) =>
        String(value || "").toLowerCase().includes(drawQuery)
      )
    );
  });
  const selectedBooks = recommendations.filter((book) => selectedDrawBookIds.includes(book.id));
  const selectedCount = selectedDrawBookIds.length;
  const cycleConfigured = isCycleConfigured(activeCycle);

  useEffect(() => {
    if (!isRoutineModalOpen) return;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsRoutineModalOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isRoutineModalOpen]);

  const toggleDrawBook = (bookId) => {
    setSelectedDrawBookIds((currentIds) => {
      return currentIds.includes(bookId)
        ? currentIds.filter((id) => id !== bookId)
        : [...currentIds, bookId];
    });
  };

  const saveRoutine = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    runAction(() => updateReadingCycleRulesAction(new FormData(form)), {
      onSuccess: () => setIsRoutineModalOpen(false)
    });
  };

  return (
    <section className="draw-section page-section" aria-labelledby="draw-title">
      <div className="section-shell draw-layout">
        <SectionHeading
          kicker="Sorteios"
          title="Escolha o livro da próxima leitura"
          copy="Monte a lista com os livros não lidos do acervo e gire o sorteio. Depois o grupo define data de início, encontros, metas e lembretes."
          id="draw-title"
        />

        <div className="draw-hero" aria-live="polite">
          <div className="draw-hero-main">
            <span className="draw-hero-kicker">Resultado do sorteio</span>
            <p className="draw-hero-result">
              {latestDraw?.label || "Nenhum sorteio realizado ainda"}
            </p>
            <div className="draw-hero-status">
              {activeCycle ? (
                <>
                  <span>
                    Rodada ativa: <strong>{activeCycle.bookTitle}</strong>
                    {" — "}
                    {cycleConfigured
                      ? getCycleRulesSummary(activeCycle)
                      : "aguardando o grupo definir início, encontros e metas."}
                  </span>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => setIsRoutineModalOpen(true)}
                  >
                    Editar rotina
                  </button>
                </>
              ) : (
                <span>Monte a lista ao lado e gire o sorteio para abrir uma nova rodada.</span>
              )}
            </div>
          </div>
          <div className="draw-hero-stats">
            <HeroStat value={availableBooks.length} label="elegíveis" />
            <HeroStat value={selectedCount} label="selecionados" />
            <HeroStat value={readBooks.length} label="já lidos" />
          </div>
        </div>

        <div className="draw-workspace">
          <div className="panel pick-panel">
            <div className="pick-head">
              <div>
                <span className="summary-label">Livros participantes</span>
                <strong>
                  {selectedCount} de {availableBooks.length} elegíveis
                </strong>
              </div>
              <div className="pick-head-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isPending || !availableBooks.length}
                  onClick={() => setSelectedDrawBookIds(availableBooks.map((book) => book.id))}
                >
                  Todos não lidos
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  disabled={isPending || !selectedCount}
                  onClick={() => setSelectedDrawBookIds([])}
                >
                  Limpar
                </button>
              </div>
            </div>

            <label className="search-field">
              <span>Buscar livros elegíveis</span>
              <input
                type="search"
                value={drawBookSearch}
                placeholder="Título, autor ou indicação"
                onChange={(event) => setDrawBookSearch(event.target.value)}
              />
            </label>

            <div className="selected-books-box">
              <span className="summary-label">Entram no sorteio</span>
              {selectedBooks.length ? (
                <div className="selected-book-list">
                  {selectedBooks.map((book) => (
                    <button
                      className="selected-book-pill"
                      type="button"
                      key={book.id}
                      onClick={() => toggleDrawBook(book.id)}
                      aria-label={`Remover ${book.title} do sorteio`}
                    >
                      {book.title}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <small>Nenhum livro selecionado ainda.</small>
              )}
            </div>

            <div className="pick-list" aria-live="polite">
              {recommendations.length ? (
                <>
                  {visibleAvailableBooks.map((book) => (
                    <label
                      className={`draw-book-option${
                        selectedDrawBookIds.includes(book.id) ? " is-selected" : ""
                      }`}
                      key={book.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDrawBookIds.includes(book.id)}
                        disabled={isPending}
                        onChange={() => toggleDrawBook(book.id)}
                      />
                      <span>
                        <strong>{book.title}</strong>
                        <small>{book.author} · indicado por {book.recommender}</small>
                      </span>
                    </label>
                  ))}
                  {availableBooks.length && !visibleAvailableBooks.length ? (
                    <EmptyState message="Nenhum livro elegível encontrado nessa busca." />
                  ) : null}
                  {readBooks.map((book) => (
                    <div className="draw-book-option is-read" key={book.id}>
                      <input type="checkbox" disabled />
                      <span>
                        <strong>{book.title}</strong>
                        <small>{book.author} · já lido</small>
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <EmptyState message="Adicione livros ao acervo antes de montar o sorteio." />
              )}
            </div>

            <div className="pick-cta">
              <button
                className="button button-primary"
                type="button"
                disabled={isPending || !selectedCount}
                onClick={() => runAction(() => drawBookAction(selectedDrawBookIds))}
              >
                Sortear livro ({selectedCount})
              </button>
              <small>
                O sorteio escolhe um título aleatório entre os selecionados e abre a rodada.
              </small>
            </div>
          </div>

          <aside className="draw-rail">
            {activeCycle ? (
              <div className="panel rail-card volunteer-card">
                <div>
                  <span className="summary-label">Participação voluntária</span>
                  <h3>{activeParticipants.length} leitor(es) dentro</h3>
                  <p>Entra na leitura quem quiser acompanhar esse livro.</p>
                </div>
                <button
                  className={currentUserParticipates ? "button button-danger" : "button button-primary"}
                  type="button"
                  disabled={isPending}
                  onClick={currentUserParticipates ? leaveReadingCycle : joinReadingCycle}
                >
                  {currentUserParticipates ? "Sair da leitura" : "Entrar na leitura"}
                </button>
                <div className="volunteer-list">
                  {activeParticipants.length ? (
                    activeParticipants.map((participant) => (
                      <span className="member-chip" key={participant.id || participant.discordHandle}>
                        {participant.displayName || participant.discordHandle || "Leitor da tropa"}
                      </span>
                    ))
                  ) : (
                    <EmptyState message="Ninguém entrou voluntariamente ainda." />
                  )}
                </div>
              </div>
            ) : null}

            <div className="panel rail-card history-card">
              <span className="summary-label">Histórico de sorteios</span>
              <div className="history-list" aria-label="Histórico de sorteios">
                {history.length ? (
                  history.map((item) => <span key={item.id}>{item.label}</span>)
                ) : (
                  <span className="history-empty">Nenhum sorteio registrado ainda.</span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {isRoutineModalOpen && activeCycle ? (
        <RoutineModal
          activeCycle={activeCycle}
          isPending={isPending}
          onClose={() => setIsRoutineModalOpen(false)}
          onSubmit={saveRoutine}
        />
      ) : null}
    </section>
  );
}

function RoutineModal({ activeCycle, isPending, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel routine-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="summary-label">Rotina de leitura</span>
            <h2 id="routine-modal-title">{activeCycle.bookTitle}</h2>
            <p>Configure o início, os encontros, as metas e os lembretes dessa leitura.</p>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar modal" onClick={onClose}>
            &times;
          </button>
        </header>

        <form className="routine-form" onSubmit={onSubmit}>
          <input type="hidden" name="cycleId" value={activeCycle.id} />
          <div className="routine-form-grid">
            <Field label="Começa em" name="startsOn" type="date" defaultValue={activeCycle.startsOn || ""} required />
            <label>
              <span>Frequência</span>
              <select name="meetingFrequency" defaultValue={activeCycle.meetingFrequency || "Semanal"} required>
                <option value="Semanal">Semanal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Mensal">Mensal</option>
              </select>
            </label>
            <label>
              <span>Dia do encontro</span>
              <select name="meetingDay" defaultValue={activeCycle.meetingDay || "Quarta-feira"} required>
                {weekDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Meta semanal"
              name="weeklyGoalPages"
              type="number"
              min="1"
              max="2000"
              defaultValue={activeCycle.weeklyGoalPages || 50}
              required
            />
            <label>
              <span>Dia do lembrete</span>
              <select name="reminderDay" defaultValue={activeCycle.reminderDay || "Segunda-feira"} required>
                {weekDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Horário do lembrete"
              name="reminderTime"
              type="time"
              defaultValue={activeCycle.reminderTime || "20:00"}
              required
            />
          </div>
          <Field
            label="Recompensa"
            name="motivationReward"
            defaultValue={activeCycle.motivationReward || "Check-in semanal vale pontos para o ranking"}
            required
          />
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button button-primary" type="submit" disabled={isPending}>
              Salvar rotina
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProfilePage({
  activeCycle,
  addCheckin,
  checkins,
  currentUserParticipates,
  isPending,
  joinReadingCycle,
  leaderboard,
  leaveReadingCycle,
  profile,
  saveProfile,
  userEmail
}) {
  const cycleConfigured = isCycleConfigured(activeCycle);

  return (
    <section className="profile-section page-section" aria-labelledby="profile-title">
      <div className="section-shell profile-grid">
        <SectionHeading
          kicker="Perfil da tropa"
          title="Identidade, progresso e ranking"
          copy="Atualize suas informações básicas, deixe o vulgo do Discord fácil de encontrar e registre progresso para ganhar pontos."
          id="profile-title"
        />

        <form className="panel form-panel profile-form" onSubmit={saveProfile}>
          <div className="field-pair">
            <Field label="Nome" name="displayName" defaultValue={profile?.displayName || ""} autoComplete="name" required />
            <Field
              label="Vulgo no Discord"
              name="discordHandle"
              defaultValue={profile?.discordHandle || ""}
              placeholder="@calvo_leitor"
              required
            />
          </div>
          <div className="field-pair">
            <Field label="Gênero favorito" name="favoriteGenre" defaultValue={profile?.favoriteGenre || ""} />
            <Field label="Ritmo de leitura" name="readingStyle" defaultValue={profile?.readingStyle || ""} />
          </div>
          <Textarea label="Bio rápida" name="bio" rows="4" defaultValue={profile?.bio || ""} />
          <button className="button button-primary" type="submit" disabled={isPending}>
            Salvar perfil
          </button>
          <span className="profile-email">{userEmail}</span>
        </form>

        <div className="panel progress-panel">
          <div className="profile-stats">
            <Stat value={profile?.points ?? 0} label="pontos" />
            <Stat value={profile?.streak ?? 0} label="check-ins" />
          </div>

          {activeCycle ? (
            <form className="checkin-form" onSubmit={addCheckin}>
              <input type="hidden" name="cycleId" value={activeCycle.id} />
              <div>
                <span className="summary-label">Check-in da rodada</span>
                <strong>{activeCycle.bookTitle}</strong>
                <p>
                  {cycleConfigured
                    ? `Meta da tropa: ${activeCycle.weeklyGoalPages} páginas por semana.`
                    : "Aguardando o grupo salvar as regras da leitura."}{" "}
                  Check-ins rendem pontos para o ranking.
                </p>
              </div>
              <button
                className={currentUserParticipates ? "button button-danger" : "button button-secondary"}
                type="button"
                disabled={isPending}
                onClick={currentUserParticipates ? leaveReadingCycle : joinReadingCycle}
              >
                {currentUserParticipates ? "Sair da leitura" : "Entrar voluntariamente"}
              </button>
              {currentUserParticipates && cycleConfigured ? (
                <>
                  <Field label="Páginas lidas" name="pagesRead" type="number" min="1" max="2000" required />
                  <Textarea label="Nota rápida" name="note" rows="3" placeholder="Onde parou, impressão da semana ou provocação para o debate" />
                  <button className="button button-primary" type="submit" disabled={isPending}>
                    Registrar progresso
                  </button>
                </>
              ) : null}
            </form>
          ) : (
            <EmptyState message="Abra uma rodada no sorteio para registrar progresso." />
          )}
        </div>

        <div className="panel leaderboard-panel">
          <span className="summary-label">Ranking da leitura</span>
          <div className="leaderboard-list">
            {leaderboard.length ? (
              leaderboard.map((reader, index) => (
                <div className="leaderboard-row" key={reader.id || index}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{reader.displayName || reader.discordHandle || "Leitor da tropa"}</strong>
                    <small>{reader.discordHandle || "Discord não informado"}</small>
                  </div>
                  <b>{reader.points} pts</b>
                </div>
              ))
            ) : (
              <EmptyState message="O ranking aparece quando os perfis começarem a pontuar." />
            )}
          </div>
        </div>

        <div className="panel checkin-panel">
          <span className="summary-label">Seus registros recentes</span>
          <div className="checkin-list">
            {checkins.length ? (
              checkins.map((checkin) => (
                <article className="checkin-item" key={checkin.id}>
                  <strong>
                    {checkin.pagesRead} páginas · +{checkin.pointsAwarded} pts
                  </strong>
                  <small>{formatDateTime(checkin.createdAt)}</small>
                  {checkin.note ? <p>{checkin.note}</p> : null}
                </article>
              ))
            ) : (
              <EmptyState message="Nenhum check-in registrado por você ainda." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickCard({ href, kicker, title, copy }) {
  return (
    <Link className="quick-card" href={href}>
      <span>{kicker}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </Link>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="draw-hero-stat">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="reading-summary">
      <span className="summary-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="summary-stat">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function SectionHeading({ kicker, title, copy, id }) {
  return (
    <div className="section-heading">
      <p className="section-kicker">{kicker}</p>
      <h2 id={id}>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function Field({ label, name, type = "text", ...props }) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type={type} {...props} />
    </label>
  );
}

function Textarea({ label, name, ...props }) {
  return (
    <label>
      <span>{label}</span>
      <textarea name={name} {...props} />
    </label>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button className={`filter-button${active ? " is-active" : ""}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function RecommendationCard({ book, disabled, onRemove, onToggleRead }) {
  return (
    <article className="book-card">
      <header>
        <div className="card-tags">
          <span className="tag">{book.mood}</span>
          <span className={`tag ${book.isRead ? "tag-read" : "tag-unread"}`}>
            {book.isRead ? "Lido" : "Não lido"}
          </span>
        </div>
        <h3>{book.title}</h3>
        <span className="meta-line">
          {book.author} · indicado por {book.recommender}
        </span>
      </header>
      <p>{book.reason}</p>
      <div className="card-actions">
        {book.fileUrl ? (
          <a className="button button-secondary" href={book.fileUrl} target="_blank" rel="noreferrer">
            Abrir arquivo
          </a>
        ) : null}
        <button className="button button-secondary" type="button" disabled={disabled} onClick={onToggleRead}>
          {book.isRead ? "Marcar não lido" : "Marcar lido"}
        </button>
        <button className="button button-danger" type="button" disabled={disabled} onClick={onRemove}>
          Remover
        </button>
      </div>
    </article>
  );
}

function SuggestionItem({ suggestion, disabled, onPromote, onVote, onRemove }) {
  const pages = suggestion.pages ? `${suggestion.pages} páginas · ` : "";

  return (
    <article className="suggestion-item">
      <header>
        <h3>{suggestion.title}</h3>
        <span className="meta-line">
          {suggestion.author} · {pages}sugerido por {suggestion.suggestedBy}
        </span>
        <p>{suggestion.pitch}</p>
        {suggestion.fileUrl ? (
          <a className="file-link" href={suggestion.fileUrl} target="_blank" rel="noreferrer">
            Abrir arquivo
          </a>
        ) : null}
      </header>
      <div className="vote-box">
        <span className="vote-count">{suggestion.votes}</span>
        <button className="button button-primary" type="button" disabled={disabled} onClick={onPromote}>
          Enviar ao acervo
        </button>
        <button className="button button-secondary" type="button" disabled={disabled} onClick={onVote}>
          Apoiar
        </button>
        <button className="button button-danger" type="button" disabled={disabled} onClick={onRemove}>
          Remover
        </button>
      </div>
    </article>
  );
}

function EmptyState({ message }) {
  return <div className="empty-state">{message}</div>;
}

function isCycleConfigured(cycle) {
  return Boolean(
    cycle?.startsOn &&
      cycle?.meetingFrequency &&
      cycle?.meetingDay &&
      cycle?.weeklyGoalPages &&
      cycle?.reminderDay
  );
}

function getCycleRulesSummary(cycle) {
  if (!isCycleConfigured(cycle)) return "Aguardando o grupo definir as regras.";

  return `Começa em ${formatDate(cycle.startsOn)} · ${cycle.meetingFrequency} às ${cycle.meetingDay.toLowerCase()} · meta de ${cycle.weeklyGoalPages} páginas.`;
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function normalizeState(state) {
  return {
    recommendations: state?.recommendations ?? [],
    suggestions: state?.suggestions ?? [],
    members: state?.members ?? [],
    history: state?.history ?? [],
    activeCycle: state?.activeCycle ?? null,
    cycles: state?.cycles ?? [],
    profile: state?.profile ?? null,
    profiles: state?.profiles ?? [],
    discordHandles: state?.discordHandles ?? [],
    leaderboard: state?.leaderboard ?? [],
    checkins: state?.checkins ?? [],
    activeParticipants: state?.activeParticipants ?? [],
    currentUserParticipates: state?.currentUserParticipates ?? false,
    setupError: state?.setupError ?? ""
  };
}
