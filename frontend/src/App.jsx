// import FloorDashboard from './FloorDashboard.jsx';
// export default function App() {
//   return <FloorDashboard />;
// }
// App()
// App.jsx
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AuthPage from './AuthPage';
import FloorDashboard from './FloorDashboard';
import AdminDashboard from './AdminDashboard';
import ProfilePage from './ProfilePage';

function AuthRoute() {
  const navigate = useNavigate();
  return <AuthPage onAuthed={() => navigate('/home')} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthRoute />} />
        <Route path="/home" element={<FloorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
