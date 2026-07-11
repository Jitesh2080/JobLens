import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-white">JobLens</span>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
