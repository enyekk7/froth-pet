import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import NavBar from './components/NavBar';
import PetPage from './pages/Pet';
import MintPage from './pages/Mint';
import GamePage from './pages/Game';
import GameDetail from './pages/GameDetail';
import PlayGame from './pages/PlayGame';
import ShopPage from './pages/Shop';
import ObrolanPage from './pages/Obrolan';

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen overflow-hidden bg-gradient-to-br from-white via-green-50 to-emerald-50 flex flex-col">
        <Header />
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/pet" replace />} />
            <Route path="/pet" element={<PetPage />} />
            <Route path="/pet/mint" element={<MintPage />} />
            <Route path="/game" element={<div className="h-full overflow-auto pb-20"><GamePage /></div>} />
            <Route path="/game/:gameId" element={<div className="h-full overflow-hidden pb-20"><GameDetail /></div>} />
            <Route path="/game/:gameId/play" element={<PlayGame />} />
            <Route path="/shop" element={<div className="h-full overflow-auto pb-20"><ShopPage /></div>} />
            <Route path="/chat" element={<div className="h-full overflow-hidden"><ObrolanPage /></div>} />
          </Routes>
        </div>
        <div className="flex-shrink-0">
          <NavBar />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

