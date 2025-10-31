import { useNavigate, useLocation } from 'react-router-dom';
import { Cat, Gamepad2, ShoppingBag, MessageCircle } from 'lucide-react';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/pet', label: 'Pet', Icon: Cat },
    { path: '/game', label: 'Game', Icon: Gamepad2 },
    { path: '/shop', label: 'Shop', Icon: ShoppingBag },
    { path: '/chat', label: 'Chat', Icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-200 shadow-lg z-50">
      <div className="flex justify-around items-center py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          const IconComponent = tab.Icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
              }`}
            >
              <IconComponent 
                size={24} 
                strokeWidth={2.5}
                className={`transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

