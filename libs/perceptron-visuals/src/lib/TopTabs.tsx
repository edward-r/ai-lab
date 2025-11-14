import React from 'react'
import { usePersistentState } from './hooks/usePersistentState'

export type TopTabConfig = {
  key: string
  label: string
  render: () => React.ReactNode
}

export const TopTabs: React.FC<{ tabs: TopTabConfig[] }> = ({ tabs }) => {
  const [active, setActive] = usePersistentState<string>('pl.topTab', tabs[0]?.key ?? 'lab')

  const current = tabs.find((tab) => tab.key === active) ?? tabs[0]

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-2">
        <div className="flex gap-2 max-w-7xl mx-auto px-6">
          {tabs.map((tab) => {
            const isActive = tab.key === active
            return (
              <button
                key={tab.key}
                type="button"
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => setActive(tab.key)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>{current ? current.render() : null}</div>
    </div>
  )
}
