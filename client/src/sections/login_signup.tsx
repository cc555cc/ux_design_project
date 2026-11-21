import { useState, type FormEvent } from "react"
import { useAuth } from "../hook/useAuth"

type Mode = "login" | "signup"

function LoginSignupSection() {
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const login = useAuth((state) => state.login)
  const signup = useAuth((state) => state.signup)

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      setError("Please fill in your username and password.")
      return
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
      const result = signup(trimmedUsername, password)
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

  return (
    <section
      id="loginSignupPage"
      className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 pt-[12vh] pb-12"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center font-gasoek text-3xl text-[#D62828]">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          {mode === "login"
            ? "Sign in to view your account and past orders."
            : "Join Long Story Sub to save your favorite orders."}
        </p>

        {/* Mode toggle tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
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
            className={`rounded-lg py-2 text-sm font-semibold transition ${
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
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sandwichlover"
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-[#D62828] py-3 font-gasoek text-lg text-white transition hover:bg-red-700"
          >
            {mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>
      </div>
    </section>
  )
}

export default LoginSignupSection
