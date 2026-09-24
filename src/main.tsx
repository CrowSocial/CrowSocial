import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Crown,
  Heart,
  Home,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { createClient, type Session } from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type Role = "USER" | "MODERATOR" | "ADMIN" | "OWNER";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: Role;
  verified: boolean;
  suspended: boolean;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles?: Profile | Profile[] | null;
  likes?: number;
  liked?: boolean;
};

type Page =
  | "home"
  | "search"
  | "messages"
  | "notifications"
  | "profile"
  | "settings"
  | "admin"
  | "owner";

function getProfileObject(
  profile: Profile | Profile[] | null | undefined,
): Profile | null {
  if (!profile) return null;
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

function BadgeRow({ profile }: { profile: Profile }) {
  return (
    <span className="badge-row">
      {profile.verified && (
        <span className="verified-badge" title="Verifiziert">
          <CheckCircle2 size={15} />
        </span>
      )}

      {(profile.role === "ADMIN" ||
        profile.role === "MODERATOR" ||
        profile.role === "OWNER") && (
        <span className="admin-badge" title="Team">
          <Shield size={14} />
        </span>
      )}

      {profile.role === "OWNER" && (
        <span className="owner-badge" title="Owner">
          <Crown size={14} />
        </span>
      )}
    </span>
  );
}

function Avatar({
  profile,
  size = 42,
}: {
  profile: Profile;
  size?: number;
}) {
  if (profile.avatar_url) {
    return (
      <img
        className="avatar"
        src={profile.avatar_url}
        alt={profile.display_name}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: "50%",
        }}
      />
    );
  }

  return (
    <div
      className="avatar avatar-fallback"
      style={{
        width: size,
        height: size,
      }}
    >
      {(
        profile.display_name?.charAt(0) ||
        profile.username?.charAt(0) ||
        "C"
      ).toUpperCase()}
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PostCard({
  post,
  currentUserId,
  onLike,
}: {
  post: Post;
  currentUserId?: string;
  onLike: (post: Post) => void;
}) {
  const profile = getProfileObject(post.profiles);

  if (!profile) return null;

  return (
    <article className="post">
      <div className="post-head">
        <Avatar profile={profile} size={46} />

        <div className="post-author">
          <div className="post-name">
            <strong>{profile.display_name}</strong>
            <BadgeRow profile={profile} />
          </div>

          <div className="post-username">
            @{profile.username} · {formatDate(post.created_at)}
          </div>
        </div>

        <button className="icon-btn" type="button">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {post.content && <p className="post-content">{post.content}</p>}

      {post.image_url && (
        <img
          className="post-image"
          src={post.image_url}
          alt="Beitrag"
        />
      )}

      <div className="post-actions">
        <button
          className={`post-action ${post.liked ? "liked" : ""}`}
          onClick={() => onLike(post)}
          disabled={!currentUserId}
          type="button"
        >
          <Heart
            size={19}
            fill={post.liked ? "currentColor" : "none"}
          />
          <span>{post.likes ?? 0}</span>
        </button>

        <button className="post-action" type="button">
          <MessageCircle size={19} />
          <span>Kommentieren</span>
        </button>

        <button className="post-action" type="button">
          <Send size={18} />
          <span>Teilen</span>
        </button>
      </div>
    </article>
  );
}

function AuthScreen({
  onLogin,
}: {
  onLogin: (session: Session) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setError("Supabase ist nicht konfiguriert.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onLogin(data.session);
        }
      } else {
        if (!username.trim()) {
          throw new Error("Bitte gib einen Benutzernamen ein.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              display_name: displayName.trim() || username.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          onLogin(data.session);
        } else {
          setMessage(
            "Registrierung erfolgreich. Falls eine E-Mail-Bestätigung aktiviert ist, prüfe dein Postfach.",
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="authcard">
        <div className="brand">
          <div className="brand-icon">C</div>

          <div>
            <h1>CrowSocial</h1>
            <p>Dein soziales Netzwerk</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Anmelden
          </button>

          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Registrieren
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>Benutzername</label>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z. B. crowit"
                autoComplete="username"
              />

              <label>Anzeigename</label>

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dein Name"
              />
            </>
          )}

          <label>E-Mail</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.de"
            autoComplete="email"
          />

          <label>Passwort</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />

          {error && <div className="error-box">{error}</div>}

          {message && <div className="success-box">{message}</div>}

          <button className="primary-btn" disabled={loading}>
            {loading
              ? "Bitte warten..."
              : mode === "login"
                ? (
                  <>
                    <LogIn size={18} />
                    Anmelden
                  </>
                )
                : "Account erstellen"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   PROFIL BEARBEITEN
   ========================================================= */

function ProfileEditModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
}) {
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");

  // Wichtig:
  // KEIN avatarUrl-Eingabefeld mehr.
  // Der Benutzer wählt ausschließlich eine Datei aus.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    profile.avatar_url ?? null,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(profile.avatar_url ?? null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);

    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile, profile.avatar_url]);

  async function uploadAvatar(): Promise<string | null> {
    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    // Kein neues Bild ausgewählt:
    // bisheriges Profilbild behalten.
    if (!avatarFile) {
      return profile.avatar_url ?? null;
    }

    if (!avatarFile.type.startsWith("image/")) {
      throw new Error("Bitte wähle eine Bilddatei aus.");
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      throw new Error("Das Profilbild darf maximal 5 MB groß sein.");
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(avatarFile.type)) {
      throw new Error(
        "Erlaubt sind nur PNG, JPG, WEBP oder GIF.",
      );
    }

    const extension =
      avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const filePath = `${profile.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: avatarFile.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setError("Supabase ist nicht konfiguriert.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const finalAvatarUrl = await uploadAvatar();

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
          bio: bio.trim(),
          website: website.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq("id", profile.id)
        .select(
          "id, username, display_name, avatar_url, bio, website, role, verified, suspended",
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      onSaved(data as Profile);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Profil konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h2>Profil bearbeiten</h2>

          <button
            className="icon-btn"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={saveProfile}>
          {/* PROFILBILD */}

          <div className="avatar-upload">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profilbild Vorschau"
                className="profile-preview"
              />
            ) : (
              <div className="profile-preview profile-preview-empty">
                <CircleUserRound size={45} />
              </div>
            )}

            <div>
              <strong>Profilbild</strong>

              <p className="muted">
                PNG, JPG, WEBP oder GIF · maximal 5 MB
              </p>

              <label className="secondary-btn file-btn">
                <ImageIcon size={17} />
                Bild auswählen

                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;

                    if (!file) {
                      return;
                    }

                    if (!file.type.startsWith("image/")) {
                      setError("Bitte wähle eine Bilddatei aus.");
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      setError(
                        "Das Profilbild darf maximal 5 MB groß sein.",
                      );
                      return;
                    }

                    setError("");
                    setAvatarFile(file);
                  }}
                />
              </label>

              {avatarFile && (
                <p className="muted">
                  Ausgewählt: {avatarFile.name}
                </p>
              )}
            </div>
          </div>

          <label>Benutzername</label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Anzeigename</label>

          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <label>Bio</label>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Erzähl etwas über dich..."
            rows={4}
          />

          <label>Website</label>

          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
          />

          {error && <div className="error-box">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Abbrechen
            </button>

            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
  page,
  setPage,
  profile,
  logout,
}: {
  page: Page;
  setPage: (page: Page) => void;
  profile: Profile;
  logout: () => void;
}) {
  const items: {
    page: Page;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      page: "home",
      label: "Startseite",
      icon: <Home size={20} />,
    },
    {
      page: "search",
      label: "Suchen",
      icon: <Search size={20} />,
    },
    {
      page: "messages",
      label: "Nachrichten",
      icon: <MessageCircle size={20} />,
    },
    {
      page: "notifications",
      label: "Benachrichtigungen",
      icon: <Bell size={20} />,
    },
    {
      page: "profile",
      label: "Profil",
      icon: <CircleUserRound size={20} />,
    },
    {
      page: "settings",
      label: "Einstellungen",
      icon: <Settings size={20} />,
    },
  ];

  return (
    <aside>
      <div className="logo">
        <div className="logo-mark">C</div>
        <span>CrowSocial</span>
      </div>

      <nav>
        {items.map((item) => (
          <button
            key={item.page}
            className={page === item.page ? "active" : ""}
            onClick={() => setPage(item.page)}
            type="button"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {(profile.role === "ADMIN" ||
          profile.role === "OWNER" ||
          profile.role === "MODERATOR") && (
          <button
            className={page === "admin" ? "active" : ""}
            onClick={() => setPage("admin")}
            type="button"
          >
            <Shield size={20} />
            <span>Admin</span>
          </button>
        )}

        {profile.role === "OWNER" && (
          <button
            className={page === "owner" ? "active" : ""}
            onClick={() => setPage("owner")}
            type="button"
          >
            <Crown size={20} />
            <span>Owner</span>
          </button>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="mini-profile">
          <Avatar profile={profile} size={38} />

          <div>
            <strong>{profile.display_name}</strong>
            <span>@{profile.username}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout} type="button">
          <LogOut size={18} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   HOME
   ========================================================= */

function HomePage({
  profile,
  posts,
  content,
  setContent,
  createPost,
  loading,
  onLike,
}: {
  profile: Profile;
  posts: Post[];
  content: string;
  setContent: (value: string) => void;
  createPost: () => void;
  loading: boolean;
  onLike: (post: Post) => void;
}) {
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Startseite</h1>
          <p>Was gibt es Neues?</p>
        </div>
      </div>

      <div className="composer">
        <Avatar profile={profile} size={46} />

        <div className="composer-body">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Was möchtest du teilen?"
            rows={3}
          />

          <div className="composer-bottom">
            <button className="secondary-btn" type="button">
              <ImageIcon size={18} />
              Bild
            </button>

            <button
              className="primary-btn"
              onClick={createPost}
              disabled={loading || !content.trim()}
              type="button"
            >
              {loading ? "Postet..." : "Posten"}
            </button>
          </div>
        </div>
      </div>

      <div className="feed">
        {posts.length === 0 ? (
          <div className="empty">
            <MessageCircle size={38} />

            <h3>Noch keine Beiträge</h3>

            <p>
              Sei der Erste und veröffentliche einen Beitrag.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={profile.id}
              onLike={onLike}
            />
          ))
        )}
      </div>
    </>
  );
}

/* =========================================================
   SEARCH
   ========================================================= */

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!supabase || !query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const value = query.trim().replace(/[%_]/g, "");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, website, role, verified, suspended",
        )
        .or(
          `username.ilike.%${value}%,display_name.ilike.%${value}%`,
        )
        .limit(20);

      if (error) throw error;

      setResults((data ?? []) as Profile[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Suchen</h1>
          <p>Finde Personen auf CrowSocial.</p>
        </div>
      </div>

      <div className="search-box">
        <Search size={20} />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
          placeholder="Benutzername oder Name..."
        />

        <button className="primary-btn" onClick={search} type="button">
          Suchen
        </button>
      </div>

      {loading && <div className="loading">Suche läuft...</div>}

      <div className="search-results">
        {results.map((user) => (
          <div className="user-card" key={user.id}>
            <Avatar profile={user} size={50} />

            <div className="user-card-info">
              <div className="post-name">
                <strong>{user.display_name}</strong>
                <BadgeRow profile={user} />
              </div>

              <span>@{user.username}</span>

              {user.bio && <p>{user.bio}</p>}
            </div>

            <button className="secondary-btn" type="button">
              <UserPlus size={17} />
              Folgen
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* =========================================================
   SIMPLE PAGE
   ========================================================= */

function SimplePage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon">{icon}</div>

      <h1>{title}</h1>

      <p>{description}</p>
    </div>
  );
}

/* =========================================================
   PROFILE PAGE
   ========================================================= */

function ProfilePage({
  profile,
  onEdit,
}: {
  profile: Profile;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="profile-cover" />

      <div className="profile-header">
        <div className="profile-avatar-large">
          <Avatar profile={profile} size={110} />
        </div>

        <div className="profile-header-main">
          <div className="profile-name-line">
            <h1>{profile.display_name}</h1>
            <BadgeRow profile={profile} />
          </div>

          <p className="profile-username">
            @{profile.username}
          </p>

          {profile.bio && (
            <p className="profile-bio">{profile.bio}</p>
          )}

          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="profile-website"
            >
              {profile.website}
            </a>
          )}
        </div>

        <button
          className="secondary-btn"
          onClick={onEdit}
          type="button"
        >
          Profil bearbeiten
        </button>
      </div>

      <div className="profile-stats">
        <div>
          <strong>0</strong>
          <span>Beiträge</span>
        </div>

        <div>
          <strong>0</strong>
          <span>Follower</span>
        </div>

        <div>
          <strong>0</strong>
          <span>Folge ich</span>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

function SettingsPage() {
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Einstellungen</h1>
          <p>Verwalte deinen CrowSocial-Account.</p>
        </div>
      </div>

      <div className="settings-list">
        <div className="settings-item">
          <div>
            <strong>Account</strong>
            <p>
              Deine persönlichen Account-Einstellungen.
            </p>
          </div>

          <ChevronRight size={20} />
        </div>

        <div className="settings-item">
          <div>
            <strong>Datenschutz</strong>
            <p>
              Verwalte deine Sichtbarkeit und Privatsphäre.
            </p>
          </div>

          <ChevronRight size={20} />
        </div>

        <div className="settings-item">
          <div>
            <strong>Benachrichtigungen</strong>
            <p>
              Lege fest, wann du Benachrichtigungen erhältst.
            </p>
          </div>

          <ChevronRight size={20} />
        </div>
      </div>
    </>
  );
}

/* =========================================================
   ADMIN
   ========================================================= */

function AdminPage({ profile }: { profile: Profile }) {
  const isOwner = profile.role === "OWNER";

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Admin-Bereich</h1>
          <p>Verwaltung von CrowSocial.</p>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <Users size={28} />
          <strong>Benutzer</strong>
          <span>Benutzer verwalten</span>
        </div>

        <div className="admin-card">
          <MessageCircle size={28} />
          <strong>Beiträge</strong>
          <span>Beiträge moderieren</span>
        </div>

        <div className="admin-card">
          <Shield size={28} />
          <strong>Reports</strong>
          <span>Meldungen prüfen</span>
        </div>

        <div className="admin-card">
          <CheckCircle2 size={28} />
          <strong>Verifizierung</strong>
          <span>Verifizierungsanfragen</span>
        </div>

        {isOwner && (
          <div className="admin-card owner-card">
            <Crown size={28} />
            <strong>Owner-Verwaltung</strong>
            <span>
              Admins und Moderatoren verwalten
            </span>
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   OWNER
   ========================================================= */

function OwnerPage() {
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Owner</h1>
          <p>Vollständige CrowSocial-Verwaltung.</p>
        </div>
      </div>

      <div className="owner-banner">
        <div className="owner-icon">
          <Crown size={32} />
        </div>

        <div>
          <h2>CrowSocial Owner</h2>

          <p>
            Du hast Zugriff auf die Owner-Funktionen der
            Plattform.
          </p>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <Users size={28} />
          <strong>Admins</strong>
          <span>Administratoren verwalten</span>
        </div>

        <div className="admin-card">
          <Shield size={28} />
          <strong>Moderatoren</strong>
          <span>Moderatoren verwalten</span>
        </div>

        <div className="admin-card">
          <Settings size={28} />
          <strong>System</strong>
          <span>Plattform-Einstellungen</span>
        </div>

        <div className="admin-card">
          <Bell size={28} />
          <strong>Logs</strong>
          <span>Admin-Aktionen ansehen</span>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<Page>("home");

  const [mobileMenu, setMobileMenu] = useState(false);

  const [editProfile, setEditProfile] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);

  const [postContent, setPostContent] = useState("");

  const [posting, setPosting] = useState(false);

  async function loadProfile(userId: string) {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, website, role, verified, suspended",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return (data as Profile | null) ?? null;
  }

  async function loadPosts(userId?: string) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        user_id,
        content,
        image_url,
        created_at
      `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.error(error);
      setPosts([]);
      return;
    }

    const rawPosts = (data ?? []) as Post[];

    const userIds = [
      ...new Set(rawPosts.map((post) => post.user_id)),
    ];

    let profiles: Profile[] = [];

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, website, role, verified, suspended",
        )
        .in("id", userIds);

      profiles = (profileData ?? []) as Profile[];
    }

    let likedPostIds = new Set<string>();

    if (userId && rawPosts.length > 0) {
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in(
          "post_id",
          rawPosts.map((post) => post.id),
        );

      likedPostIds = new Set(
        (likes ?? []).map(
          (item) => item.post_id as string,
        ),
      );
    }

    const postsWithProfiles = rawPosts.map((post) => ({
      ...post,
      profiles:
        profiles.find((p) => p.id === post.user_id) ??
        null,
      liked: likedPostIds.has(post.id),
    }));

    const postIds = rawPosts.map((post) => post.id);

    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);

      const counts = new Map<string, number>();

      for (const like of likes ?? []) {
        const postId = like.post_id as string;

        counts.set(
          postId,
          (counts.get(postId) ?? 0) + 1,
        );
      }

      setPosts(
        postsWithProfiles.map((post) => ({
          ...post,
          likes: counts.get(post.id) ?? 0,
        })),
      );
    } else {
      setPosts(postsWithProfiles);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function init() {
      const { data } = await supabase!.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        setSession(data.session);

        const loadedProfile = await loadProfile(
          data.session.user.id,
        );

        if (!mounted) return;

        setProfile(loadedProfile);

        if (loadedProfile) {
          await loadPosts(data.session.user.id);
        }
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession) {
          const loadedProfile = await loadProfile(
            newSession.user.id,
          );

          if (!mounted) return;

          setProfile(loadedProfile);

          if (loadedProfile) {
            await loadPosts(newSession.user.id);
          }
        } else {
          setProfile(null);
          setPosts([]);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function createPost() {
    if (!supabase || !session || !postContent.trim()) {
      return;
    }

    setPosting(true);

    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: session.user.id,
          content: postContent.trim(),
          image_url: null,
        });

      if (error) throw error;

      setPostContent("");

      await loadPosts(session.user.id);
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Beitrag konnte nicht erstellt werden.",
      );
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(post: Post) {
    if (!supabase || !session) return;

    try {
      if (post.liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: post.id,
          user_id: session.user.id,
        });
      }

      await loadPosts(session.user.id);
    } catch (err) {
      console.error(err);
    }
  }

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setPosts([]);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">C</div>

        <strong>CrowSocial</strong>

        <span>Wird geladen...</span>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="loading-screen">
        <h1>CrowSocial</h1>

        <p>Supabase ist nicht konfiguriert.</p>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen onLogin={setSession} />;
  }

  function renderPage() {
    switch (page) {
      case "home":
        return (
          <HomePage
            profile={profile}
            posts={posts}
            content={postContent}
            setContent={setPostContent}
            createPost={createPost}
            loading={posting}
            onLike={toggleLike}
          />
        );

      case "search":
        return <SearchPage />;

      case "messages":
        return (
          <SimplePage
            title="Nachrichten"
            description="Deine privaten Nachrichten werden hier angezeigt."
            icon={<MessageCircle size={38} />}
          />
        );

      case "notifications":
        return (
          <SimplePage
            title="Benachrichtigungen"
            description="Hier siehst du Likes, Follows und andere Benachrichtigungen."
            icon={<Bell size={38} />}
          />
        );

      case "profile":
        return (
          <ProfilePage
            profile={profile}
            onEdit={() => setEditProfile(true)}
          />
        );

      case "settings":
        return <SettingsPage />;

      case "admin":
        return <AdminPage profile={profile} />;

      case "owner":
        return <OwnerPage />;

      default:
        return null;
    }
  }

  return (
    <div className="app">
      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <div
        className={`mobile-sidebar ${
          mobileMenu ? "open" : ""
        }`}
      >
        <Sidebar
          page={page}
          setPage={(newPage) => {
            setPage(newPage);
            setMobileMenu(false);
          }}
          profile={profile}
          logout={logout}
        />
      </div>

      <div className="desktop-sidebar">
        <Sidebar
          page={page}
          setPage={setPage}
          profile={profile}
          logout={logout}
        />
      </div>

      <main>
        <header className="mobile-header">
          <button
            className="icon-btn"
            onClick={() => setMobileMenu(true)}
            type="button"
          >
            <Menu size={23} />
          </button>

          <div className="mobile-brand">
            <div className="logo-mark">C</div>

            <strong>CrowSocial</strong>
          </div>

          <Avatar profile={profile} size={34} />
        </header>

        <div className="content">{renderPage()}</div>
      </main>

      {editProfile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setEditProfile(false)}
          onSaved={(newProfile) => {
            setProfile(newProfile);
          }}
        />
      )}
    </div>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element wurde nicht gefunden.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
