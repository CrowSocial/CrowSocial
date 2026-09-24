import React, { useEffect, useMemo, useState } from "react";
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
import {
  createClient,
  type Session,
  type User,
} from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://aohhkwtoillcygsfauwh.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_eMlH01mR1rrwTfRqIE0rnA_XTDmW8zt";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Role = "USER" | "MODERATOR" | "ADMIN" | "OWNER";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: Role;
  verified: boolean;
  suspended: boolean;
  created_at?: string;
};

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profiles?: Profile | null;
  like_count?: number;
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

function getProfileObject(value: unknown): Profile | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return (value[0] as Profile | undefined) ?? null;
  }

  return value as Profile;
}

function formatDate(date: string) {
  const value = new Date(date);
  const diff = Date.now() - value.getTime();

  if (diff < 60_000) return "gerade eben";

  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} Min.`;
  }

  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)} Std.`;
  }

  return value.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function BadgeRow({ profile }: { profile: Profile }) {
  return (
    <div className="badge-row">
      {profile.verified && (
        <span className="badge verified-badge" title="Verifiziert">
          <CheckCircle2 size={14} />
        </span>
      )}

      {(profile.role === "ADMIN" ||
        profile.role === "MODERATOR" ||
        profile.role === "OWNER") && (
        <span className="badge admin-badge" title="Team">
          <Shield size={14} />
        </span>
      )}

      {profile.role === "OWNER" && (
        <span className="badge owner-badge" title="Owner">
          <Crown size={14} />
        </span>
      )}
    </div>
  );
}

