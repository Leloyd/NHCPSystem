import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Send,
} from "lucide-react";

type AuthView = "login" | "signup" | "forgot" | "verify" | "forgot-success";

interface AuthUser {
  email: string;
  name: string;
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [resentLoading, setResentLoading] = useState(false);

  const resetForm = () => {
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setLoading(false);
    setResent(false);
  };

  const switchView = (v: AuthView) => {
    resetForm();
    setView(v);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onAuthenticated({ email, name: email.split("@")[0] });
    onClose();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    switchView("verify");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    switchView("forgot-success");
  };

  const handleResend = async () => {
    setResentLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setResentLoading(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  const handleClose = () => {
    resetForm();
    setView("login");
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#FAF6EF", border: "1px solid rgba(184,150,62,0.2)" }}>
            {/* Top gold accent bar */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #B8963E, #C9A84C, #B8963E)" }} />

            <div className="px-8 py-8">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-5 right-5 p-2 rounded-full transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                aria-label="Close"
              >
                <X size={18} style={{ color: "#7D6B54" }} />
              </button>

              {/* LOGIN VIEW */}
              {view === "login" && (
                <div>
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-full mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B8963E22, #C9A84C44)" }}>
                      <span style={{ fontSize: 20 }}>🏛️</span>
                    </div>
                    <Dialog.Title className="text-2xl" style={{ color: "#2C1A0E", fontWeight: 600 }}>Welcome Back</Dialog.Title>
                    <p className="mt-1" style={{ color: "#7D6B54" }}>Continue your digital heritage experience.</p>
                  </div>

                  <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border transition-all hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-600/40 mb-5" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#2C1A0E" }}>
                    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
                    <span style={{ color: "#9E8B72", fontSize: 13 }}>or</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
                  </div>

                  <form onSubmit={handleLogin} noValidate>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="login-email" className="block mb-1.5" style={{ color: "#3D2B1F", fontSize: 14, fontWeight: 500 }}>Email address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9E8B72" }} />
                          <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full pl-9 pr-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                            style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="login-password" className="block mb-1.5" style={{ color: "#3D2B1F", fontSize: 14, fontWeight: 500 }}>Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9E8B72" }} />
                          <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-11 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                            style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
                          />
                          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff size={16} style={{ color: "#9E8B72" }} /> : <Eye size={16} style={{ color: "#9E8B72" }} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mt-3 px-3 py-2.5 rounded-lg flex items-start gap-2" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                        <span style={{ color: "#DC2626", fontSize: 13 }}>⚠ {error}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => switchView("forgot")}
                      className="mt-3 text-sm hover:underline focus:outline-none focus:underline"
                      style={{ color: "#B8963E" }}
                    >
                      Forgot Password?
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-600/40 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #2C1A0E, #3D2B1F)", color: "#F5EDD6", fontWeight: 600 }}
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : "Login"}
                    </button>
                  </form>

                  <p className="mt-5 text-center" style={{ color: "#7D6B54", fontSize: 14 }}>
                    Don't have an account?{" "}
                    <button onClick={() => switchView("signup")} className="hover:underline focus:outline-none focus:underline" style={{ color: "#B8963E", fontWeight: 500 }}>Sign up</button>
                  </p>
                </div>
              )}

              {/* SIGNUP VIEW */}
              {view === "signup" && (
                <div>
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-full mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B8963E22, #C9A84C44)" }}>
                      <span style={{ fontSize: 20 }}>✨</span>
                    </div>
                    <Dialog.Title className="text-2xl" style={{ color: "#2C1A0E", fontWeight: 600 }}>Create Your Account</Dialog.Title>
                    <p className="mt-1" style={{ color: "#7D6B54" }}>Join the digital heritage experience.</p>
                  </div>

                  <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border transition-all hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-600/40 mb-5" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#2C1A0E" }}>
                    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
                    <span style={{ color: "#9E8B72", fontSize: 13 }}>or</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
                  </div>

                  <form onSubmit={handleSignup} noValidate>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="signup-email" className="block mb-1.5" style={{ color: "#3D2B1F", fontSize: 14, fontWeight: 500 }}>Email address <span style={{ color: "#DC2626" }}>*</span></label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9E8B72" }} />
                          <input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full pl-9 pr-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                            style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="signup-password" className="block mb-1.5" style={{ color: "#3D2B1F", fontSize: 14, fontWeight: 500 }}>Password <span style={{ color: "#DC2626" }}>*</span></label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9E8B72" }} />
                          <input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                            className="w-full pl-9 pr-11 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                            style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
                          />
                          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff size={16} style={{ color: "#9E8B72" }} /> : <Eye size={16} style={{ color: "#9E8B72" }} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="signup-confirm" className="block mb-1.5" style={{ color: "#3D2B1F", fontSize: 14, fontWeight: 500 }}>Confirm Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9E8B72" }} />
                          <input
                            id="signup-confirm"
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            className="w-full pl-9 pr-11 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                            style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
                          />
                          <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label={showConfirm ? "Hide" : "Show"}>
                            {showConfirm ? <EyeOff size={16} style={{ color: "#9E8B72" }} /> : <Eye size={16} style={{ color: "#9E8B72" }} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mt-3 px-3 py-2.5 rounded-lg" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                        <span style={{ color: "#DC2626", fontSize: 13 }}>⚠ {error}</span>
                      </div>
                    )}

