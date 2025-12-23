'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  FileText,
  PieChart,
  Target,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Award,
  Edit,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Gamepad2,
  ShoppingBag,
  UtensilsCrossed,
  Car,
  Home,
  Film,
  MoreHorizontal,
} from 'lucide-react'
import { colors, shadows } from '@/styles/finebank-tokens'

// Sidebar Navigation Component
function Sidebar() {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', active: true },
    { icon: Wallet, label: 'Balances', active: false },
    { icon: ArrowLeftRight, label: 'Transactions', active: false },
    { icon: FileText, label: 'Bills', active: false },
    { icon: PieChart, label: 'Expenses', active: false },
    { icon: Target, label: 'Goals', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ]

  return (
    <div
      className="w-[280px] min-h-screen px-7 py-12 flex flex-col"
      style={{ backgroundColor: colors.black }}
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <span className="text-2xl tracking-wider" style={{ color: colors.white }}>
          <span className="font-extrabold">FINE</span>
          <span className="font-medium">bank.</span>
          <span className="font-extrabold">IO</span>
        </span>
      </div>

      {/* Menu Items */}
      <nav className="flex flex-col gap-4 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 px-4 py-3 rounded transition-colors"
            style={{
              backgroundColor: item.active ? colors.primary : 'transparent',
              color: item.active ? colors.white : `${colors.white}b3`,
            }}
          >
            <item.icon className="w-6 h-6" />
            <span className={item.active ? 'font-semibold' : 'font-normal'}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button
        className="flex items-center gap-3 px-4 py-3 transition-colors mt-auto"
        style={{ color: `${colors.white}b3` }}
      >
        <LogOut className="w-6 h-6" />
        <span>Logout</span>
      </button>

      {/* User Profile */}
      <div className="flex items-center gap-3 mt-6 pt-6" style={{ borderTop: `1px solid ${colors.white}1a` }}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600" />
        <div className="flex-1">
          <p className="font-medium text-sm" style={{ color: colors.white }}>Tanzir Rahman</p>
          <p className="text-xs" style={{ color: `${colors.white}80` }}>View profile</p>
        </div>
        <MoreHorizontal className="w-5 h-5" style={{ color: `${colors.white}80` }} />
      </div>
    </div>
  )
}

// Header Component
function Header() {
  return (
    <header
      className="flex items-center justify-between px-6 py-5"
      style={{ borderBottom: `1px solid ${colors.gray['05']}` }}
    >
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-bold" style={{ color: colors.black }}>Hello Tanzir</h1>
        <div className="flex items-center gap-1" style={{ color: colors.gray['03'] }}>
          <ChevronRight className="w-5 h-5" />
          <ChevronRight className="w-5 h-5 -ml-3" />
          <span className="text-sm">May 19, 2023</span>
        </div>
      </div>
      <div className="flex items-center gap-10">
        <Bell className="w-6 h-6" style={{ color: colors.black }} />
        <div
          className="flex items-center gap-4 rounded-xl px-8 py-3"
          style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-search'] }}
        >
          <span style={{ color: colors.gray['03'] }}>Search here</span>
          <Search className="w-6 h-6" style={{ color: colors.gray['03'] }} />
        </div>
      </div>
    </header>
  )
}

