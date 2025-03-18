
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Scripts from "@/pages/Scripts";
import Clients from "@/pages/Clients";
import Screenshots from "@/pages/Screenshots";
import Settings from "@/pages/Settings";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <AppLayout>
          <Dashboard />
        </AppLayout>
      } />
      
      <Route path="/scripts" element={
        <AppLayout>
          <Scripts />
        </AppLayout>
      } />
      
      <Route path="/clients" element={
        <AppLayout>
          <Clients />
        </AppLayout>
      } />
      
      <Route path="/screenshots" element={
        <AppLayout>
          <Screenshots />
        </AppLayout>
      } />
      
      <Route path="/settings" element={
        <AppLayout>
          <Settings />
        </AppLayout>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
