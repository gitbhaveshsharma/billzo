"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface DashboardLayoutProps {
    children: React.ReactNode;
    requiredRole?: string | string[];
    title?: string;
    description?: string;
}

/**
 * Shared dashboard layout component
 * Provides role-gating and common dashboard UI structure
 */
export function DashboardLayout({
    children,
    requiredRole,
    title,
    description,
}: DashboardLayoutProps) {
    const { isAuthenticated, isInitialized } = useAuth();
    const { userRole, isLoading } = useRole();

    // Show loading state
    if (!isInitialized || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p>Please log in to access this dashboard.</p>
                </div>
            </div>
        );
    }

    // Check role access
    if (requiredRole) {
        const requiredRoles = Array.isArray(requiredRole)
            ? requiredRole
            : [requiredRole];
        if (!userRole || !requiredRoles.includes(userRole)) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">Insufficient Permissions</h1>
                        <p>Your role does not have access to this dashboard.</p>
                    </div>
                </div>
            );
        }
    }

    // Render dashboard
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Dashboard Header */}
            {(title || description) && (
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
                        {description && (
                            <p className="mt-2 text-sm text-gray-600">{description}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Dashboard Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </div>
        </div>
    );
}