// Total Balance Card
function TotalBalanceCard() {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[22px]" style={{ color: colors.gray['02'] }}>Total Balance</h3>
      <div className="rounded-lg p-6" style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-01'] }}>
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${colors.gray['06']}` }}>
          <span className="text-[22px] font-extrabold" style={{ color: colors.black }}>$240,399</span>
          <span className="text-sm font-medium" style={{ color: colors.secondary }}>All Accounts</span>
        </div>

        <div className="rounded p-4 mt-3 flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
          <div>
            <p className="text-sm" style={{ color: `${colors.white}b3` }}>Account type</p>
            <p className="font-bold" style={{ color: colors.white }}>Credit Card</p>
            <p className="text-sm" style={{ color: `${colors.white}b3` }}>**** **** **** 2598</p>
          </div>
          <div className="text-right">
            <div className="flex justify-end mb-3">
              <div className="w-12 h-7 bg-gradient-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-red-500 opacity-80" />
                <div className="w-4 h-4 rounded-full bg-yellow-500 opacity-80 -ml-2" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold" style={{ color: colors.white }}>$25000</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.white }}>
                <ArrowUpRight className="w-4 h-4" style={{ color: colors.primary }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <button className="flex items-center gap-1" style={{ color: colors.gray['04'] }}>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Previous</span>
          </button>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.gray['04'] }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.gray['04'] }} />
          </div>
          <button className="flex items-center gap-1" style={{ color: colors.black }}>
            <span className="text-sm font-medium">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Goals Card
function GoalsCard() {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[22px]" style={{ color: colors.gray['02'] }}>Goals</h3>
      <div className="rounded-lg p-6" style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-01'] }}>
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${colors.gray['06']}` }}>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-extrabold" style={{ color: colors.black }}>$20,000</span>
            <button className="p-2 rounded" style={{ backgroundColor: colors.special.bg }}>
              <Edit className="w-4 h-4" style={{ color: colors.secondary }} />
            </button>
          </div>
          <span className="text-sm font-medium" style={{ color: colors.secondary }}>May, 2023</span>
        </div>

        <div className="flex gap-4 mt-5">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-1">
              <Award className="w-6 h-6" style={{ color: colors.secondary }} />
              <div>
                <p className="text-xs" style={{ color: colors.gray['02'] }}>Target Achieved</p>
                <p className="font-bold" style={{ color: colors.black }}>$12,500</p>
              </div>
            </div>
            <div className="flex items-start gap-1">
              <Target className="w-6 h-6" style={{ color: colors.secondary }} />
              <div>
                <p className="text-xs" style={{ color: colors.gray['02'] }}>This month Target</p>
                <p className="font-bold" style={{ color: colors.black }}>$20,000</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            {/* Gauge meter */}
            <div className="relative w-32 h-16 overflow-hidden">
              <div className="absolute inset-0 border-[12px] rounded-t-full" style={{ borderColor: colors.gray['05'] }} />
              <div
                className="absolute inset-0 border-[12px] rounded-t-full"
                style={{ borderColor: colors.primary, clipPath: 'polygon(0 0, 62.5% 0, 62.5% 100%, 0 100%)' }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full shadow flex items-center justify-center" style={{ backgroundColor: colors.white }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
              </div>
            </div>
            <div className="flex items-center justify-between w-36 text-xs mt-1">
              <span style={{ color: colors.gray['04'] }}>$0</span>
              <span className="font-semibold" style={{ color: colors.black }}>12K</span>
              <span style={{ color: colors.gray['04'] }}>$20k</span>
            </div>
            <p className="text-xs font-medium mt-3" style={{ color: colors.black }}>Target vs Achievement</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Upcoming Bill Card
function UpcomingBillCard() {
  const bills = [
    { month: 'May', day: '15', name: 'Figma - Monthly', lastCharge: 'Last Charge - 14 May, 2022', amount: '$150', logo: 'figma' },
    { month: 'Jun', day: '16', name: 'Adobe - Yearly', lastCharge: 'Last Charge - 17 Jun, 2023', amount: '$559', logo: 'adobe' },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[22px]" style={{ color: colors.gray['02'] }}>Upcoming Bill</h3>
        <button className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.gray['02'] }}>
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="rounded-lg p-6" style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-01'] }}>
        {bills.map((bill, index) => (
          <div
            key={bill.name}
            className="flex items-center justify-between py-5"
            style={{ borderBottom: index < bills.length - 1 ? `1px solid ${colors.gray['06']}` : 'none' }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 text-center" style={{ backgroundColor: colors.special.bg }}>
                <p className="text-xs font-medium" style={{ color: colors.gray['01'] }}>{bill.month}</p>
                <p className="text-[22px] font-extrabold" style={{ color: colors.black }}>{bill.day}</p>
              </div>
              <div>
                <div className="h-4 flex items-center mb-1">
                  {bill.logo === 'figma' && (
                    <span className="text-sm font-bold" style={{ color: colors.black }}>Figma</span>
                  )}
                  {bill.logo === 'adobe' && (
                    <span className="text-sm font-bold" style={{ color: colors.special.red }}>Adobe</span>
                  )}
                </div>
                <p className="font-bold" style={{ color: colors.secondary }}>{bill.name}</p>
                <p className="text-xs" style={{ color: colors.gray['03'] }}>{bill.lastCharge}</p>
              </div>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ border: `1px solid ${colors.gray['05']}` }}>
              <span className="font-bold" style={{ color: colors.secondary }}>{bill.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Recent Transaction Component
function RecentTransactions() {
  const transactions = [
    { icon: Gamepad2, name: 'GTR 5', category: 'Gadget & Gear', amount: '$160.00', date: '17 May 2023' },
    { icon: ShoppingBag, name: 'Polo Shirt', category: 'XL fashions', amount: '$20.00', date: '17 May 2023' },
    { icon: UtensilsCrossed, name: 'Biriyani', category: 'Hajir Biriyani', amount: '$10.00', date: '17 May 2023' },
    { icon: Car, name: 'Taxi Fare', category: 'Uber', amount: '$12.00', date: '17 May 2023' },
    { icon: ShoppingBag, name: 'Keyboard', category: 'Gadget & Gear', amount: '$22.00', date: '17 May 2023' },
  ]

  const [activeTab, setActiveTab] = useState('All')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[22px]" style={{ color: colors.gray['02'] }}>Recent Transaction</h3>
        <button className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.gray['02'] }}>
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="rounded-lg px-6 pt-4 pb-8" style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-01'] }}>
        <div className="flex gap-5 mb-3">
          {['All', 'Revenue', 'Expenses'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-2 py-2 font-bold capitalize"
              style={{
                color: activeTab === tab ? colors.primary : colors.secondary,
                borderBottom: activeTab === tab ? `2px solid ${colors.primary}` : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div>
          {transactions.map((tx, index) => (
            <div
              key={tx.name + index}
              className="flex items-center justify-between py-6"
              style={{ borderBottom: index < transactions.length - 1 ? `1px solid ${colors.gray['06']}` : 'none' }}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: colors.special.bg }}>
                  <tx.icon className="w-6 h-6" style={{ color: colors.gray['01'] }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: colors.black }}>{tx.name}</p>
                  <p className="text-xs" style={{ color: colors.gray['03'] }}>{tx.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold" style={{ color: colors.secondary }}>{tx.amount}</p>
                <p className="text-xs" style={{ color: colors.gray['03'] }}>{tx.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Statistics Chart
function StatisticsChart() {
  const days = ['17 Sun', '18 Mon', '19 Tue', '20 Wed', '21 Thu', '22 Fri', '23 Sat']
  const thisWeekData = [137, 92, 64, 114, 113, 131, 110]
  const lastWeekData = [107, 81, 107, 107, 90, 53, 87]
  const maxValue = 150

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[22px]" style={{ color: colors.gray['02'] }}>Statistics</h3>
      <div className="rounded-lg p-6" style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-01'] }}>
        <div className="flex items-center justify-between mb-4">
          <button className="flex items-center gap-3 font-semibold" style={{ color: colors.black }}>
            Weekly Comparison
            <ChevronDown className="w-6 h-6" style={{ color: colors.secondary }} />
          </button>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: colors.primary }} />
              <span className="text-xs font-medium" style={{ color: colors.secondary }}>This week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: colors.gray['05'] }} />
              <span className="text-xs font-medium" style={{ color: colors.secondary }}>Last week</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between text-right text-sm py-2 w-12" style={{ color: colors.gray['03'] }}>
            <span>$250k</span>
            <span>$50k</span>
            <span>$10k</span>
            <span>$2k</span>
            <span>$0</span>
          </div>

          {/* Chart */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ borderTop: `1px solid ${colors.gray['06']}` }} />
              ))}
            </div>

            {/* Bars */}
            <div className="relative h-[164px] flex items-end justify-between px-4">
              {days.map((day, index) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <div className="flex gap-2 items-end">
                    <div
                      className="w-4 rounded-t"
                      style={{ backgroundColor: colors.gray['05'], height: `${(lastWeekData[index] / maxValue) * 137}px` }}
                    />
                    <div
                      className="w-4 rounded-t"
                      style={{ backgroundColor: colors.primary, height: `${(thisWeekData[index] / maxValue) * 137}px` }}
                    />
                  </div>
                  <span className="text-sm" style={{ color: colors.gray['03'] }}>{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Expenses Breakdown
function ExpensesBreakdown() {
  const expenses = [
    { icon: Home, name: 'Housing', amount: '$250.00', change: '15%', up: true },
    { icon: UtensilsCrossed, name: 'Food', amount: '$350.00', change: '08%', up: false },
    { icon: Car, name: 'Transportation', amount: '$50.00', change: '12%', up: false },
    { icon: Film, name: 'Entertainment', amount: '$80.00', change: '15%', up: false },
    { icon: ShoppingBag, name: 'Shopping', amount: '$420.00', change: '25%', up: true },
    { icon: MoreHorizontal, name: 'Others', amount: '$650.00', change: '23%', up: true },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[22px]" style={{ color: colors.gray['02'] }}>Expenses Breakdown</h3>
        <span className="text-xs font-medium" style={{ color: colors.gray['03'] }}>*Compare to last month</span>
      </div>
      <div className="rounded-lg p-6" style={{ backgroundColor: colors.white, boxShadow: shadows['shadow-01'] }}>
        <div className="grid grid-cols-3 gap-x-10 gap-y-6">
          {expenses.map((expense, index) => (
            <div
              key={expense.name}
              className="flex items-center gap-4 p-4"
              style={{ borderBottom: index < 3 ? `1px solid ${colors.gray['06']}` : 'none' }}
            >
              <div className="p-2 rounded-lg h-14 flex items-center justify-center" style={{ backgroundColor: colors.special.bg }}>
                <expense.icon className="w-6 h-6" style={{ color: colors.gray['02'] }} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: colors.gray['02'] }}>{expense.name}</p>
                <p className="font-bold" style={{ color: colors.black }}>{expense.amount}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: colors.gray['03'] }}>{expense.change}*</span>
                  {expense.up ? (
                    <ArrowUp className="w-4 h-4" style={{ color: colors.special.red }} />
                  ) : (
                    <ArrowDown className="w-4 h-4" style={{ color: colors.special.green }} />
                  )}
                </div>
              </div>
              <ChevronRight className="w-6 h-6 opacity-50" style={{ color: colors.gray['03'] }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export default function FinebankDemoPage() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.special.mainBg }}>
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {/* Top row - 3 cards */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <TotalBalanceCard />
            <GoalsCard />
            <UpcomingBillCard />
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-[352px_1fr] gap-6">
            {/* Left column - Transactions */}
            <RecentTransactions />

            {/* Right column - Statistics & Expenses */}
            <div className="flex flex-col gap-6">
              <StatisticsChart />
              <ExpensesBreakdown />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
