"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import heroImage from "./assets/book-club-hero.png";
import brandLogo from "./assets/file.jpg";
import { signOutAction } from "./app/auth-actions.js";
import {
  createBookReviewAction,
  createReadingCheckinAction,
  createSuggestionAction,
  createSuggestionCommentAction,
  deleteBookReviewAction,
  deleteRecommendationAction,
  deleteSuggestionAction,
  deleteSuggestionCommentAction,
  drawBookAction,
  joinReadingCycleAction,
  leaveReadingCycleAction,
  promoteSuggestionToRecommendationAction,
  toggleRecommendationReadAction,
  updateBookProgressAction,
  updateRecommendationAction,
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
  activeReadingProgress: [],
  currentUserParticipates: false,
  setupError: ""
};

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
  { href: "/sorteio", label: "Leituras" }
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
  const cycles = state.cycles;
  const history = state.history;
  const activeCycle = state.activeCycle;
  const profile = state.profile;
  const profiles = state.profiles;
  const discordHandles = state.discordHandles;
  const leaderboard = state.leaderboard;
  const checkins = state.checkins;
  const activeParticipants = state.activeParticipants;
  const activeReadingProgress = state.activeReadingProgress;
  const currentUserParticipates = state.currentUserParticipates;
  const setupError = state.setupError;
  const profileLabel = profile?.displayName || userEmail;

  const filteredRecommendations = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();

    return recommendations.filter((book) => {
      const genre = String(book.genre || "").trim();
      const matchesGenre = activeFilter === "all" || genre === activeFilter;
      const matchesSearch =
        !query ||
        [book.title, book.author, book.recommender, book.genre, book.reason].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      return matchesGenre && matchesSearch;
    });
  }, [activeFilter, bookSearch, recommendations]);

  const recommendationGenres = useMemo(() => {
    const genres = recommendations
      .map((book) => String(book.genre || "").trim())
      .filter(Boolean);

    return [...new Set(genres)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [recommendations]);

  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => b.votes - a.votes);
  }, [suggestions]);

  const latestDraw = history[0];

  useEffect(() => {
    if (activeFilter !== "all" && !recommendationGenres.includes(activeFilter)) {
      setActiveFilter("all");
    }
  }, [activeFilter, recommendationGenres]);

  useEffect(() => {
    const availableBookIds = recommendations.map((book) => book.id);

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
    activeReadingProgress,
    addCheckin,
    filteredRecommendations,
    checkins,
    currentUserId: profile?.id || "",
    currentUserParticipates,
    isPending: isPending || Boolean(setupError),
    leaderboard,
    latestDraw,
    profile,
    profiles,
    discordHandles,
    recommendationGenres,
    bookSearch,
    recommendations,
    saveProfile,
    setActiveFilter,
    setBookSearch,
    selectedDrawBookIds,
    setSelectedDrawBookIds,
    sortedSuggestions,
    suggestions,
    cycles,
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
            <Image className="brand-logo" src={brandLogo} alt="" width={40} height={40} />
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
          <Link
            className={`user-profile-link${pathname === "/perfil" ? " is-active" : ""}`}
            href="/perfil"
            aria-label="Abrir perfil"
          >
            {profileLabel}
          </Link>
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
  currentUserId,
  filteredRecommendations,
  isPending,
  recommendationGenres,
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
              placeholder="Título, autor, gênero, indicação ou motivo"
              onChange={(event) => setBookSearch(event.target.value)}
            />
          </label>
          <Link className="button button-secondary" href="/sugestoes">
            Sugerir livro
          </Link>
        </div>

        <div className="toolbar" aria-label="Filtros de gêneros">
          <FilterButton active={activeFilter === "all"} onClick={() => setActiveFilter("all")}>
            Todos
          </FilterButton>
          {recommendationGenres.map((genre) => (
            <FilterButton key={genre} active={activeFilter === genre} onClick={() => setActiveFilter(genre)}>
              {genre}
            </FilterButton>
          ))}
        </div>

        <div className="book-grid" aria-live="polite">
          {filteredRecommendations.length ? (
            filteredRecommendations.map((book) => (
              <RecommendationCard
                key={book.id}
                book={book}
                currentUserId={currentUserId}
                disabled={isPending}
                onEdit={(formData, onSuccess) =>
                  runAction(() => updateRecommendationAction(formData), { onSuccess })
                }
                onProgress={(formData) => runAction(() => updateBookProgressAction(formData))}
                onRemove={() => runAction(() => deleteRecommendationAction(book.id))}
                onToggleRead={() => runAction(() => toggleRecommendationReadAction(book.id, !book.isRead))}
                onAddReview={(formData, onSuccess) =>
                  runAction(() => createBookReviewAction(formData), { onSuccess })
                }
                onDeleteReview={(reviewId) => runAction(() => deleteBookReviewAction(reviewId))}
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

function SuggestionsPage({
  currentUserId,
  isPending,
  sortedSuggestions,
  addSuggestion,
  runAction,
  discordHandles = []
}) {
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
          <div className="field-pair">
            <Field label="Gênero" name="genre" placeholder="Fantasia, suspense, biografia..." required />
            <Field
              label="Link do Google Drive"
              name="fileUrl"
              type="url"
              inputMode="url"
              placeholder="https://drive.google.com/..."
            />
          </div>
          <Field
            label="Link da capa"
            name="coverUrl"
            type="url"
            inputMode="url"
            placeholder="https://.../capa.jpg"
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
                currentUserId={currentUserId}
                disabled={isPending}
                onPromote={() => runAction(() => promoteSuggestionToRecommendationAction(suggestion.id))}
                onVote={() => runAction(() => voteSuggestionAction(suggestion.id))}
                onRemove={() => runAction(() => deleteSuggestionAction(suggestion.id))}
                onAddComment={(formData, onSuccess) =>
                  runAction(() => createSuggestionCommentAction(formData), { onSuccess })
                }
                onDeleteComment={(commentId) => runAction(() => deleteSuggestionCommentAction(commentId))}
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
  activeReadingProgress,
  currentUserParticipates,
  cycles = [],
  isPending,
  joinReadingCycle,
  leaveReadingCycle,
  recommendations,
  selectedDrawBookIds,
  setSelectedDrawBookIds,
  runAction
}) {
  const [drawBookSearch, setDrawBookSearch] = useState("");
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const activeCycleDetailed = cycles.find((cycle) => cycle.id === activeCycle?.id) || null;
  const activeCycleParticipants = activeCycleDetailed?.participants ?? [];
  const pastCycles = cycles.filter((cycle) => cycle.id !== activeCycle?.id);
  const availableBooks = recommendations;
  const readBooks = [];
  const drawQuery = drawBookSearch.trim().toLowerCase();
  const visibleAvailableBooks = availableBooks.filter((book) => {
    return (
      !drawQuery ||
      [book.title, book.author, book.genre, book.recommender, book.reason].some((value) =>
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
          kicker="Leituras"
          title="A leitura atual do grupo"
          copy="Veja qual livro a tropa está lendo agora, entre na leitura quando quiser e acompanhe o histórico de quem participou de cada rodada."
          id="draw-title"
        />

        <div className="draw-hero" aria-live="polite">
          <div className="draw-hero-main">
            <span className="draw-hero-kicker">
              {activeCycle ? "Lendo agora" : "Nenhuma leitura em andamento"}
            </span>
            <p className="draw-hero-result">
              {activeCycle
                ? `${activeCycle.bookTitle}, de ${activeCycle.bookAuthor}`
                : "Sorteie um livro abaixo para abrir a próxima leitura"}
            </p>
            <div className="draw-hero-status">
              {activeCycle ? (
                <>
                  <span>
                    {cycleConfigured
                      ? getCycleRulesSummary(activeCycle)
                      : "Aguardando o grupo definir início, encontros e metas."}
                  </span>
                  <div className="draw-hero-actions">
                    <button
                      className={currentUserParticipates ? "button button-danger" : "button button-primary"}
                      type="button"
                      disabled={isPending}
                      onClick={currentUserParticipates ? leaveReadingCycle : joinReadingCycle}
                    >
                      {currentUserParticipates ? "Sair da leitura" : "Entrar na leitura"}
                    </button>
                    <button
                      className="button button-ghost"
                      type="button"
                      onClick={() => setIsRoutineModalOpen(true)}
                    >
                      Editar rotina
                    </button>
                  </div>
                </>
              ) : (
                <span>Monte a lista ao lado e gire o sorteio para abrir uma nova rodada.</span>
              )}
            </div>
          </div>
          <div className="draw-hero-stats">
            <HeroStat value={availableBooks.length} label="elegíveis" />
            <HeroStat value={activeCycleParticipants.length} label="participando" />
            <HeroStat value={activeReadingProgress.length} label="leitores" />
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
                        <small>
                          {book.author} · {book.genre || "Sem gênero"} · indicado por {book.recommender}
                        </small>
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
                        <small>{book.author} · {book.genre || "Sem gênero"} · já lido</small>
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
                Sortear nova leitura ({selectedCount})
              </button>
              <small>
                O sorteio escolhe um título aleatório entre os selecionados e abre a nova leitura.
              </small>
            </div>
          </div>

          <aside className="draw-rail">
            {activeCycle ? (
              <div className="panel rail-card volunteer-card">
                <div>
                  <span className="summary-label">Quem está nessa leitura</span>
                  <h3>{activeCycleParticipants.length} participante(s)</h3>
                  <p>Entra na leitura quem quiser acompanhar esse livro, a qualquer momento.</p>
                </div>
                <div className="participant-list">
                  {activeCycleParticipants.length ? (
                    activeCycleParticipants.map((participant) => (
                      <ParticipantRow key={participant.id} participant={participant} />
                    ))
                  ) : (
                    <EmptyState message="Ninguém entrou ainda. Seja o primeiro." />
                  )}
                </div>
              </div>
            ) : null}

            {activeCycle ? (
              <div className="panel rail-card reading-progress-card">
                <span className="summary-label">Progresso da leitura</span>
                <div className="reading-progress-list">
                  {activeReadingProgress.length ? (
                    activeReadingProgress.map((reader) => (
                      <ProgressRow key={reader.userId || reader.id} progress={reader} />
                    ))
                  ) : (
                    <EmptyState message="O progresso aparece quando a leitura tiver participantes." />
                  )}
                </div>
              </div>
            ) : null}

            <div className="panel rail-card history-card">
              <span className="summary-label">Histórico de leituras</span>
              <p className="rail-card-hint">Abra uma leitura anterior para ver quem participou e quando entrou.</p>
              <div className="reading-history-list" aria-label="Histórico de leituras">
                {pastCycles.length ? (
                  pastCycles.map((cycle) => <ReadingHistoryCard key={cycle.id} cycle={cycle} />)
                ) : (
                  <EmptyState message="Nenhuma leitura anterior registrada ainda." />
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

function ProgressRow({ progress }) {
  const name = progress.displayName || progress.discordHandle || "Leitor da tropa";

  return (
    <div className="progress-row">
      <div className="progress-row-head">
        <strong>{name}</strong>
        <span>{progress.percent}%</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <small>
        Pagina {progress.currentPage} · {progress.dailyPages} paginas hoje
      </small>
    </div>
  );
}

function ParticipantRow({ participant }) {
  const name = participant.displayName || participant.discordHandle || "Leitor da tropa";
  const readingSummary = getParticipantReadingSummary(participant);

  return (
    <div className="participant-row">
      <div className="participant-row-head">
        <strong>{name}</strong>
        {participant.joinedAt ? <span>entrou em {formatDateTime(participant.joinedAt)}</span> : null}
      </div>
      <small className={`participant-reading${participant.finishedAt ? " is-done" : ""}`}>
        {readingSummary}
      </small>
    </div>
  );
}

function getParticipantReadingSummary(participant) {
  if (participant.finishedAt) {
    return participant.startedAt
      ? `Leu de ${formatDateTime(participant.startedAt)} até ${formatDateTime(participant.finishedAt)}`
      : `Terminou em ${formatDateTime(participant.finishedAt)}`;
  }
  if (participant.startedAt) {
    return `Começou em ${formatDateTime(participant.startedAt)} · em andamento`;
  }
  return "Ainda não registrou progresso neste livro";
}

function ReadingHistoryCard({ cycle }) {
  const [isOpen, setIsOpen] = useState(false);
  const participants = cycle.participants || [];
  const statusLabel = getCycleStatusLabel(cycle.status);

  return (
    <div className={`reading-history-item${isOpen ? " is-open" : ""}`}>
      <button
        className="reading-history-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="reading-history-info">
          <strong>{cycle.bookTitle}</strong>
          <small>
            {cycle.bookAuthor} · {participants.length} participante(s)
            {statusLabel ? ` · ${statusLabel}` : ""}
          </small>
        </span>
        <span className="reading-history-chevron" aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div className="participant-list">
          {participants.length ? (
            participants.map((participant) => (
              <ParticipantRow key={participant.id} participant={participant} />
            ))
          ) : (
            <EmptyState message="Sem participantes registrados nessa leitura." />
          )}
        </div>
      ) : null}
    </div>
  );
}

function getCycleStatusLabel(status) {
  if (status === "active") return "em andamento";
  if (status === "planning") return "aguardando regras";
  if (status === "finished") return "encerrada";
  return "";
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

function RecommendationCard({
  book,
  currentUserId,
  disabled,
  onEdit,
  onProgress,
  onRemove,
  onToggleRead,
  onAddReview,
  onDeleteReview
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const progress = book.progress || { currentPage: 0, dailyPages: 0, percent: 0 };
  const reviews = book.reviews || [];
  const progressSummary = book.isRead
    ? "Lido"
    : book.pages
      ? `${progress.percent}% · pagina ${progress.currentPage} de ${book.pages}`
      : progress.currentPage
        ? `Pagina ${progress.currentPage} (defina o total de paginas para ver o %)`
        : "Sem progresso ainda";

  const submitEdit = (event) => {
    event.preventDefault();
    onEdit(new FormData(event.currentTarget), () => setIsEditing(false));
  };

  const submitProgress = (formData) => {
    onProgress(formData);
    setIsProgressOpen(false);
  };

  if (isEditing) {
    return (
      <form className="book-card book-card-edit" onSubmit={submitEdit}>
        <input type="hidden" name="id" value={book.id} />
        <header>
          <span className="summary-label">Editar livro</span>
          <h3>{book.title}</h3>
        </header>
        <div className="field-pair">
          <Field label="Titulo" name="title" defaultValue={book.title} required />
          <Field label="Autor" name="author" defaultValue={book.author} required />
        </div>
        <div className="field-pair">
          <Field label="Genero" name="genre" defaultValue={book.genre} required />
          <Field label="Paginas" name="pages" type="number" min="1" max="5000" defaultValue={book.pages || ""} />
        </div>
        <Field
          label="Link do Google Drive"
          name="fileUrl"
          type="url"
          inputMode="url"
          defaultValue={book.fileUrl}
        />
        <Field
          label="Link da capa"
          name="coverUrl"
          type="url"
          inputMode="url"
          defaultValue={book.coverUrl}
        />
        <Textarea label="Motivo" name="reason" rows="4" defaultValue={book.reason} required />
        <div className="card-actions">
          <button className="button button-primary" type="submit" disabled={disabled}>
            Salvar
          </button>
          <button className="button button-secondary" type="button" onClick={() => setIsEditing(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="book-card book-card-compact">
      <div className="book-card-top">
        {book.coverUrl ? (
          <img className="book-cover" src={book.coverUrl} alt={`Capa de ${book.title}`} loading="lazy" />
        ) : (
          <div className="book-cover book-cover-placeholder" aria-hidden="true">
            {book.title.charAt(0)}
          </div>
        )}
        <header>
          <div className="card-tags">
            <span className={`tag ${book.genre ? "tag-genre" : "tag-muted"}`}>
              {book.genre || "Sem genero"}
            </span>
            <span className={`tag ${book.isRead ? "tag-read" : "tag-unread"}`}>
              {book.isRead ? "Lido" : "Nao lido"}
            </span>
          </div>
          <h3>{book.title}</h3>
          <span className="meta-line">
            {book.author} · {book.pages ? `${book.pages} paginas · ` : ""}indicado por {book.recommender}
          </span>
        </header>
      </div>

      <div className="book-progress-bar" aria-label={`Progresso de leitura: ${progressSummary}`}>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${book.isRead ? 100 : progress.percent}%` }} />
        </div>
        <small>{progressSummary}</small>
      </div>

      <div className="card-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={disabled}
          onClick={() => setIsProgressOpen(true)}
        >
          Registrar progresso
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={disabled}
          onClick={() => setIsReviewsOpen(true)}
        >
          Resenhas{reviews.length ? ` (${reviews.length})` : ""}
        </button>
        <button className="button button-secondary" type="button" disabled={disabled} onClick={onToggleRead}>
          {book.isRead ? "Marcar nao lido" : "Marcar lido"}
        </button>
        {book.canEdit ? (
          <>
            <button className="button button-secondary" type="button" disabled={disabled} onClick={() => setIsEditing(true)}>
              Editar
            </button>
            <button className="button button-danger" type="button" disabled={disabled} onClick={onRemove}>
              Remover
            </button>
          </>
        ) : null}
      </div>

      {isReviewsOpen ? (
        <ReviewsModal
          book={book}
          reviews={reviews}
          myReview={book.myReview}
          currentUserId={currentUserId}
          disabled={disabled}
          onClose={() => setIsReviewsOpen(false)}
          onAddReview={onAddReview}
          onDeleteReview={onDeleteReview}
        />
      ) : null}

      {isProgressOpen ? (
        <BookProgressModal
          book={book}
          progress={progress}
          disabled={disabled}
          onClose={() => setIsProgressOpen(false)}
          onSubmit={submitProgress}
        />
      ) : null}
    </article>
  );
}

function BookProgressModal({ book, progress, disabled, onClose, onSubmit }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

  const pageTotal = book.pages ? ` de ${book.pages}` : "";
  const modalSummary = book.pages
    ? `Pagina ${progress.currentPage}${pageTotal} · ${progress.percent}% concluido · ${progress.dailyPages} paginas hoje`
    : `Pagina ${progress.currentPage} · ${progress.dailyPages} paginas hoje · defina o total de paginas no "Editar" para acompanhar o %`;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel progress-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="summary-label">Seu progresso</span>
            <h2 id="progress-modal-title">{book.title}</h2>
            <p>{modalSummary}</p>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar modal" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${book.isRead ? 100 : progress.percent}%` }} />
        </div>

        <form className="progress-modal-form" onSubmit={submit}>
          <input type="hidden" name="recommendationId" value={book.id} />
          <Field
            label="Pagina atual"
            name="currentPage"
            type="number"
            min="0"
            max={book.pages || 5000}
            defaultValue={progress.currentPage}
          />
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button button-primary" type="submit" disabled={disabled}>
              Salvar progresso
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ReviewsModal({
  book,
  reviews,
  myReview,
  currentUserId,
  disabled,
  onClose,
  onAddReview,
  onDeleteReview
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    onAddReview(new FormData(form), () => form.reset());
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel reviews-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="summary-label">Resenhas da tropa</span>
            <h2 id="reviews-modal-title">{book.title}</h2>
            <p>Cada resenha vale pontos no seu perfil. Uma resenha por livro.</p>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar modal" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="review-list">
          {reviews.length ? (
            reviews.map((review) => (
              <article className="review-item" key={review.id}>
                <div className="review-head">
                  <strong>{review.author}</strong>
                  <span>{formatDate(review.createdAt)}</span>
                </div>
                <p>{review.content}</p>
                {review.userId === currentUserId ? (
                  <button
                    className="link-button"
                    type="button"
                    disabled={disabled}
                    onClick={() => onDeleteReview(review.id)}
                  >
                    Remover resenha
                  </button>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyState message="Nenhuma resenha ainda. Seja o primeiro calvo a opinar." />
          )}
        </div>

        {myReview ? (
          <p className="review-note">Você já publicou sua resenha desse livro.</p>
        ) : (
          <form className="reviews-modal-form" onSubmit={submit}>
            <input type="hidden" name="recommendationId" value={book.id} />
            <Textarea
              label="Sua resenha"
              name="content"
              rows="4"
              placeholder="O que você achou da leitura?"
              required
            />
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={onClose}>
                Fechar
              </button>
              <button className="button button-primary" type="submit" disabled={disabled}>
                Publicar resenha
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function SuggestionItem({
  suggestion,
  currentUserId,
  disabled,
  onPromote,
  onVote,
  onRemove,
  onAddComment,
  onDeleteComment
}) {
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const pages = suggestion.pages ? `${suggestion.pages} páginas · ` : "";
  const comments = suggestion.comments || [];

  return (
    <article className="suggestion-item">
      <div className="suggestion-main">
        {suggestion.coverUrl ? (
          <img
            className="suggestion-cover"
            src={suggestion.coverUrl}
            alt={`Capa de ${suggestion.title}`}
            loading="lazy"
          />
        ) : null}
        <header>
          <h3>{suggestion.title}</h3>
          {suggestion.genre ? <span className="tag tag-genre">{suggestion.genre}</span> : null}
          <span className="meta-line">
            {suggestion.author} · {pages}sugerido por {suggestion.suggestedBy}
          </span>
          <p>{suggestion.pitch}</p>
          {suggestion.fileUrl ? (
            <a className="file-link" href={suggestion.fileUrl} target="_blank" rel="noreferrer">
              Abrir arquivo
            </a>
          ) : null}
          <button
            className="link-button"
            type="button"
            disabled={disabled}
            onClick={() => setIsDiscussionOpen(true)}
          >
            Discussão{comments.length ? ` (${comments.length})` : ""}
          </button>
        </header>
      </div>
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

      {isDiscussionOpen ? (
        <DiscussionModal
          suggestion={suggestion}
          comments={comments}
          currentUserId={currentUserId}
          disabled={disabled}
          onClose={() => setIsDiscussionOpen(false)}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      ) : null}
    </article>
  );
}

function DiscussionModal({
  suggestion,
  comments,
  currentUserId,
  disabled,
  onClose,
  onAddComment,
  onDeleteComment
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    onAddComment(new FormData(form), () => form.reset());
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel discussion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discussion-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="summary-label">Discussão</span>
            <h2 id="discussion-modal-title">{suggestion.title}</h2>
            <p>Debata a indicação com a tropa antes de virar acervo.</p>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar modal" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="thread-list">
          {comments.length ? (
            comments.map((comment) => (
              <article className="thread-item" key={comment.id}>
                <div className="thread-head">
                  <strong>{comment.author}</strong>
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
                <p>{comment.content}</p>
                {comment.userId === currentUserId ? (
                  <button
                    className="link-button"
                    type="button"
                    disabled={disabled}
                    onClick={() => onDeleteComment(comment.id)}
                  >
                    Remover
                  </button>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyState message="Nenhuma mensagem ainda. Comece a discussão." />
          )}
        </div>

        <form className="discussion-modal-form" onSubmit={submit}>
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <Textarea
            label="Sua mensagem"
            name="content"
            rows="3"
            placeholder="Escreva um comentário para a tropa..."
            required
          />
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>
              Fechar
            </button>
            <button className="button button-primary" type="submit" disabled={disabled}>
              Enviar mensagem
            </button>
          </div>
        </form>
      </section>
    </div>
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
    activeReadingProgress: state?.activeReadingProgress ?? [],
    currentUserParticipates: state?.currentUserParticipates ?? false,
    setupError: state?.setupError ?? ""
  };
}
