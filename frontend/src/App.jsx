// import FloorDashboard from './FloorDashboard.jsx';
// export default function App() {
//   return <FloorDashboard />;
// }
// App()
// App.jsx
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AuthPage from './AuthPage';
import FloorDashboard from './FloorDashboard';

function AuthRoute() {
  const navigate = useNavigate();
  return <AuthPage onAuthed={() => navigate('/')} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/" element={<FloorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
