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
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "./styles.css";

type Role = "USER" | "MODERATOR" | "ADMIN" | "OWNER";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: Role;
  verified: boolean;
  suspended: boolean;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  likes_count: number;
  comments_count: number;
  author?: Profile | null;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function BadgeRow({ profile }: { profile?: Profile | null }) {
  if (!profile) return null;

  return (
    <span className="badges">
      {profile.verified && (
        <CheckCircle2
          className="blue"
          size={16}
          strokeWidth={2.5}
          aria-label="Verifiziert"
        />
      )}

      {(profile.role === "ADMIN" ||
        profile.role === "MODERATOR" ||
        profile.role === "OWNER") && (
        <Shield
          className="shield"
          size={16}
          strokeWidth={2.5}
          aria-label="Admin"
        />
      )}

      {profile.role === "OWNER" && (
        <Crown
          className="owner"
          size={16}
          strokeWidth={2.5}
          aria-label="Owner"
        />
      )}
    </span>
  );
}

function Avatar({
  profile,
  size = 38,
}: {
  profile?: Profile | null;
  size?: number;
}) {
  const name =
    profile?.display_name ||
    profile?.username ||
    "C";

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        className="avatar"
        style={{
          width: size,
          height: size,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
      }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PostCard({
  post,
  currentUserId,
}: {
  post: Post;
  currentUserId: string | null;
}) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);

  const author = post.author;

  const likePost = async () => {
    if (!supabase || !currentUserId) {
      setLiked((value) => !value);
      setLikes((value) =>
        liked ? Math.max(0, value - 1) : value + 1
      );
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);

      if (!error) {
        setLiked(false);
        setLikes((value) => Math.max(0, value - 1));
      }

      return;
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({
        post_id: post.id,
        user_id: currentUserId,
      });

    if (!error) {
      setLiked(true);
      setLikes((value) => value + 1);
    }
  };

  return (
    <article className="post">
      <div className="posthead">
        <Avatar profile={author} />

        <div className="who">
          <strong>
            {author?.display_name ||
              author?.username ||
              "Unbekannt"}

            <BadgeRow profile={author} />
          </strong>

          <span>
            @{author?.username || "user"} ·{" "}
            {formatDate(post.created_at)}
          </span>
        </div>

        <button className="more" aria-label="Mehr">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div
        className="content"
        style={{ marginTop: 14 }}
      >
        {post.content}
      </div>

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          style={{
            width: "100%",
            borderRadius: 14,
            marginTop: 14,
            display: "block",
            maxHeight: 600,
            objectFit: "cover",
          }}
        />
      )}

      <div
        className="postactions"
        style={{ marginTop: 14 }}
      >
        <button
          className={liked ? "liked" : ""}
          onClick={likePost}
          type="button"
        >
          <Heart
            size={18}
            fill={liked ? "currentColor" : "none"}
          />
          {likes}
        </button>

        <button type="button">
          <MessageCircle size={18} />
          {post.comments_count ?? 0}
        </button>

        <button type="button">
          <UserPlus size={18} />
          Folgen
        </button>
      </div>
    </article>
  );
}

function AuthScreen({
  onLogin,
}: {
  onLogin: (profile: Profile) => void;
}) {
  const [mode, setMode] =
    useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase) {
      setError("Supabase ist nicht konfiguriert.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (loginError) {
          setError(loginError.message);
          return;
        }

        if (data.user) {
          await loadProfile(
            data.user.id,
            onLogin
          );
        }
      } else {
        const { data, error: registerError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
                display_name:
                  displayName || username,
              },
            },
          });

        if (registerError) {
          setError(registerError.message);
          return;
        }

        if (data.user) {
          await loadProfile(
            data.user.id,
            onLogin
          );

          if (!data.session) {
            setError(
              "Registrierung erstellt. Prüfe deine E-Mail, falls E-Mail-Bestätigung aktiviert ist."
            );
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="brand">
        CROW<span>Social</span>
      </div>

      <div className="authcard">
        <h1>
          {mode === "login"
            ? "Willkommen zurück"
            : "Account erstellen"}
        </h1>

        <p>
          {mode === "login"
            ? "Melde dich bei CrowSocial an."
            : "Erstelle deinen CrowSocial-Account."}
        </p>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Username"
                required
              />

              <input
                value={displayName}
                onChange={(e) =>
                  setDisplayName(e.target.value)
                }
                placeholder="Anzeigename"
              />
            </>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="E-Mail"
            autoComplete="email"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Passwort"
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            required
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="primary"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "Bitte warten..."
              : mode === "login"
              ? "Anmelden"
              : "Registrieren"}

            <LogIn size={18} />
          </button>
        </form>

        <button
          className="link"
          type="button"
          onClick={() => {
            setMode((value) =>
              value === "login"
                ? "register"
                : "login"
            );

            setError("");
          }}
        >
          {mode === "login"
            ? "Noch keinen Account? Registrieren"
            : "Du hast bereits einen Account? Anmelden"}
        </button>
      </div>
    </div>
  );
}