function Avatar({
  profile,
  size = 42,
}: {
  profile: Profile | null;
  size?: number;
}) {
  if (profile?.avatar_url) {
    return (
      <img
        className="avatar"
        src={profile.avatar_url}
        alt={profile.display_name || profile.username}
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <div
      className="avatar avatar-placeholder"
      style={{
        width: size,
        height: size,
      }}
    >
      <CircleUserRound size={size * 0.55} />
    </div>
  );
}

function PostCard({
  post,
  onLike,
}: {
  post: Post;
  onLike: (postId: string, liked: boolean) => void;
}) {
  const profile = getProfileObject(post.profiles);

  return (
    <article className="post-card">
      <div className="post-header">
        <Avatar profile={profile} size={44} />

        <div className="post-user">
          <div className="post-name-row">
            <strong>
              {profile?.display_name || profile?.username || "Unbekannt"}
            </strong>

            {profile && <BadgeRow profile={profile} />}
          </div>

          <span>
            @{profile?.username || "user"} · {formatDate(post.created_at)}
          </span>
        </div>

        <button className="icon-button" type="button">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {post.content && (
        <div className="post-content">
          {post.content}
        </div>
      )}

      {post.image_url && (
        <div className="post-image">
          <img src={post.image_url} alt="Beitrag" />
        </div>
      )}

      <div className="post-actions">
        <button
          type="button"
          className={`post-action ${post.liked ? "liked" : ""}`}
          onClick={() => onLike(post.id, !!post.liked)}
        >
          <Heart
            size={19}
            fill={post.liked ? "currentColor" : "none"}
          />
          <span>{post.like_count || 0}</span>
        </button>

        <button type="button" className="post-action">
          <MessageCircle size={19} />
          <span>Kommentieren</span>
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setLoading(true);

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
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error("Registrierung fehlgeschlagen.");
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            username: username.trim(),
            display_name:
              displayName.trim() || username.trim(),
            role: "USER",
            verified: false,
            suspended: false,
          });

        if (profileError) {
          throw profileError;
        }

        if (data.session) {
          onLogin(data.session);
        } else {
          setMode("login");
          setError(
            "Konto erstellt. Bitte bestätige zuerst deine E-Mail-Adresse."
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-large">
          <div className="brand-icon">🐦</div>
          <div>
            <strong>CrowSocial</strong>
            <span>Schule · Freunde · Unterhaltung</span>
          </div>
        </div>

        <h1>
          {mode === "login"
            ? "Willkommen zurück"
            : "Konto erstellen"}
        </h1>

        <p className="muted">
          {mode === "login"
            ? "Melde dich bei CrowSocial an."
            : "Erstelle dein kostenloses CrowSocial-Konto."}
        </p>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Benutzername"
                required
              />

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Anzeigename"
              />
            </>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            required
            minLength={6}
          />

          {error && <div className="error-box">{error}</div>}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              "Bitte warten..."
            ) : mode === "login" ? (
              <>
                <LogIn size={18} />
                Anmelden
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Registrieren
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          className="switch-auth"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "Noch kein Konto? Registrieren"
            : "Schon ein Konto? Anmelden"}
        </button>
      </div>
    </div>
  );
}

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
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = avatarFile
    ? URL.createObjectURL(avatarFile)
    : profile.avatar_url;

  const save = async () => {
    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url || null;

      if (avatarFile) {
        const extension =
          avatarFile.name.split(".").pop()?.toLowerCase() ||
          "jpg";

        const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: false,
            contentType: avatarFile.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        avatarUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          display_name:
            displayName.trim() || username.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (error) throw error;

      onSaved(data as Profile);
      onClose();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Profil konnte nicht gespeichert werden."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>Profil bearbeiten</h2>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="profile-preview">
          <img
            className="avatar"
            src={
              preview ||
              "https://placehold.co/100x100/png?text=C"
            }
            alt="Profil"
          />
        </div>

        <label className="file-input-label">
          Profilbild auswählen
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (!file) return;

              if (file.size > 5 * 1024 * 1024) {
                alert("Das Bild darf maximal 5 MB groß sein.");
                return;
              }

              setAvatarFile(file);
            }}
          />
        </label>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Benutzername"
        />

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Anzeigename"
        />

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Beschreibung"
          rows={4}
        />

        <button
          type="button"
          className="primary-button"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  page,
  setPage,
  profile,
  logout,
  closeMobile,
}: {
  page: Page;
  setPage: (page: Page) => void;
  profile: Profile;
  logout: () => void;
  closeMobile?: () => void;
}) {
  const go = (next: Page) => {
    setPage(next);
    closeMobile?.();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>🐦</span>
        <strong>CrowSocial</strong>
      </div>

      <nav className="nav-list">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => go("home")}
        >
          <Home size={20} />
          Startseite
        </button>

        <button
          className={page === "search" ? "active" : ""}
          onClick={() => go("search")}
        >
          <Search size={20} />
          Suchen
        </button>

        <button
          className={page === "messages" ? "active" : ""}
          onClick={() => go("messages")}
        >
          <MessageCircle size={20} />
          Nachrichten
        </button>

        <button
          className={page === "notifications" ? "active" : ""}
          onClick={() => go("notifications")}
        >
          <Bell size={20} />
          Benachrichtigungen
        </button>

        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => go("profile")}
        >
          <CircleUserRound size={20} />
          Profil
        </button>

        <button
          className={page === "settings" ? "active" : ""}
          onClick={() => go("settings")}
        >
          <Settings size={20} />
          Einstellungen
        </button>

        {(profile.role === "ADMIN" ||
          profile.role === "MODERATOR" ||
          profile.role === "OWNER") && (
          <button
            className={page === "admin" ? "active" : ""}
            onClick={() => go("admin")}
          >
            <Shield size={20} />
            Admin
          </button>
        )}

        {profile.role === "OWNER" && (
          <button
            className={page === "owner" ? "active" : ""}
            onClick={() => go("owner")}
          >
            <Crown size={20} />
            Owner
          </button>
        )}
      </nav>

      <div className="sidebar-user">
        <Avatar profile={profile} size={40} />

        <div className="sidebar-user-info">
          <strong>{profile.display_name}</strong>
          <span>@{profile.username}</span>
        </div>

        <button
          className="icon-button"
          title="Abmelden"
          onClick={logout}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

