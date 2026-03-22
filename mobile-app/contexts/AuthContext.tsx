import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import type { User, LoginRequest, GoogleLoginRequest, LoginResponse, SiteMode } from '../types/auth';
import { isInternalRole } from '../types/auth';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    siteMode: SiteMode;
    isInternalUser: boolean;
    siteMode: SiteMode;
    isInternalUser: boolean;
    login: (data: LoginRequest) => Promise<LoginResponse>;
    loginWithGoogle: (data: GoogleLoginRequest) => Promise<LoginResponse>;
    loginWithGoogle: (data: GoogleLoginRequest) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    validateSession: () => Promise<boolean>;
    setSiteMode: (mode: SiteMode) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const SITE_MODE_KEY = 'site_mode';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const SITE_MODE_KEY = 'site_mode';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [siteMode, setSiteModeState] = useState<SiteMode>('customer');
    const [siteMode, setSiteModeState] = useState<SiteMode>('customer');
    const [isLoading, setIsLoading] = useState(true);

    const setSiteMode = useCallback(async (mode: SiteMode) => {
        setSiteModeState(mode);
        await AsyncStorage.setItem(SITE_MODE_KEY, mode);
    }, []);

    // Load stored auth on mount and validate current session
    useEffect(() => {
        (async () => {
            try {
                const [storedToken, storedUser, storedSiteMode] = await Promise.all([
                    AsyncStorage.getItem(TOKEN_KEY),
                    AsyncStorage.getItem(USER_KEY),
                    AsyncStorage.getItem(SITE_MODE_KEY),
                const [storedToken, storedUser, storedSiteMode] = await Promise.all([
                    AsyncStorage.getItem(TOKEN_KEY),
                    AsyncStorage.getItem(USER_KEY),
                    AsyncStorage.getItem(SITE_MODE_KEY),
                ]);

                if (storedToken) {
                    setToken(storedToken);
                }

                if (storedSiteMode === 'customer' || storedSiteMode === 'admin') {
                    setSiteModeState(storedSiteMode);
                }

                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser) as User;
                        setUser(parsedUser);

                        if (!isInternalRole(parsedUser.Role) && storedSiteMode !== 'customer') {
                            await AsyncStorage.setItem(SITE_MODE_KEY, 'customer');
                            setSiteModeState('customer');
                        }
                    } catch {
                        // ignore JSON parse errors
                    }
                }

                if (storedToken) {
                    const isValid = await authService.validateSession();
                    if (!isValid) {
                        setToken(null);
                        setUser(null);
                        setSiteModeState('customer');
                        await AsyncStorage.removeItem(SITE_MODE_KEY);
                    } else {
                        const latestUser = await authService.getUser();
                        setUser(latestUser);

                        if (!isInternalRole(latestUser?.Role)) {
                            await AsyncStorage.setItem(SITE_MODE_KEY, 'customer');
                            setSiteModeState('customer');
                        }
                    }
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await authService.login(data);
        if (response.Success && response.Data) {
            setToken(response.Data.Token);
            setUser(response.Data.User);

            if (!isInternalRole(response.Data.User.Role)) {
                await AsyncStorage.setItem(SITE_MODE_KEY, 'customer');
                setSiteModeState('customer');
            }
        }
        return response;
    }, []);

    const loginWithGoogle = useCallback(async (data: GoogleLoginRequest): Promise<LoginResponse> => {
        const response = await authService.loginWithGoogle(data);
        if (response.Success && response.Data) {
            setToken(response.Data.Token);
            setUser(response.Data.User);

            if (!isInternalRole(response.Data.User.Role)) {
                await AsyncStorage.setItem(SITE_MODE_KEY, 'customer');
                setSiteModeState('customer');
            }
        }
        return response;
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setToken(null);
        setUser(null);
        setSiteModeState('customer');
        await AsyncStorage.removeItem(SITE_MODE_KEY);
        setSiteModeState('customer');
        await AsyncStorage.removeItem(SITE_MODE_KEY);
    }, []);

    const refreshUser = useCallback(async () => {
        const u = await authService.getUser();
        setUser(u);
        if (!isInternalRole(u?.Role)) {
            await setSiteMode('customer');
        }
    }, [setSiteMode]);

    const validateSession = useCallback(async () => {
        const isValid = await authService.validateSession();
        if (!isValid) {
            setToken(null);
            setUser(null);
            setSiteModeState('customer');
            await AsyncStorage.removeItem(SITE_MODE_KEY);
            return false;
        }

        const latestUser = await authService.getUser();
        setUser(latestUser);

        if (!isInternalRole(latestUser?.Role)) {
            await setSiteMode('customer');
        }

        if (!token) {
            const latestToken = await authService.getToken();
            setToken(latestToken);
        }
        return true;
    }, [token, setSiteMode]);

    const isInternalUser = isInternalRole(user?.Role);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!token,
                siteMode,
                isInternalUser,
                siteMode,
                isInternalUser,
                login,
                loginWithGoogle,
                loginWithGoogle,
                logout,
                refreshUser,
                validateSession,
                setSiteMode,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