async function loadProfile(
  userId: string,
  callback: (profile: Profile) => void
) {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, website, role, verified, suspended"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Profil konnte nicht geladen werden:",
      error
    );
    return;
  }

  if (data) {
    callback(data as Profile);
  }
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
  const [username, setUsername] = useState(
    profile.username || ""
  );

  const [displayName, setDisplayName] =
    useState(profile.display_name || "");

  const [bio, setBio] = useState(
    profile.bio || ""
  );

  const [website, setWebsite] = useState(
    profile.website || ""
  );

  const [avatarUrl, setAvatarUrl] =
    useState(profile.avatar_url || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const saveProfile = async () => {
    if (!supabase) {
      setError("Supabase ist nicht konfiguriert.");
      return;
    }

    if (!username.trim()) {
      setError("Der Username darf nicht leer sein.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const updated = {
      username: username.trim(),
      display_name:
        displayName.trim() || username.trim(),
      bio: bio.trim(),
      website: website.trim(),
      avatar_url: avatarUrl.trim() || null,
    };

    const { data, error: updateError } =
      await supabase
        .from("profiles")
        .update(updated)
        .eq("id", profile.id)
        .select(
          "id, username, display_name, avatar_url, bio, website, role, verified, suspended"
        )
        .single();

    if (updateError) {
      console.error(
        "Profil konnte nicht gespeichert werden:",
        updateError
      );

      setError(
        updateError.message ||
          "Profil konnte nicht gespeichert werden."
      );

      setSaving(false);
      return;
    }

    setSuccess("Profil erfolgreich gespeichert.");

    onSaved(data as Profile);

    setTimeout(() => {
      onClose();
    }, 500);

    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="panel"
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Profil bearbeiten
            </h2>

            <p
              className="muted"
              style={{ marginBottom: 0 }}
            >
              Deine Änderungen werden online gespeichert.
            </p>
          </div>

          <button
            className="secondary"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Avatar
            profile={{
              ...profile,
              username,
              display_name:
                displayName || username,
              avatar_url:
                avatarUrl || null,
            }}
            size={100}
          />
        </div>

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Username
        </label>

        <input
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          placeholder="Username"
          maxLength={30}
          style={{
            width: "100%",
            marginBottom: 14,
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Anzeigename
        </label>

        <input
          value={displayName}
          onChange={(e) =>
            setDisplayName(e.target.value)
          }
          placeholder="Anzeigename"
          maxLength={50}
          style={{
            width: "100%",
            marginBottom: 14,
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Bio
        </label>

        <textarea
          value={bio}
          onChange={(e) =>
            setBio(e.target.value)
          }
          placeholder="Erzähl etwas über dich..."
          maxLength={160}
          style={{
            width: "100%",
            minHeight: 100,
            marginBottom: 14,
            resize: "vertical",
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Website
        </label>

        <input
          value={website}
          onChange={(e) =>
            setWebsite(e.target.value)
          }
          placeholder="https://..."
          maxLength={200}
          style={{
            width: "100%",
            marginBottom: 14,
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Profilbild-URL
        </label>

        <input
          value={avatarUrl}
          onChange={(e) =>
            setAvatarUrl(e.target.value)
          }
          placeholder="https://..."
          maxLength={1000}
          style={{
            width: "100%",
            marginBottom: 16,
          }}
        />

        {error && (
          <div
            className="error"
            style={{ marginBottom: 12 }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              background: "rgba(34,197,94,.12)",
              color: "#4ade80",
            }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Abbrechen
          </button>

          <button
            className="primary"
            type="button"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving
              ? "Speichern..."
              : "Änderungen speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [sessionUserId, setSessionUserId] =
    useState<string | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const isAdmin =
    profile?.role === "ADMIN" ||
    profile?.role === "MODERATOR" ||
    profile?.role === "OWNER";

  const isOwner =
    profile?.role === "OWNER";

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      const { data } =
        await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session?.user) {
        setSessionUserId(
          data.session.user.id
        );

        await loadProfile(
          data.session.user.id,
          (loadedProfile) => {
            if (mounted) {
              setProfile(loadedProfile);
            }
          }
        );
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setSessionUserId(
            session.user.id
          );

          await loadProfile(
            session.user.id,
            (loadedProfile) => {
              if (mounted) {
                setProfile(loadedProfile);
              }
            }
          );
        } else {
          setSessionUserId(null);
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
    if (sessionUserId) {
      loadPosts();
    }
  }, [sessionUserId]);

  const loadPosts = async () => {
    if (!supabase) return;

    setLoading(true);

    const { data: postData, error: postError } =
      await supabase
        .from("posts")
        .select(
          "id, content, image_url, created_at, author_id, likes_count, comments_count"
        )
        .order("created_at", {
          ascending: false,
        });

    if (postError) {
      console.error(
        "Posts konnten nicht geladen werden:",
        postError
      );

      setPosts([]);
      setLoading(false);
      return;
    }

    const rows =
      (postData ?? []) as Post[];

    const authorIds = [
      ...new Set(
        rows
          .map((post) => post.author_id)
          .filter(
            (id): id is string =>
              Boolean(id)
          )
      ),
    ];

    let profiles: Profile[] = [];

    if (authorIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, website, role, verified, suspended"
        )
        .in("id", authorIds);

      if (profileError) {
        console.error(
          "Autorenprofile konnten nicht geladen werden:",
          profileError
        );
      } else {
        profiles =
          (profileData ?? []) as Profile[];
      }
    }

    const profileMap = new Map(
      profiles.map((item) => [
        item.id,
        item,
      ])
    );

    const combinedPosts =
      rows.map((post) => ({
        ...post,
        author:
          profileMap.get(
            post.author_id
          ) ?? null,
      }));

    setPosts(combinedPosts);
    setLoading(false);
  };

  const createPost = async () => {
    const content =
      composer.trim();

    if (
      !content ||
      !supabase ||
      !sessionUserId
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("posts")
        .insert({
          author_id: sessionUserId,
          content,
        });

    if (error) {
      console.error(
        "Post konnte nicht erstellt werden:",
        error
      );
      return;
    }

    setComposer("");
    await loadPosts();
  };

  const logout = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();

    setProfile(null);
    setSessionUserId(null);
  };

  const filteredPosts =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) return posts;

      return posts.filter(
        (post) => {
          const content =
            post.content.toLowerCase();

          const username =
            post.author?.username?.toLowerCase() ??
            "";

          const displayName =
            post.author?.display_name?.toLowerCase() ??
            "";

          return (
            content.includes(query) ||
            username.includes(query) ||
            displayName.includes(query)
          );
        }
      );
    }, [posts, searchTerm]);

  if (loading && !profile) {
    return (
      <div className="auth">
        <div className="brand">
          CROW<span>Social</span>
        </div>

        <div className="authcard">
          <h1>CrowSocial</h1>
          <p>Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <AuthScreen
        onLogin={(loadedProfile) => {
          setProfile(
            loadedProfile
          );

          setSessionUserId(
            loadedProfile.id
          );
        }}
      />
    );
  }

  const displayName =
    profile.display_name ||
    profile.username ||
    "Crowit";

  return (
    <div className="app">
      <aside>
        <div className="logo">
          CROW<span>Social</span>
        </div>

        <nav>
          <button
            className={
              page === "home"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("home")
            }
            type="button"
          >
            <Home size={20} />
            <span>Startseite</span>
          </button>

          <button
            className={
              page === "search"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("search")
            }
            type="button"
          >
            <Search size={20} />
            <span>Suche</span>
          </button>

          <button
            className={
              page === "messages"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("messages")
            }
            type="button"
          >
            <MessageCircle
              size={20}
            />
            <span>Nachrichten</span>
          </button>

          <button
            className={
              page === "notifications"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage(
                "notifications"
              )
            }
            type="button"
          >
            <Bell size={20} />
            <span>
              Benachrichtigungen
            </span>
          </button>

          <button
            className={
              page === "profile"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("profile")
            }
            type="button"
          >
            <CircleUserRound
              size={20}
            />
            <span>Profil</span>
          </button>

          <button
            className={
              page === "settings"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("settings")
            }
            type="button"
          >
            <Settings size={20} />
            <span>
              Einstellungen
            </span>
          </button>

          {isAdmin && (
            <button
              className={`adminlink ${
                page === "admin"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPage("admin")
              }
              type="button"
            >
              <Shield size={20} />
              <span>Admin</span>
            </button>
          )}

          {isOwner && (
            <button
              className={`ownerlink ${
                page === "owner"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPage("owner")
              }
              type="button"
            >
              <Crown size={20} />
              <span>Owner</span>
            </button>
          )}
        </nav>

        <div className="sidebottom">
          <button
            onClick={logout}
            type="button"
          >
            <LogOut size={20} />
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div className="mobilebrand">
            CROW<span>Social</span>
          </div>

          <div className="topactions">
            <button
              type="button"
              onClick={() =>
                setMobileMenu(
                  (value) => !value
                )
              }
              aria-label="Menü"
            >
              <Menu size={20} />
            </button>

            <button
              type="button"
              onClick={() =>
                setPage("profile")
              }
              aria-label="Profil"
            >
              <Avatar
                profile={profile}
                size={34}
              />
            </button>
          </div>
        </header>

        {mobileMenu && (
          <div
            className="panel"
            style={{
              position: "relative",
              zIndex: 20,
              marginTop: 10,
            }}
          >
            <button
              className="secondary"
              onClick={() => {
                setPage("home");
                setMobileMenu(false);
              }}
              type="button"
            >
              Startseite
            </button>

            <button
              className="secondary"
              style={{
                marginLeft: 8,
              }}
              onClick={() => {
                setPage("profile");
                setMobileMenu(false);
              }}
              type="button"
            >
              Profil
            </button>

            {isAdmin && (
              <button
                className="secondary"
                style={{
                  marginLeft: 8,
                }}
                onClick={() => {
                  setPage("admin");
                  setMobileMenu(false);
                }}
                type="button"
              >
                Admin
              </button>
            )}

            <button
              className="secondary"
              style={{
                marginLeft: 8,
              }}
              onClick={() =>
                setMobileMenu(false)
              }
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {page === "home" && (
          <>
            <section className="hero">
              <h1>
                Willkommen,{" "}
                {displayName} 👋
              </h1>

              <p>
                Was gibt es Neues bei
                CrowSocial?
              </p>
            </section>

            <section className="composer">
              <textarea
                value={composer}
                onChange={(e) =>
                  setComposer(
                    e.target.value
                  )
                }
                placeholder="Was möchtest du teilen?"
              />

              <div className="composerbar">
                <span>
                  <ImageIcon
                    size={18}
                  />
                </span>

                <button
                  className="primary small"
                  onClick={
                    createPost
                  }
                  disabled={
                    !composer.trim()
                  }
                  type="button"
                >
                  Posten
                </button>
              </div>
            </section>

            {loading ? (
              <div className="empty">
                Posts werden
                geladen...
              </div>
            ) : filteredPosts.length ===
              0 ? (
              <div className="empty">
                Noch keine Posts
                vorhanden.
              </div>
            ) : (
              filteredPosts.map(
                (post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={
                      sessionUserId
                    }
                  />
                )
              )
            )}
          </>
        )}

        {page === "search" && (
          <section className="panel">
            <h2>Suche</h2>

            <div className="searchbox">
              <Search size={20} />

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="Posts und Benutzer suchen..."
              />
            </div>

            <div
              style={{
                marginTop: 20,
              }}
            >
              {searchTerm &&
              filteredPosts.length ===
                0 ? (
                <div className="empty">
                  Keine Ergebnisse
                  gefunden.
                </div>
              ) : (
                filteredPosts.map(
                  (post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={
                        sessionUserId
                      }
                    />
                  )
                )
              )}
            </div>
          </section>
        )}

        {page === "profile" && (
          <section className="profile">
            <div className="cover" />

            <div className="profiletop">
              <Avatar
                profile={profile}
                size={90}
              />

              <button
                className="secondary"
                type="button"
                onClick={() =>
                  setEditingProfile(
                    true
                  )
                }
              >
                Profil bearbeiten
              </button>
            </div>

            <section className="panel">
              <h2>
                {displayName}
                <BadgeRow
                  profile={profile}
                />
              </h2>

              <p className="muted">
                @{profile.username ||
                  "user"}
              </p>

              {profile.bio ? (
                <p
                  style={{
                    whiteSpace:
                      "pre-wrap",
                  }}
                >
                  {profile.bio}
                </p>
              ) : (
                <p className="muted">
                  Noch keine Bio
                  vorhanden.
                </p>
              )}

              {profile.website && (
                <p>
                  <a
                    href={
                      profile.website.startsWith(
                        "http"
                      )
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color:
                        "inherit",
                    }}
                  >
                    🌐{" "}
                    {profile.website}
                  </a>
                </p>
              )}

              <div className="stats">
                <b>
                  0
                  <span>Posts</span>
                </b>

                <b>
                  0
                  <span>
                    Follower
                  </span>
                </b>

                <b>
                  0
                  <span>
                    Folge ich
                  </span>
                </b>
              </div>
            </section>
          </section>
        )}

        {page === "messages" && (
          <section className="panel">
            <h2>Nachrichten</h2>

            <div className="empty">
              Deine Nachrichten
              werden hier
              angezeigt.
            </div>
          </section>
        )}

        {page === "notifications" && (
          <section className="panel">
            <h2>
              Benachrichtigungen
            </h2>

            <div className="empty">
              Noch keine
              Benachrichtigungen.
            </div>
          </section>
        )}

        {page === "settings" && (
          <section className="panel">
            <h2>
              Einstellungen
            </h2>

            <div className="setting">
              <div>
                <strong>
                  Account
                </strong>

                <p className="muted">
                  {profile.username ||
                    "user"}
                </p>
              </div>

              <ChevronRight
                size={18}
              />
            </div>

            <div className="setting">
              <div>
                <strong>
                  Rolle
                </strong>

                <p className="muted">
                  {profile.role}
                </p>
              </div>

              <ChevronRight
                size={18}
              />
            </div>

            <div className="setting">
              <div>
                <strong>
                  Verifizierung
                </strong>

                <p className="muted">
                  {profile.verified
                    ? "Verifiziert"
                    : "Nicht verifiziert"}
                </p>
              </div>

              <CheckCircle2
                size={18}
                className={
                  profile.verified
                    ? "blue"
                    : ""
                }
              />
            </div>
          </section>
        )}

        {page === "admin" &&
          isAdmin && (
            <section>
              <div className="adminhero">
                <Shield />

                <div>
                  <h1>
                    Admin-Bereich
                  </h1>

                  <p>
                    Verwaltung von
                    CrowSocial
                  </p>
                </div>
              </div>

              <div className="grid">
                <div className="admincard">
                  <Users size={28} />
                  <b>
                    Benutzer
                  </b>
                  <span>
                    Benutzer
                    verwalten und
                    moderieren.
                  </span>
                </div>

                <div className="admincard">
                  <MessageCircle
                    size={28}
                  />

                  <b>
                    Posts &
                    Kommentare
                  </b>

                  <span>
                    Inhalte
                    überprüfen
                    und
                    moderieren.
                  </span>
                </div>

                <div className="admincard">
                  <Bell size={28} />

                  <b>
                    Meldungen
                  </b>

                  <span>
                    Gemeldete
                    Inhalte
                    anzeigen.
                  </span>
                </div>

                <div className="admincard">
                  <CheckCircle2
                    size={28}
                  />

                  <b>
                    Verifizierung
                  </b>

                  <span>
                    Verifizierungsanfragen
                    verwalten.
                  </span>
                </div>
              </div>
            </section>
          )}

        {page === "owner" &&
          isOwner && (
            <section>
              <div className="adminhero">
                <Crown />

                <div>
                  <h1>
                    Owner-Bereich
                  </h1>

                  <p>
                    Vollständige
                    CrowSocial-Verwaltung
                  </p>
                </div>
              </div>

              <div className="panel">
                <h2>
                  {displayName}
                  <BadgeRow
                    profile={profile}
                  />
                </h2>

                <p className="muted">
                  OWNER · ADMIN ·
                  VERIFIZIERT
                </p>

                <div className="owner-badges">
                  <span className="blue">
                    🔵 Verifiziert
                  </span>

                  <span className="shield">
                    🛡️ Admin
                  </span>

                  <span className="owner">
                    👑 Owner
                  </span>
                </div>
              </div>

              <div className="grid">
                <div className="admincard">
                  <Users size={28} />

                  <b>
                    Benutzerverwaltung
                  </b>

                  <span>
                    Benutzer,
                    Rollen und
                    Sperren
                    verwalten.
                  </span>
                </div>

                <div className="admincard">
                  <Shield size={28} />

                  <b>
                    Admins
                  </b>

                  <span>
                    Administratoren
                    und
                    Moderatoren
                    verwalten.
                  </span>
                </div>

                <div className="admincard">
                  <Settings
                    size={28}
                  />

                  <b>
                    Globale
                    Einstellungen
                  </b>

                  <span>
                    CrowSocial-Systemeinstellungen
                    verwalten.
                  </span>
                </div>

                <div className="admincard">
                  <Bell size={28} />

                  <b>
                    Logs
                  </b>

                  <span>
                    Administrative
                    Aktionen
                    anzeigen.
                  </span>
                </div>
              </div>
            </section>
          )}

        <div className="rightcol">
          <div className="card">
            <h3>
              Dein Account
            </h3>

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <Avatar
                profile={profile}
              />

              <div>
                <strong>
                  {displayName}
                </strong>

                <div className="muted">
                  @
                  {profile.username ||
                    "user"}
                </div>
              </div>
            </div>

            <div className="stat">
              <span>Rolle</span>
              <strong>
                {profile.role}
              </strong>
            </div>

            <div className="stat">
              <span>
                Verifiziert
              </span>

              <strong>
                {profile.verified
                  ? "Ja"
                  : "Nein"}
              </strong>
            </div>
          </div>
        </div>
      </main>

      <div className="bottomnav">
        <button
          className={
            page === "home"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("home")
          }
          type="button"
        >
          <Home size={21} />
        </button>

        <button
          className={
            page === "search"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("search")
          }
          type="button"
        >
          <Search size={21} />
        </button>

        <button
          className={
            page === "messages"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("messages")
          }
          type="button"
        >
          <MessageCircle
            size={21}
          />
        </button>

        <button
          className={
            page === "notifications"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage(
              "notifications"
            )
          }
          type="button"
        >
          <Bell size={21} />
        </button>

        <button
          className={
            page === "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("profile")
          }
          type="button"
        >
          <CircleUserRound
            size={21}
          />
        </button>
      </div>

      {editingProfile &&
        profile && (
          <ProfileEditModal
            profile={profile}
            onClose={() =>
              setEditingProfile(
                false
              )
            }
            onSaved={(
              updatedProfile
            ) => {
              setProfile(
                updatedProfile
              );
            }}
          />
        )}
    </div>
  );
}

const root =
  document.getElementById(
    "root"
  );

if (!root) {
  throw new Error(
    "Root-Element wurde nicht gefunden."
  );
}

createRoot(root).render(
  <App />
);