function HomePage({
  posts,
  profile,
  postContent,
  setPostContent,
  postImageFile,
  setPostImageFile,
  onPost,
  onLike,
}: {
  posts: Post[];
  profile: Profile;
  postContent: string;
  setPostContent: React.Dispatch<React.SetStateAction<string>>;
  postImageFile: File | null;
  setPostImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  onPost: () => void;
  onLike: (postId: string, liked: boolean) => void;
}) {
  const imagePreview = useMemo(() => {
    if (!postImageFile) return null;
    return URL.createObjectURL(postImageFile);
  }, [postImageFile]);

  return (
    <main className="feed">
      <div className="page-title">
        <div>
          <h1>Startseite</h1>
          <p>Was gibt es Neues bei CrowSocial?</p>
        </div>
      </div>

      <section className="composer">
        <div className="composer-top">
          <Avatar profile={profile} size={44} />

          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Was gibt's Neues?"
            rows={3}
          />
        </div>

        {imagePreview && (
          <div className="post-image-preview">
            <img src={imagePreview} alt="Bildvorschau" />

            <button
              type="button"
              className="remove-image"
              onClick={() => setPostImageFile(null)}
              title="Bild entfernen"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="composer-bottom">
          <label className="image-upload-button">
            <ImageIcon size={19} />
            Bild
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) return;

                if (file.size > 8 * 1024 * 1024) {
                  alert("Das Bild darf maximal 8 MB groß sein.");
                  event.target.value = "";
                  return;
                }

                setPostImageFile(file);
              }}
            />
          </label>

          <button
            type="button"
            className="primary-button post-submit"
            disabled={!postContent.trim() && !postImageFile}
            onClick={onPost}
          >
            Posten
          </button>
        </div>
      </section>

      <section className="posts">
        {posts.length === 0 ? (
          <div className="empty-card">
            <Users size={34} />
            <h3>Noch keine Beiträge</h3>
            <p>Sei der Erste und veröffentliche einen Beitrag.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={onLike}
            />
          ))
        )}
      </section>
    </main>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setProfiles([]);
        return;
      }

      setLoading(true);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(
          `username.ilike.%${query}%,display_name.ilike.%${query}%`
        )
        .limit(20);

      setProfiles((data || []) as Profile[]);
      setLoading(false);
    };

    const timer = setTimeout(search, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <main className="feed">
      <div className="page-title">
        <h1>Suchen</h1>
      </div>

      <div className="search-box">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Personen suchen..."
        />
      </div>

      {loading && <div className="empty-card">Suche...</div>}

      {!loading &&
        profiles.map((profile) => (
          <div className="user-result" key={profile.id}>
            <Avatar profile={profile} size={48} />

            <div>
              <div className="post-name-row">
                <strong>{profile.display_name}</strong>
                <BadgeRow profile={profile} />
              </div>
              <span>@{profile.username}</span>
            </div>

            <button className="icon-button">
              <ChevronRight size={20} />
            </button>
          </div>
        ))}
    </main>
  );
}

function SimplePage({
  title,
  icon,
  text,
}: {
  title: string;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <main className="feed">
      <div className="page-title">
        <h1>{title}</h1>
      </div>

      <div className="empty-card">
        {icon}
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </main>
  );
}

function ProfilePage({
  profile,
  onEdit,
}: {
  profile: Profile;
  onEdit: () => void;
}) {
  return (
    <main className="feed">
      <section className="profile-card">
        <div className="profile-cover" />

        <div className="profile-main">
          <Avatar profile={profile} size={100} />

          <div className="profile-info">
            <div className="profile-name">
              <h1>{profile.display_name}</h1>
              <BadgeRow profile={profile} />
            </div>

            <span>@{profile.username}</span>

            {profile.bio && <p>{profile.bio}</p>}
          </div>

          <button
            className="secondary-button"
            onClick={onEdit}
          >
            Profil bearbeiten
          </button>
        </div>
      </section>
    </main>
  );
}

