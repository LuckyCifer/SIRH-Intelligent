/**
 * Store Zustand — Authentification
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../api/axios";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const { data } = await api.post("/auth/login/", { username, password });
        localStorage.setItem("access_token",  data.access);
        localStorage.setItem("refresh_token", data.refresh);
        // Récupérer le profil
        const meRes = await api.get("/accounts/me/");
        set({
          user: meRes.data,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        });
        return meRes.data;
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const { data } = await api.get("/accounts/me/");
        set({ user: data });
      },
    }),
    { name: "sirh-auth", partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }) }
  )
);

export default useAuthStore;
