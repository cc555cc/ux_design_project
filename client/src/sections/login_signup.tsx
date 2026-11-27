import { useState, type FormEvent } from "react"
import { EMAIL_PATTERN, useAuth } from "../hook/useAuth"

type Mode = "login" | "signup" | "forgot"
/** forgot password: ask for the email, then the emailed code + a new password, then a success message */
type ResetStep = "email" | "code" | "done"

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20"
const submitClass =
  "w-full cursor-pointer rounded-xl bg-[#D62828] py-3 font-gasoek text-xl text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
const linkClass = "cursor-pointer text-base font-medium text-[#D62828] hover:underline"

const MIN_PASSWORD_LENGTH = 6

/** POSTs to the API; resolves to null on success, or the message to show */
async function postJson(path: string, body: object): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (response.ok) return null
    const data = await response.json().catch(() => ({}) as { error?: string })
    if (response.status === 503) return "Password reset emails aren't set up on the server yet."
    return data.error ?? "Something went wrong. Please try again."
  } catch {
    return "The server could not be reached. Please try again."
  }
}

function LoginSignupSection() {
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [resetStep, setResetStep] = useState<ResetStep>("email")
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const login = useAuth((state) => state.login)
  const signup = useAuth((state) => state.signup)
  const findByEmail = useAuth((state) => state.findByEmail)
  const resetPassword = useAuth((state) => state.resetPassword)

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
    setNotice(null)
    setPassword("")
    setConfirmPassword("")
    if (nextMode === "forgot") {
      setResetStep("email")
      setResetCode("")
      // carry over what was typed in the login box when it's an email
      setResetEmail(EMAIL_PATTERN.test(username.trim()) ? username.trim() : "")
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      setError(mode === "login" ? "Please fill in your username or email and password." : "Please fill in your username and password.")
      return
    }

    if (mode === "signup") {
      if (!EMAIL_PATTERN.test(email.trim())) {
        setError("Please enter a valid email address.")
        return
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
      const result = signup(trimmedUsername, email, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
    } else {
      const result = login(trimmedUsername, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
    }

    window.location.hash = "#account"
  }

  const sendResetCode = async () => {
    setError(null)
    setNotice(null)
    const trimmed = resetEmail.trim()
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Please enter a valid email address.")
      return
    }
    // accounts live in this browser, so it can tell straight away whether the email belongs to one
    if (!findByEmail(trimmed)) {
      setError("No account on this device uses that email.")
      return
    }

    setBusy(true)
    const failure = await postJson("/api/auth/reset-code", { email: trimmed })
    setBusy(false)
    if (failure) {
      setError(failure)
      return
    }
    setResetStep("code")
    setNotice(`We sent a 6-digit code to ${trimmed}. It expires in 10 minutes.`)
  }

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (resetStep === "email") {
      await sendResetCode()
      return
    }

    setError(null)
    const code = resetCode.trim()
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.")
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setBusy(true)
    const failure = await postJson("/api/auth/verify-reset", { email: resetEmail.trim(), code })
    setBusy(false)
    if (failure) {
      setError(failure)
      return
    }

    const result = resetPassword(resetEmail, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPassword("")
    setConfirmPassword("")
    setNotice(null)
    setResetStep("done")
  }

  const backToLogin = () => {
    setUsername(resetEmail.trim())
    switchMode("login")
  }

  const title = mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"
  const subtitle =
    mode === "login"
      ? "Sign in to view your account and past orders."
      : mode === "signup"
        ? "Join Long Story Sub to save your favorite orders."
        : resetStep === "email"
          ? "Enter your account's email and we'll send you a code."
          : resetStep === "code"
            ? "Enter the code from the email and choose a new password."
            : "Your password has been changed."

  return (
    <section
      id="loginSignupPage"
      className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 pt-[12vh] pb-12"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center font-gasoek text-3xl text-[#D62828]">{title}</h1>
        <p className="mt-2 text-center text-base text-gray-600">{subtitle}</p>

        {mode === "forgot" ? (
          resetStep === "done" ? (
            <div className="mt-6 space-y-4">
              <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-base text-green-800">
                You can now log in with your new password.
              </p>
              <button type="button" onClick={backToLogin} className={submitClass}>
                Back to Log In
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-base font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  readOnly={resetStep === "code"}
                  placeholder="you@example.com"
                  className={`${inputClass} read-only:bg-gray-50 read-only:text-gray-500`}
                />
              </div>

              {resetStep === "code" && (
                <>
                  <div>
                    <label htmlFor="resetCode" className="block text-base font-medium text-gray-700">
                      6-digit code
                    </label>
                    <input
                      id="resetCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className={`${inputClass} tracking-[0.4em]`}
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-base font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-base font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {notice && (
                <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-base text-green-800">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={submitClass}>
                {busy
                  ? resetStep === "email" ? "Sending…" : "Checking…"
                  : resetStep === "email" ? "Send Code" : "Reset Password"}
              </button>

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => switchMode("login")} className={linkClass}>
                  ← Back to Log In
                </button>
                {resetStep === "code" && (
                  <button type="button" onClick={sendResetCode} disabled={busy} className={linkClass}>
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )
        ) : (
          <>
            {/* Mode toggle tabs */}
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-lg py-2 text-base font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-lg py-2 text-base font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="block text-base font-medium text-gray-700">
                  {mode === "login" ? "Username or Email" : "Username"}
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === "login" ? "sandwichlover or you@example.com" : "sandwichlover"}
                  className={inputClass}
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label htmlFor="email" className="block text-base font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="password" className="block text-base font-medium text-gray-700">
                    Password
                  </label>
                  {mode === "login" && (
                    <button type="button" onClick={() => switchMode("forgot")} className={linkClass}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-base font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-700">
                  {error}
                </p>
              )}

              <button type="submit" className={submitClass}>
                {mode === "login" ? "Log In" : "Sign Up"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

export default LoginSignupSection
