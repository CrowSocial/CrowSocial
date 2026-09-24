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
  Lock,
  User,
  Save,
  Trash2,
  Reply,
  UserCheck,
  UserX,
  Ban,
  RefreshCw,
  ClipboardList,
  UserCog,
} from "lucide-react";
import {
  createClient,
  type Session,
  type User as SupabaseUser,
} from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://aohhkwtoillcygsfauwh.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_eMlH01mR1rrwTfRqIE0rnM8zt";

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

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

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  profile?: Profile | null;
};

type AdminLog = {
  id: string;
  admin_id: string | null;
  action: string;
  target_user_id: string | null;
  details: string | null;
  created_at: string;
  admin?: Profile | null;
  target?: Profile | null;
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

function getErrorMessage(error: unknown): string {
  if (!error) return "Unbekannter Fehler.";

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const value = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };

    const parts: string[] = [];

    if (value.message) parts.push(String(value.message));
    if (value.details) parts.push(`Details: ${String(value.details)}`);
    if (value.hint) parts.push(`Hinweis: ${String(value.hint)}`);
    if (value.code) parts.push(`Code: ${String(value.code)}`);
    if (value.status) parts.push(`Status: ${String(value.status)}`);
    if (value.statusCode) {
      parts.push(`Statuscode: ${String(value.statusCode)}`);
    }

    if (parts.length) return parts.join("\n");

    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return "Unbekannter Supabase-Fehler.";
    }
  }

  return String(error);
}

function formatDate(date: string) {
  const value = new Date(date);
  const diff = Date.now() - value.getTime();

  if (diff < 60_000) return "gerade eben";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} Min.`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} Std.`;

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
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          maxWidth: size,
          maxHeight: size,
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
        minWidth: size,
        minHeight: size,
      }}
    >
      <CircleUserRound size={size * 0.55} />
    </div>
  );
}

/* =========================================================
   POST CARD
========================================================= */

