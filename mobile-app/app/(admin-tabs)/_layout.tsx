import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { isInternalRole } from '../../types/auth';

export default function AdminTabLayout() {
    const { user } = useAuth();
    const isAdmin = user ? String(user.Role).toUpperCase() === 'ADMIN' || Number(user.Role) === 2 : false;
    const isStaff = user ? String(user.Role).toUpperCase() === 'STAFF' || Number(user.Role) === 1 : false;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: AppColors.primary,
                tabBarInactiveTintColor: AppColors.textMuted,
                tabBarStyle: {
                    backgroundColor: AppColors.surface,
                    borderTopColor: AppColors.borderLight,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            {isAdmin && (
                <Tabs.Screen
                    name="dashboard"
                    options={{
                        title: 'Báo cáo',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="analytics" size={size} color={color} />
                        ),
                    }}
                />
            )}

            {(isAdmin || isStaff || isInternalRole(user?.Role)) && (
                <Tabs.Screen
                    name="orders"
                    options={{
                        title: 'Đơn hàng',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="receipt" size={size} color={color} />
                        ),
                    }}
                />
            )}

            <Tabs.Screen
                name="account"
                options={{
                    title: 'Tài khoản',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