                    <p className="mt-3" style={{ color: "#9E8B72", fontSize: 13 }}>
                      A verification email will be sent to confirm your account.
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-600/40 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #2C1A0E, #3D2B1F)", color: "#F5EDD6", fontWeight: 600 }}
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : "Sign Up"}
                    </button>
                  </form>

                  <p className="mt-5 text-center" style={{ color: "#7D6B54", fontSize: 14 }}>
                    Already have an account?{" "}
                    <button onClick={() => switchView("login")} className="hover:underline focus:outline-none focus:underline" style={{ color: "#B8963E", fontWeight: 500 }}>Login</button>
                  </p>
                </div>
              )}

              {/* FORGOT PASSWORD VIEW */}
              {view === "forgot" && (
                <div>
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-full mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B8963E22, #C9A84C44)" }}>
                      <Lock size={20} style={{ color: "#B8963E" }} />
                    </div>
                    <Dialog.Title className="text-2xl" style={{ color: "#2C1A0E", fontWeight: 600 }}>Reset Your Password</Dialog.Title>
                    <p className="mt-1" style={{ color: "#7D6B54" }}>Enter your email and we'll send you a reset link.</p>
                  </div>

                  <form onSubmit={handleForgot} noValidate>
                    <div>
                      <label htmlFor="forgot-email" className="block mb-1.5" style={{ color: "#3D2B1F", fontSize: 14, fontWeight: 500 }}>Email address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9E8B72" }} />
                        <input
                          id="forgot-email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-9 pr-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                          style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="mt-3 px-3 py-2.5 rounded-lg" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                        <span style={{ color: "#DC2626", fontSize: 13 }}>⚠ {error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-5 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-600/40 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #2C1A0E, #3D2B1F)", color: "#F5EDD6", fontWeight: 600 }}
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send Reset Link</>}
                    </button>
                  </form>

                  <button onClick={() => switchView("login")} className="mt-4 flex items-center gap-1.5 text-sm hover:underline focus:outline-none focus:underline" style={{ color: "#B8963E" }}>
                    <ArrowLeft size={14} /> Back to Login
                  </button>
                </div>
              )}

              {/* FORGOT SUCCESS VIEW */}
              {view === "forgot-success" && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4EDDA, #A8D5B5)" }}>
                    <CheckCircle size={32} style={{ color: "#2D6A4F" }} />
                  </div>
                  <Dialog.Title className="text-2xl mb-2" style={{ color: "#2C1A0E", fontWeight: 600 }}>Check Your Inbox</Dialog.Title>
                  <p style={{ color: "#7D6B54" }}>
                    Password reset link sent to <strong style={{ color: "#3D2B1F" }}>{email}</strong>. Please check your inbox.
                  </p>
                  <button
                    onClick={() => switchView("login")}
                    className="mt-6 w-full py-3 px-4 rounded-xl transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                    style={{ background: "linear-gradient(135deg, #2C1A0E, #3D2B1F)", color: "#F5EDD6", fontWeight: 600 }}
                  >
                    Back to Login
                  </button>
                </div>
              )}

              {/* VERIFY EMAIL VIEW */}
              {view === "verify" && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFF3E0, #FFE0B2)" }}>
                    <span style={{ fontSize: 36 }}>✉️</span>
                  </div>
                  <Dialog.Title className="text-2xl mb-2" style={{ color: "#2C1A0E", fontWeight: 600 }}>Check Your Inbox</Dialog.Title>
                  <p style={{ color: "#7D6B54" }}>
                    We sent a verification email to{" "}
                    <strong style={{ color: "#3D2B1F" }}>{email}</strong>. Please open the email and click the verification button to continue.
                  </p>

                  {resent && (
                    <div className="mt-4 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2" style={{ background: "#D4EDDA", border: "1px solid #A8D5B5" }}>
                      <CheckCircle size={15} style={{ color: "#2D6A4F" }} />
                      <span style={{ color: "#2D6A4F", fontSize: 14 }}>Verification email resent.</span>
                    </div>
                  )}

                  <button
                    onClick={handleResend}
                    disabled={resentLoading}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600/40 disabled:opacity-60"
                    style={{ borderColor: "rgba(184,150,62,0.4)", color: "#B8963E", fontWeight: 500 }}
                  >
                    {resentLoading ? <><Loader2 size={15} className="animate-spin" /> Resending...</> : "Resend Verification Email"}
                  </button>

                  <div className="mt-3 flex flex-col gap-2">
                    <button onClick={() => { setEmail(""); switchView("signup"); }} className="text-sm hover:underline focus:outline-none" style={{ color: "#9E8B72" }}>
                      Use another email
                    </button>
                    <button onClick={() => switchView("login")} className="flex items-center justify-center gap-1.5 text-sm hover:underline focus:outline-none" style={{ color: "#B8963E" }}>
                      <ArrowLeft size={13} /> Back to Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
