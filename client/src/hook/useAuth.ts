import { create } from "zustand"
import { persist } from "zustand/middleware"
import defaultUsers from "../data/users.json"

export type StoredUser = {
  id: string
  username: string
  password: string
}

export type User = {
  id: string
  username: string
}

type AuthResult = { ok: true } | { ok: false; error: string }

type AuthState = {
  user: User | null
  registeredUsers: StoredUser[]
  login: (username: string, password: string) => AuthResult
  signup: (username: string, password: string) => AuthResult
  logout: () => void
}

const seedUsers: StoredUser[] = defaultUsers

function createAccountId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `acct-${crypto.randomUUID().slice(0, 8)}`
  }
  return `acct-${Math.random().toString(36).slice(2, 10)}`
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      registeredUsers: [],
      login: (username, password) => {
        const trimmed = username.trim()
        const allUsers = [...seedUsers, ...get().registeredUsers]
        const match = allUsers.find(
          (u) => u.username.toLowerCase() === trimmed.toLowerCase()
        )

        if (!match || match.password !== password) {
          return { ok: false, error: "Invalid username or password." }
        }

        set({ user: { id: match.id, username: match.username } })
        return { ok: true }
      },
      signup: (username, password) => {
        const trimmed = username.trim()
        const allUsers = [...seedUsers, ...get().registeredUsers]
        const exists = allUsers.some(
          (u) => u.username.toLowerCase() === trimmed.toLowerCase()
        )

        if (exists) {
          return { ok: false, error: "That username is already taken." }
        }

        const newUser: StoredUser = {
          id: createAccountId(),
          username: trimmed,
          password,
        }
        set((state) => ({
          registeredUsers: [...state.registeredUsers, newUser],
          user: { id: newUser.id, username: newUser.username },
        }))
        return { ok: true }
      },
      logout: () => set({ user: null }),
    }),
    {
      name: "lss-auth",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState> | undefined
        if (!state) return { user: null, registeredUsers: [] }

        const registeredUsers = (state.registeredUsers ?? []).map((u) => ({
          ...u,
          id: u.id || createAccountId(),
        }))
        const allUsers = [...seedUsers, ...registeredUsers]
        const user = state.user
          ? {
              id:
                state.user.id ||
                allUsers.find(
                  (u) => u.username.toLowerCase() === state.user!.username.toLowerCase()
                )?.id ||
                createAccountId(),
              username: state.user.username,
            }
          : null

        return { user, registeredUsers }
      },
    }
  )
)
