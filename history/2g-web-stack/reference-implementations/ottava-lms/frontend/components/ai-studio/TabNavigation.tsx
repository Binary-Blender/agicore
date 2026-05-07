interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  completedTabs?: string[];
  tabsWithUnsavedWork?: string[];
  disabledTabIds?: string[];
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  completedTabs = [],
  tabsWithUnsavedWork = [],
  disabledTabIds = [],
}: TabNavigationProps) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCompleted = completedTabs.includes(tab.id);
            const hasUnsavedWork = tabsWithUnsavedWork.includes(tab.id);
            const isDisabled = disabledTabIds.includes(tab.id) && !isActive;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isDisabled) {
                    onTabChange(tab.id);
                  }
                }}
                disabled={isDisabled}
                className={`
                  relative flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap
                  transition-all duration-200 border-b-2
                  ${
                    isDisabled
                      ? 'border-transparent text-gray-300 cursor-not-allowed'
                      : isActive
                      ? 'border-primary-600 text-primary-700 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span>{tab.label}</span>
                {isCompleted && !isActive && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs">
                    ✓
                  </span>
                )}
                {hasUnsavedWork && !isActive && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-yellow-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
