import { create } from 'zustand';
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    isLoading: false,

    register: async (email, username, password) => {
        set({ isLoading: true });
        try {
            const res = await fetch(
                "http://localhost:3000/api/auth/register",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, username, password })
                }
            )

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Something went wrong in registration");
            }

            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            await AsyncStorage.setItem("token", JSON.stringify(data.token));

            set({
                token: data.token,
                user: data.user,
                isLoading: false
            })

            return { success: true };
        } catch (error) {
            set({ isLoading: false })
            return { success: false, error: error.message };
        }
    },

    checkAuth: async () => {
        try {
            set({isLoading: true});

            const token = await AsyncStorage.getItem("token");
            const userJson = await AsyncStorage.getItem("user");
            const user = userJson ? JSON.parse(userJson) : null;

            set({
                token,
                user,
                isLoading: false
            });

        } catch (error) {
            console.log("Auth check failed");
            set({isLoading: false});
        }
    },

    login: async(email, password) => {
        set({isLoading: true})
        try {
            const res = await fetch(
                "http://localhost:3000/api/auth/login",
                {
                    method:"POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({email, password})
                }
            )

            const data = await res.json();
            if(!res.ok){
                throw new Error(data.message || "Something went wrong in login")
            }

            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            await AsyncStorage.setItem("token", JSON.stringify(data.token));

            set({
                token: data.token,
                user:data.user,
                isLoading:false
            })

            return {success: true};
            
        } catch (error) {
            set({isLoading: false});
            return {success: false, error: error.message};
        }finally{
            set({isLoading: false})
        }
    },

    logout: async () => {
        try {
            set({isLoading: true})
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            set({ token: null, user: null, isLoading:false });

            return {success: true};
        } catch (error) {
            set({isLoading: false});
            return {success: false, error: "Logout failed"}
        }
    }
}))