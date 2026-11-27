import { create } from "zustand"
import { persist } from "zustand/middleware"
import defaultUsers from "../data/users.json"

export type StoredUser = {
  id: string
  username: string
  email: string
  password: string
}

export type User = {
  id: string
  username: string
  email: string
}

type AuthResult = { ok: true } | { ok: false; error: string }

type AuthState = {
  user: User | null
  registeredUsers: StoredUser[]
  /** new passwords for the built-in accounts in users.json (that file can't be changed from the browser) */
  passwordOverrides: Record<string, string>
  /** identifier: a username or an email address */
  login: (identifier: string, password: string) => AuthResult
  signup: (username: string, email: string, password: string) => AuthResult
  logout: () => void
  /** the account registered with this email, if any (used before sending a reset code) */
  findByEmail: (email: string) => User | null
  /** saves a new password for the account with this email; call only after the server verified the reset code */
  resetPassword: (email: string, newPassword: string) => AuthResult
}

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const seedUsers: StoredUser[] = defaultUsers

function createAccountId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `acct-${crypto.randomUUID().slice(0, 8)}`
  }
  return `acct-${Math.random().toString(36).slice(2, 10)}`
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const toUser = ({ id, username, email }: StoredUser): User => ({ id, username, email })

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => {
      /** every account, with any reset password applied to the built-in ones */
      const allUsers = (): StoredUser[] => {
        const { registeredUsers, passwordOverrides } = get()
        const seeds = seedUsers.map((u) => ({ ...u, password: passwordOverrides[u.id] ?? u.password }))
        return [...seeds, ...registeredUsers]
      }

      return {
        user: null,
        registeredUsers: [],
        passwordOverrides: {},
        login: (identifier, password) => {
          const match = allUsers().find(
            (u) => same(u.username, identifier) || (u.email !== "" && same(u.email, identifier))
          )

          if (!match || match.password !== password) {
            return { ok: false, error: "Invalid username, email or password." }
          }

          set({ user: toUser(match) })
          return { ok: true }
        },
        signup: (username, email, password) => {
          const trimmed = username.trim()
          const trimmedEmail = email.trim()
          const users = allUsers()

          if (!EMAIL_PATTERN.test(trimmedEmail)) {
            return { ok: false, error: "Please enter a valid email address." }
          }
          if (trimmed.includes("@")) {
            return { ok: false, error: "Usernames can't contain @." }
          }
          if (users.some((u) => same(u.username, trimmed))) {
            return { ok: false, error: "That username is already taken." }
          }
          if (users.some((u) => u.email !== "" && same(u.email, trimmedEmail))) {
            return { ok: false, error: "An account with that email already exists." }
          }

          const newUser: StoredUser = {
            id: createAccountId(),
            username: trimmed,
            email: trimmedEmail,
            password,
          }
          set((state) => ({
            registeredUsers: [...state.registeredUsers, newUser],
            user: toUser(newUser),
          }))
          return { ok: true }
        },
        logout: () => set({ user: null }),
        findByEmail: (email) => {
          const match = allUsers().find((u) => u.email !== "" && same(u.email, email))
          return match ? toUser(match) : null
        },
        resetPassword: (email, newPassword) => {
          const match = allUsers().find((u) => u.email !== "" && same(u.email, email))
          if (!match) {
            return { ok: false, error: "No account uses that email." }
          }

          if (seedUsers.some((u) => u.id === match.id)) {
            set((state) => ({ passwordOverrides: { ...state.passwordOverrides, [match.id]: newPassword } }))
          } else {
            set((state) => ({
              registeredUsers: state.registeredUsers.map((u) =>
                u.id === match.id ? { ...u, password: newPassword } : u
              ),
            }))
          }
          return { ok: true }
        },
      }
    },
    {
      name: "lss-auth",
      version: 3,
      partialize: ({ user, registeredUsers, passwordOverrides }) => ({ user, registeredUsers, passwordOverrides }),
      migrate: (persistedState) => {
        const state = persistedState as
          | (Partial<Pick<AuthState, "registeredUsers" | "passwordOverrides">> & {
              user?: Partial<User> | null
            })
          | undefined
        if (!state) return { user: null, registeredUsers: [], passwordOverrides: {} }

        // accounts made before email was added keep working, with an empty email (they can't reset by email)
        const registeredUsers = (state.registeredUsers ?? []).map((u) => ({
          ...u,
          id: u.id || createAccountId(),
          email: u.email ?? "",
        }))
        const allUsers = [...seedUsers, ...registeredUsers]
        const saved = state.user
        const account = saved?.username ? allUsers.find((u) => same(u.username, saved.username!)) : undefined
        const user = saved?.username
          ? {
              id: saved.id || account?.id || createAccountId(),
              username: saved.username,
              email: saved.email ?? account?.email ?? "",
            }
          : null

        return { user, registeredUsers, passwordOverrides: state.passwordOverrides ?? {} }
      },
    }
  )
)
