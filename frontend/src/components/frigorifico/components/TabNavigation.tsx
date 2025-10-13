// src/components/frigorifico/components/TabNavigation.tsx
interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: 'pendientes' | 'recepcion' | 'procesamiento' | 'cortes' | 'exportacion') => void;
}

const tabs = [
  { id: 'pendientes', label: '⏳ Pendientes', icon: '⏳' },
  { id: 'recepcion', label: '📥 Recepción', icon: '📥' },
  { id: 'procesamiento', label: '🔪 Procesamiento', icon: '🔪' },
  { id: 'cortes', label: '🥩 Cortes', icon: '🥩' },
  { id: 'exportacion', label: '🌍 Exportación', icon: '🌍' }
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg">
      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}