function PostCard({
  post,
  onLike,
  session,
  currentProfile,
}: {
  post: Post;
  onLike: (postId: string, liked: boolean) => void;
  session: Session;
  currentProfile: Profile;
}) {
  const profile = getProfileObject(post.profiles);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const loadComments = async () => {
    setCommentsLoading(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id,post_id,user_id,parent_id,content,created_at")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows = (data || []) as Omit<Comment, "profile">[];

      if (!rows.length) {
        setComments([]);
        return;
      }

      const userIds = [...new Set(rows.map((row) => row.user_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url,bio,role,verified,suspended,created_at"
        )
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        ((profiles || []) as Profile[]).map((item) => [item.id, item])
      );

      setComments(
        rows.map((row) => ({
          ...row,
          profile: profileMap.get(row.user_id) || null,
        }))
      );
    } catch (error) {
      console.error(error);
      alert(
        `Kommentare konnten nicht geladen werden:\n\n${getErrorMessage(error)}`
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);

    if (next) await loadComments();
  };

  const createComment = async () => {
    const content = commentText.trim();

    if (!content) return;

    if (currentProfile.suspended) {
      alert("Dein Konto ist momentan gesperrt.");
      return;
    }

    setCommentSending(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: post.id,
          user_id: session.user.id,
          parent_id: replyTo?.id || null,
          content,
        })
        .select("id,post_id,user_id,parent_id,content,created_at")
        .single();

      if (error) throw error;

      setComments((current) => [
        ...current,
        {
          ...(data as Omit<Comment, "profile">),
          profile: currentProfile,
        },
      ]);

      setCommentText("");
      setReplyTo(null);
      setCommentsOpen(true);
    } catch (error) {
      alert(
        `Kommentar konnte nicht erstellt werden:\n\n${getErrorMessage(error)}`
      );
    } finally {
      setCommentSending(false);
    }
  };

  const deleteComment = async (comment: Comment) => {
    const canDelete =
      comment.user_id === session.user.id ||
      currentProfile.role === "OWNER" ||
      currentProfile.role === "ADMIN" ||
      currentProfile.role === "MODERATOR";

    if (!canDelete) {
      alert("Du darfst diesen Kommentar nicht löschen.");
      return;
    }

    if (!window.confirm("Diesen Kommentar wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", comment.id);

      if (error) throw error;

      await loadComments();

      if (replyTo?.id === comment.id) {
        setReplyTo(null);
      }
    } catch (error) {
      alert(
        `Kommentar konnte nicht gelöscht werden:\n\n${getErrorMessage(error)}`
      );
    }
  };

  const renderComment = (comment: Comment, depth = 0): React.ReactNode => {
    const replies = comments.filter(
      (item) => item.parent_id === comment.id
    );

    const canDelete =
      comment.user_id === session.user.id ||
      currentProfile.role === "OWNER" ||
      currentProfile.role === "ADMIN" ||
      currentProfile.role === "MODERATOR";

    return (
      <React.Fragment key={comment.id}>
        <div
          className="comment-item"
          style={{
            marginLeft: Math.min(depth, 4) * 34,
            borderLeft: depth
              ? "2px solid #27272a"
              : undefined,
            paddingLeft: depth ? 12 : undefined,
          }}
        >
          <Avatar profile={comment.profile || null} size={depth ? 32 : 36} />

          <div className="comment-body">
            <div className="comment-meta">
              <strong>
                {comment.profile?.display_name ||
                  comment.profile?.username ||
                  "Unbekannt"}
              </strong>

              {comment.profile && (
                <BadgeRow profile={comment.profile} />
              )}

              <span>· {formatDate(comment.created_at)}</span>
            </div>

            {depth > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "#a1a1aa",
                  marginBottom: 3,
                }}
              >
                Antwort auf{" "}
                <strong>
                  @{comment.profile?.username || "user"}
                </strong>
              </div>
            )}

            <div className="comment-content">{comment.content}</div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 7,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="icon-button"
                onClick={() => setReplyTo(comment)}
                title="Antworten"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  width: "auto",
                  padding: "5px 8px",
                  fontSize: 12,
                }}
              >
                <Reply size={15} />
                Antworten
              </button>

              {canDelete && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => deleteComment(comment)}
                  title="Kommentar löschen"
                  style={{
                    color: "#ef4444",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    width: "auto",
                    padding: "5px 8px",
                    fontSize: 12,
                  }}
                >
                  <Trash2 size={15} />
                  Löschen
                </button>
              )}
            </div>
          </div>
        </div>

        {replies.map((reply) => renderComment(reply, depth + 1))}
      </React.Fragment>
    );
  };

  const rootComments = comments.filter((comment) => !comment.parent_id);

  return (
    <article className="post-card">
      <div className="post-header">
        <Avatar profile={profile} size={44} />

        <div className="post-user">
          <div className="post-name-row">
            <strong>
              {profile?.display_name ||
                profile?.username ||
                "Unbekannt"}
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
        <div className="post-content">{post.content}</div>
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

        <button
          type="button"
          className={`post-action ${commentsOpen ? "liked" : ""}`}
          onClick={toggleComments}
        >
          <MessageCircle size={19} />
          <span>
            {commentsOpen ? "Kommentare schließen" : "Kommentieren"}
          </span>
        </button>
      </div>

      {commentsOpen && (
        <div className="comments-section">
          {replyTo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 10,
                borderRadius: 10,
                background: "#18181b",
                border: "1px solid #27272a",
              }}
            >
              <span style={{ fontSize: 13, color: "#a1a1aa" }}>
                Antwort auf{" "}
                <strong style={{ color: "#e4e4e7" }}>
                  @{replyTo.profile?.username || "user"}
                </strong>
              </span>

              <button
                type="button"
                className="icon-button"
                onClick={() => setReplyTo(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}

          <div className="comment-composer">
            <Avatar profile={currentProfile} size={36} />

            <div className="comment-input-wrap">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  replyTo
                    ? `Antwort auf @${
                        replyTo.profile?.username || "user"
                      }...`
                    : "Schreibe einen Kommentar..."
                }
                rows={2}
                maxLength={500}
                disabled={commentSending}
              />

              <button
                type="button"
                className="primary-button comment-submit"
                onClick={createComment}
                disabled={commentSending || !commentText.trim()}
              >
                {commentSending
                  ? "Senden..."
                  : replyTo
                  ? "Antworten"
                  : "Kommentieren"}
              </button>
            </div>
          </div>

          <div className="comments-list">
            {commentsLoading ? (
              <div className="comment-empty">
                Kommentare werden geladen...
              </div>
            ) : comments.length === 0 ? (
              <div className="comment-empty">
                Noch keine Kommentare. Sei der Erste!
              </div>
            ) : (
              rootComments.map((comment) => renderComment(comment))
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/* =========================================================
   AUTH
========================================================= */

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
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;
        if (data.session) onLogin(data.session);
      } else {
        if (!username.trim()) {
          throw new Error("Bitte gib einen Benutzernamen ein.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              display_name:
                displayName.trim() || username.trim(),
            },
          },
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error("Benutzer konnte nicht erstellt werden.");
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
      setError(getErrorMessage(err));
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
          {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
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
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    profile.avatar_url || null
  );

  useEffect(() => {
    if (!avatarFile) {
      setPreview(profile.avatar_url || null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, profile.avatar_url]);

  const save = async () => {
    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();
    const cleanBio = bio.trim();

    if (!cleanUsername) {
      alert("Bitte gib einen Benutzernamen ein.");
      return;
    }

    if (!cleanDisplayName) {
      alert("Bitte gib einen Anzeigenamen ein.");
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url || null;

      if (avatarFile) {
        const extension =
          avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: false,
            contentType: avatarFile.type,
            cacheControl: "3600",
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        avatarUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          display_name: cleanDisplayName,
          bio: cleanBio || null,
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id)
        .select("*")
        .single();

      if (error) throw error;

      onSaved(data as Profile);
      onClose();
      alert("Profil erfolgreich gespeichert.");
    } catch (err) {
      alert(
        `Profil konnte nicht gespeichert werden:\n\n${getErrorMessage(err)}`
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

          <button className="icon-button" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="profile-preview">
          <div
            style={{
              width: 110,
              height: 110,
              minWidth: 110,
              borderRadius: "50%",
              overflow: "hidden",
              border: "4px solid #27272a",
              background: "#18181b",
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Profilbild Vorschau"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircleUserRound size={55} />
              </div>
            )}
          </div>
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
                e.target.value = "";
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
          maxLength={30}
        />

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Anzeigename"
          maxLength={50}
        />

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Beschreibung"
          rows={4}
          maxLength={250}
        />

        <button
          type="button"
          className="primary-button"
          onClick={save}
          disabled={saving}
        >
          <Save size={18} />
          {saving ? "Speichern..." : "Änderungen speichern"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   PASSWORT
========================================================= */

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (password.length < 6) {
      alert("Das Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    if (password !== repeatPassword) {
      alert("Die Passwörter stimmen nicht überein.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      alert("Passwort erfolgreich geändert.");
      onClose();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>Passwort ändern</h2>

          <button className="icon-button" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="muted">Gib dein neues Passwort ein.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Neues Passwort"
          minLength={6}
        />

        <input
          type="password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          placeholder="Passwort wiederholen"
          minLength={6}
        />

        <button
          className="primary-button"
          type="button"
          onClick={changePassword}
          disabled={saving}
        >
          <Lock size={18} />
          {saving ? "Speichern..." : "Passwort ändern"}
        </button>
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
          type="button"
          onClick={logout}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   HOME
========================================================= */

function HomePage({
  posts,
  profile,
  session,
  postContent,
  setPostContent,
  postImageFile,
  setPostImageFile,
  onPost,
  onLike,
}: {
  posts: Post[];
  profile: Profile;
  session: Session;
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

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

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
              session={session}
              currentProfile={profile}
            />
          ))
        )}
      </section>
    </main>
  );
}

/* =========================================================
   SEARCH
========================================================= */

function SearchPage() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      const cleanQuery = query.trim();

      if (!cleanQuery) {
        setProfiles([]);
        return;
      }

      setLoading(true);

      const safeQuery = cleanQuery.replace(/[%_]/g, "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(
          `username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`
        )
        .limit(20);

      if (!error) {
        setProfiles((data || []) as Profile[]);
      } else {
        console.error(error);
        setProfiles([]);
      }

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

            <ChevronRight size={20} />
          </div>
        ))}
    </main>
  );
}

/* =========================================================
   SIMPLE PAGE
========================================================= */

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

/* =========================================================
   PROFILE
========================================================= */

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
            type="button"
            onClick={onEdit}
          >
            Profil bearbeiten
          </button>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({
  profile,
  onEditProfile,
  onPassword,
  onLogout,
}: {
  profile: Profile;
  onEditProfile: () => void;
  onPassword: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="feed">
      <div className="page-title">
        <div>
          <h1>Einstellungen</h1>
          <p>Verwalte dein CrowSocial-Konto.</p>
        </div>

        <Settings size={30} />
      </div>

      <div className="settings-card">
        <div>
          <strong>Profil bearbeiten</strong>
          <span>
            Name, Benutzername, Beschreibung und Profilbild
          </span>
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={onEditProfile}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="settings-card">
        <div>
          <strong>Passwort ändern</strong>
          <span>Neues Passwort für dein Konto festlegen</span>
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={onPassword}
        >
          <Lock size={20} />
        </button>
      </div>

      <div className="settings-card">
        <div>
          <strong>Konto</strong>
          <span>Angemeldet als @{profile.username}</span>
        </div>

        <User size={20} />
      </div>

      <div className="settings-card">
        <div>
          <strong>Rolle</strong>
          <span>{profile.role}</span>
        </div>

        {profile.role === "OWNER" ? (
          <Crown size={20} />
        ) : profile.role === "ADMIN" ||
          profile.role === "MODERATOR" ? (
          <Shield size={20} />
        ) : (
          <User size={20} />
        )}
      </div>

      <div className="settings-card">
        <div>
          <strong>Abmelden</strong>
          <span>Von deinem CrowSocial-Konto abmelden</span>
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={onLogout}
        >
          <LogOut size={20} />
        </button>
      </div>
    </main>
  );
}

/* =========================================================
   ADMIN
========================================================= */

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

/* =========================================================
   OWNER
========================================================= */

function OwnerPage({ profile }: { profile: Profile }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [section, setSection] = useState<
    "users" | "team" | "logs"
  >("users");

  const loadUsers = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url,bio,role,verified,suspended,created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers((data || []) as Profile[]);
    } catch (error) {
      alert(
        `Benutzer konnten nicht geladen werden:\n\n${getErrorMessage(
          error
        )}`
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("id,admin_id,action,target_user_id,details,created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data || []) as AdminLog[];

      const ids = [
        ...new Set(
          rows.flatMap((row) =>
            [row.admin_id, row.target_user_id].filter(
              Boolean
            ) as string[]
          )
        ),
      ];

      if (!ids.length) {
        setLogs(rows);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url,bio,role,verified,suspended,created_at"
        )
        .in("id", ids);

      const map = new Map(
        ((profiles || []) as Profile[]).map((item) => [
          item.id,
          item,
        ])
      );

      setLogs(
        rows.map((row) => ({
          ...row,
          admin: row.admin_id
            ? map.get(row.admin_id) || null
            : null,
          target: row.target_user_id
            ? map.get(row.target_user_id) || null
            : null,
        }))
      );
    } catch (error) {
      console.error("Logs:", error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, []);

  const writeLog = async (
    action: string,
    targetUserId: string | null,
    details: string
  ) => {
    const { error } = await supabase
      .from("admin_logs")
      .insert({
        admin_id: profile.id,
        action,
        target_user_id: targetUserId,
        details,
      });

    if (error) {
      console.error("Admin-Log konnte nicht erstellt werden:", error);
    }
  };

  const updateUser = async (
    target: Profile,
    changes: Partial<Profile>,
    action: string,
    details: string
  ) => {
    if (target.id === profile.id) {
      alert("Der Owner kann sich hier nicht selbst verändern.");
      return;
    }

    if (target.role === "OWNER") {
      alert("Der Owner kann nicht von der Verwaltung geändert werden.");
      return;
    }

    setBusyId(target.id);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", target.id)
        .select(
          "id,username,display_name,avatar_url,bio,role,verified,suspended,created_at"
        )
        .single();

      if (error) throw error;

      await writeLog(action, target.id, details);

      setUsers((current) =>
        current.map((user) =>
          user.id === target.id ? (data as Profile) : user
        )
      );
    } catch (error) {
      alert(
        `Änderung konnte nicht gespeichert werden:\n\n${getErrorMessage(
          error
        )}`
      );
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (
    target: Profile,
    role: Role
  ) => {
    if (role === "OWNER") {
      alert(
        "Ein zweiter Owner kann nicht über dieses Menü erstellt werden."
      );
      return;
    }

    await updateUser(
      target,
      { role },
      "ROLE_CHANGED",
      `Rolle von ${target.role} auf ${role} geändert.`
    );
  };

  const toggleSuspended = async (target: Profile) => {
    const next = !target.suspended;

    await updateUser(
      target,
      { suspended: next },
      next ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
      next
        ? "Benutzer wurde gesperrt."
        : "Benutzer wurde entsperrt."
    );
  };

  const toggleVerified = async (target: Profile) => {
    const next = !target.verified;

    await updateUser(
      target,
      { verified: next },
      next ? "USER_VERIFIED" : "USER_UNVERIFIED",
      next
        ? "Benutzer wurde verifiziert."
        : "Verifizierung wurde entfernt."
    );
  };

  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return (
      user.username.toLowerCase().includes(q) ||
      user.display_name.toLowerCase().includes(q)
    );
  });

  const admins = users.filter(
    (user) => user.role === "ADMIN"
  );

  const moderators = users.filter(
    (user) => user.role === "MODERATOR"
  );

  return (
    <main className="feed">
      <div className="page-title">
        <div>
          <h1>
            <Crown size={30} />
            Owner
          </h1>

          <p>
            Vollständige Verwaltung von CrowSocial
          </p>
        </div>

        <Crown size={34} />
      </div>

      {/* OWNER HEADER */}

      <div className="owner-card">
        <div className="owner-badges">
          <CheckCircle2 />
          <Shield />
          <Crown />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Avatar profile={profile} size={70} />

          <div>
            <h2 style={{ margin: 0 }}>
              {profile.display_name}
            </h2>

            <p style={{ margin: "5px 0 0" }}>
              @{profile.username} · 👑 OWNER
            </p>
          </div>
        </div>
      </div>

      {/* OWNER NAVIGATION */}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          margin: "18px 0",
        }}
      >
        <button
          type="button"
          className={
            section === "users"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => setSection("users")}
        >
          <Users size={17} />
          Benutzer
        </button>

        <button
          type="button"
          className={
            section === "team"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => setSection("team")}
        >
          <Shield size={17} />
          Team
        </button>

        <button
          type="button"
          className={
            section === "logs"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => setSection("logs")}
        >
          <ClipboardList size={17} />
          Logs
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            loadUsers();
            loadLogs();
          }}
        >
          <RefreshCw size={17} />
          Aktualisieren
        </button>
      </div>

      {/* BENUTZER */}

      {section === "users" && (
        <>
          <div className="search-box">
            <Search size={20} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Benutzer suchen..."
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10,
              margin: "15px 0",
            }}
          >
            <div className="admin-card">
              <Users size={24} />
              <strong>{users.length}</strong>
              <span>Benutzer</span>
            </div>

            <div className="admin-card">
              <Shield size={24} />
              <strong>{admins.length}</strong>
              <span>Admins</span>
            </div>

            <div className="admin-card">
              <UserCog size={24} />
              <strong>{moderators.length}</strong>
              <span>Moderatoren</span>
            </div>

            <div className="admin-card">
              <CheckCircle2 size={24} />
              <strong>
                {users.filter((user) => user.verified).length}
              </strong>
              <span>Verifiziert</span>
            </div>
          </div>

          {loading ? (
            <div className="empty-card">
              <RefreshCw size={28} />
              <h3>Benutzer werden geladen...</h3>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-card">
              <Users size={32} />
              <h3>Keine Benutzer gefunden</h3>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {filteredUsers.map((user) => {
                const isOwner = user.role === "OWNER";
                const busy = busyId === user.id;

                return (
                  <div
                    key={user.id}
                    className="settings-card"
                    style={{
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Avatar profile={user} size={52} />

                    <div
                      style={{
                        flex: 1,
                        minWidth: 180,
                      }}
                    >
                      <div className="post-name-row">
                        <strong>
                          {user.display_name}
                        </strong>

                        <BadgeRow profile={user} />
                      </div>

                      <span>
                        @{user.username}
                      </span>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: "#a1a1aa",
                        }}
                      >
                        Rolle: <strong>{user.role}</strong>
                        {" · "}
                        {user.suspended
                          ? "🔴 Gesperrt"
                          : "🟢 Aktiv"}
                        {" · "}
                        {user.verified
                          ? "🔵 Verifiziert"
                          : "Nicht verifiziert"}
                      </div>
                    </div>

                    {!isOwner && (
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                          width: "100%",
                        }}
                      >
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={busy}
                          onClick={() =>
                            toggleSuspended(user)
                          }
                        >
                          {user.suspended ? (
                            <>
                              <UserCheck size={16} />
                              Entsperren
                            </>
                          ) : (
                            <>
                              <Ban size={16} />
                              Sperren
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          disabled={busy}
                          onClick={() =>
                            toggleVerified(user)
                          }
                        >
                          {user.verified ? (
                            <>
                              <UserX size={16} />
                              Verifizierung entfernen
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={16} />
                              Verifizieren
                            </>
                          )}
                        </button>

                        <select
                          value={user.role}
                          disabled={busy}
                          onChange={(e) =>
                            changeRole(
                              user,
                              e.target.value as Role
                            )
                          }
                          style={{
                            background: "#18181b",
                            color: "#f4f4f5",
                            border: "1px solid #3f3f46",
                            borderRadius: 8,
                            padding: "8px 10px",
                          }}
                        >
                          <option value="USER">
                            USER
                          </option>

                          <option value="MODERATOR">
                            MODERATOR
                          </option>

                          <option value="ADMIN">
                            ADMIN
                          </option>
                        </select>
                      </div>
                    )}

                    {isOwner && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          color: "#fbbf24",
                          fontSize: 13,
                        }}
                      >
                        <Crown size={18} />
                        Haupt-Owner
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TEAM */}

      {section === "team" && (
        <>
          <div className="admin-grid">
            <div className="admin-card">
              <Crown size={28} />
              <strong>Owner</strong>
              <span>@{profile.username}</span>
            </div>

            <div className="admin-card">
              <Shield size={28} />
              <strong>Admins</strong>
              <span>{admins.length} Benutzer</span>
            </div>

            <div className="admin-card">
              <UserCog size={28} />
              <strong>Moderatoren</strong>
              <span>{moderators.length} Benutzer</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 15,
            }}
          >
            {admins.map((user) => (
              <div
                className="settings-card"
                key={user.id}
              >
                <Avatar profile={user} size={45} />

                <div style={{ flex: 1 }}>
                  <strong>{user.display_name}</strong>
                  <span>
                    @{user.username} · ADMIN
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    changeRole(user, "USER")
                  }
                >
                  Admin entfernen
                </button>
              </div>
            ))}

            {moderators.map((user) => (
              <div
                className="settings-card"
                key={user.id}
              >
                <Avatar profile={user} size={45} />

                <div style={{ flex: 1 }}>
                  <strong>{user.display_name}</strong>
                  <span>
                    @{user.username} · MODERATOR
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    changeRole(user, "USER")
                  }
                >
                  Moderator entfernen
                </button>
              </div>
            ))}

            {admins.length === 0 &&
              moderators.length === 0 && (
                <div className="empty-card">
                  <Shield size={32} />
                  <h3>Noch kein Team</h3>
                  <p>
                    Du kannst Benutzer unten zu
                    Admins oder Moderatoren machen.
                  </p>
                </div>
              )}

            <button
              type="button"
              className="primary-button"
              onClick={() => setSection("users")}
            >
              <UserPlus size={18} />
              Benutzer verwalten
            </button>
          </div>
        </>
      )}

      {/* LOGS */}

      {section === "logs" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          {logs.length === 0 ? (
            <div className="empty-card">
              <ClipboardList size={32} />
              <h3>Noch keine Admin-Aktionen</h3>
              <p>
                Änderungen am System werden hier protokolliert.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                className="settings-card"
                key={log.id}
              >
                <ClipboardList size={20} />

                <div style={{ flex: 1 }}>
                  <strong>{log.action}</strong>

                  <span>
                    {log.details || "Keine Details"}
                  </span>

                  <span
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                    }}
                  >
                    {formatDate(log.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [page, setPage] =
    useState<Page>("home");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [
    editProfile,
    setEditProfile,
  ] = useState(false);

  const [
    passwordModal,
    setPasswordModal,
  ] = useState(false);

  const [posts, setPosts] =
    useState<Post[]>([]);

  const [postContent, setPostContent] =
    useState("");

  const [
    postImageFile,
    setPostImageFile,
  ] = useState<File | null>(null);

  const loadProfile = async (
    user: SupabaseUser
  ) => {
    const { data, error } =
      await supabase
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
      console.error("Kein Profil gefunden.");
      setProfile(null);
      return;
    }

    setProfile(data as Profile);
  };

  const loadPosts = async () => {
    const { data, error } =
      await supabase
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
        .order("created_at", {
          ascending: false,
        })
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

    if (postList.length > 0 && session) {
      const postIds = postList.map((post) => post.id);

      const { data: likes, error: likesError } =
        await supabase
          .from("post_likes")
          .select("post_id,user_id")
          .in("post_id", postIds);

      if (!likesError) {
        const likeCounts = new Map<string, number>();
        const likedPosts = new Set<string>();

        (likes || []).forEach((like) => {
          likeCounts.set(
            like.post_id,
            (likeCounts.get(like.post_id) || 0) + 1
          );

          if (like.user_id === session.user.id) {
            likedPosts.add(like.post_id);
          }
        });

        postList.forEach((post) => {
          post.like_count =
            likeCounts.get(post.id) || 0;

          post.liked =
            likedPosts.has(post.id);
        });
      }
    }

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
    } =
      supabase.auth.onAuthStateChange(
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

    if (!content && !postImageFile) return;

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
          postImageFile.name.split(".").pop()?.toLowerCase() ||
          "jpg";

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

        if (uploadError) throw uploadError;

        const { data } =
          supabase.storage
            .from("post-images")
            .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      const { error: postError } =
        await supabase
          .from("posts")
          .insert({
            user_id: session.user.id,
            content: content || null,
            image_url: imageUrl,
          });

      if (postError) throw postError;

      setPostContent("");
      setPostImageFile(null);

      await loadPosts();
    } catch (err) {
      alert(
        `Beitrag konnte nicht erstellt werden:\n\n${getErrorMessage(
          err
        )}`
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
        const { error } =
          await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", session.user.id);

        if (error) throw error;

        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  liked: false,
                  like_count: Math.max(
                    0,
                    (post.like_count || 0) - 1
                  ),
                }
              : post
          )
        );

        return;
      }

      const { data: existingLike, error: checkError } =
        await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", session.user.id)
          .maybeSingle();

      if (checkError) throw checkError;

      if (existingLike) {
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? { ...post, liked: true }
              : post
          )
        );

        return;
      }

      const { error: insertError } =
        await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: session.user.id,
          });

      if (
        insertError &&
        insertError.code !== "23505"
      ) {
        throw insertError;
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: true,
                like_count:
                  insertError?.code === "23505"
                    ? post.like_count || 0
                    : (post.like_count || 0) + 1,
              }
            : post
        )
      );
    } catch (error) {
      alert(
        `Like konnte nicht gespeichert werden:\n\n${getErrorMessage(
          error
        )}`
      );
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
    setPosts([]);
    setPage("home");
    setMobileMenu(false);
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

  const currentProfile = profile;
  const currentSession = session;

  return (
    <div className="app">
      <header className="mobile-header">
        <button
          className="icon-button"
          type="button"
          onClick={() => setMobileMenu(true)}
        >
          <Menu size={23} />
        </button>

        <strong>CrowSocial</strong>

        <Avatar
          profile={currentProfile}
          size={34}
        />
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
            type="button"
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
            session={currentSession}
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

        {page === "settings" && (
          <SettingsPage
            profile={currentProfile}
            onEditProfile={() => setEditProfile(true)}
            onPassword={() => setPasswordModal(true)}
            onLogout={logout}
          />
        )}

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
          onSaved={(updated) => setProfile(updated)}
        />
      )}

      {passwordModal && (
        <PasswordModal
          onClose={() => setPasswordModal(false)}
        />
      )}
    </div>
  );
}

createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