function SettingsPage() {
  return (
    <main className="feed">
      <div className="page-title">
        <h1>Einstellungen</h1>
      </div>

      <div className="settings-card">
        <div>
          <strong>Konto</strong>
          <span>Deine CrowSocial-Kontoeinstellungen</span>
        </div>

        <ChevronRight size={20} />
      </div>

      <div className="settings-card">
        <div>
          <strong>Datenschutz</strong>
          <span>Privatsphäre und Sicherheit</span>
        </div>

        <ChevronRight size={20} />
      </div>
    </main>
  );
}

function AdminPage({ profile }: { profile: Profile }) {
  return (
    <main className="feed">
      <div className="page-title">
        <div>
          <h1>Admin</h1>
          <p>Moderationsbereich</p>
        </div>

        <Shield size={30} />
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <Users size={26} />
          <strong>Benutzer</strong>
          <span>Benutzer verwalten</span>
        </div>

        <div className="admin-card">
          <MessageCircle size={26} />
          <strong>Beiträge</strong>
          <span>Beiträge moderieren</span>
        </div>

        <div className="admin-card">
          <Bell size={26} />
          <strong>Meldungen</strong>
          <span>Meldungen prüfen</span>
        </div>

        <div className="admin-card">
          <CheckCircle2 size={26} />
          <strong>Verifizierung</strong>
          <span>Verifizierungsanfragen</span>
        </div>
      </div>

      <div className="info-card">
        Angemeldet als <strong>@{profile.username}</strong>
      </div>
    </main>
  );
}

