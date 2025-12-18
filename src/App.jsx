import React from "react";
import Navbar from "./components/Navbar.jsx";
import { Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Domains from "./pages/Domains";
import LanderCreation from "./pages/LanderCreation";
import Footer from "./components/Footer.jsx";
import EditRoute from "./pages/EditRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TestRun from "./testing/TestRun.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function App() {
  return (
    <ErrorBoundary>
      <Navbar />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route
          path="/domains"
          element={
            <ProtectedRoute>
              <Domains />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <LanderCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:domain/:route"
          element={
            <ProtectedRoute>
              <EditRoute />
            </ProtectedRoute>
          }
        />
        <Route path="/test" element={<TestRun />} />
      </Routes>
      <Footer />
    </ErrorBoundary>
  );
}

export default App;