function OwnerPage({ profile }: { profile: Profile }) {
  return (
    <main className="feed">
      <div className="page-title">
        <div>
          <h1>Owner</h1>
          <p>Globale CrowSocial-Verwaltung</p>
        </div>

        <Crown size={32} />
      </div>

      <div className="owner-card">
        <div className="owner-badges">
          <CheckCircle2 />
          <Shield />
          <Crown />
        </div>

        <h2>{profile.display_name}</h2>

        <p>
          @{profile.username} · OWNER
        </p>

        <div className="owner-actions">
          <button className="secondary-button">
            Admins verwalten
          </button>

          <button className="secondary-button">
            Moderatoren verwalten
          </button>

          <button className="secondary-button">
            Benutzer verwalten
          </button>

          <button className="secondary-button">
            Einstellungen
          </button>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<Page>("home");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [editProfile, setEditProfile] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState("");
  const [postImageFile, setPostImageFile] =
    useState<File | null>(null);

  const loadProfile = async (user: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profilfehler:", error);
      setProfile(null);
      return;
    }

    if (!data) {
      const username =
        user.email?.split("@")[0] || "user";

      const { data: created, error: createError } =
        await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username,
            display_name: username,
            role: "USER",
            verified: false,
            suspended: false,
          })
          .select()
          .single();

      if (createError) {
        console.error(createError);
        return;
      }

      setProfile(created as Profile);
      return;
    }

    setProfile(data as Profile);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        image_url,
        created_at,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          role,
          verified,
          suspended,
          created_at
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Posts konnten nicht geladen werden:", error);
      return;
    }

    const postList = (data || []).map((post: any) => ({
      ...post,
      profiles: getProfileObject(post.profiles),
      like_count: 0,
      liked: false,
    })) as Post[];

    setPosts(postList);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(currentSession.user);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await loadProfile(currentSession.user);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session && profile) {
      loadPosts();
    }
  }, [session, profile]);

  const createPost = async () => {
    const content = postContent.trim();

    if (!content && !postImageFile) {
      return;
    }

    if (!session || !profile) {
      alert("Du bist nicht angemeldet.");
      return;
    }

    if (profile.suspended) {
      alert("Dein Konto ist momentan gesperrt.");
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (postImageFile) {
        const extension =
          postImageFile.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const filePath =
          `${session.user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("post-images")
            .upload(filePath, postImageFile, {
              cacheControl: "3600",
              upsert: false,
              contentType: postImageFile.type,
            });

        if (uploadError) {
          throw new Error(
            `Bild-Upload fehlgeschlagen: ${uploadError.message}`
          );
        }

        const { data } = supabase.storage
          .from("post-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: session.user.id,
          content: content || null,
          image_url: imageUrl,
        });

      if (error) {
        throw error;
      }

      setPostContent("");
      setPostImageFile(null);

      await loadPosts();
    } catch (err) {
      console.error("Post Fehler:", err);

      alert(
        `Beitrag konnte nicht erstellt werden:\n\n${
          err instanceof Error
            ? err.message
            : "Unbekannter Fehler"
        }`
      );
    }
  };

  const toggleLike = async (
    postId: string,
    liked: boolean
  ) => {
    if (!session) return;

    try {
      if (liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", session.user.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: session.user.id,
        });
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: !liked,
                like_count: Math.max(
                  0,
                  (post.like_count || 0) +
                    (liked ? -1 : 1)
                ),
              }
            : post
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPage("home");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand-large">
          <div className="brand-icon">🐦</div>
          <strong>CrowSocial</strong>
        </div>
        <span>Laden...</span>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen onLogin={setSession} />;
  }

  const currentProfile: Profile = profile;
  const currentSession: Session = session;

  return (
    <div className="app">
      <header className="mobile-header">
        <button
          className="icon-button"
          onClick={() => setMobileMenu(true)}
        >
          <Menu size={23} />
        </button>

        <strong>CrowSocial</strong>

        <Avatar profile={currentProfile} size={34} />
      </header>

      <div
        className={`mobile-sidebar ${
          mobileMenu ? "open" : ""
        }`}
      >
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileMenu(false)}
        />

        <div className="mobile-sidebar-panel">
          <button
            className="close-mobile-menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={22} />
          </button>

          <Sidebar
            page={page}
            setPage={setPage}
            profile={currentProfile}
            logout={logout}
            closeMobile={() => setMobileMenu(false)}
          />
        </div>
      </div>

      <div className="desktop-sidebar">
        <Sidebar
          page={page}
          setPage={setPage}
          profile={currentProfile}
          logout={logout}
        />
      </div>

      <div className="main-content">
        {page === "home" && (
          <HomePage
            posts={posts}
            profile={currentProfile}
            postContent={postContent}
            setPostContent={setPostContent}
            postImageFile={postImageFile}
            setPostImageFile={setPostImageFile}
            onPost={createPost}
            onLike={toggleLike}
          />
        )}

        {page === "search" && <SearchPage />}

        {page === "messages" && (
          <SimplePage
            title="Nachrichten"
            icon={<MessageCircle size={36} />}
            text="Deine privaten Nachrichten werden hier angezeigt."
          />
        )}

        {page === "notifications" && (
          <SimplePage
            title="Benachrichtigungen"
            icon={<Bell size={36} />}
            text="Hier siehst du deine Benachrichtigungen."
          />
        )}

        {page === "profile" && (
          <ProfilePage
            profile={currentProfile}
            onEdit={() => setEditProfile(true)}
          />
        )}

        {page === "settings" && <SettingsPage />}

        {page === "admin" && (
          <AdminPage profile={currentProfile} />
        )}

        {page === "owner" &&
          currentProfile.role === "OWNER" && (
            <OwnerPage profile={currentProfile} />
          )}
      </div>

      {editProfile && (
        <ProfileEditModal
          profile={currentProfile}
          onClose={() => setEditProfile(false)}
          onSaved={(updated) => {
            setProfile(updated);
          }}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
