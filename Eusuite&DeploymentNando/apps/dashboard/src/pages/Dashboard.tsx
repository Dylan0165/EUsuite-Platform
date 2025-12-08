import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../components/DashboardCard';
import { 
  Cloud, Type, User, Settings, Calendar, Clock, Plus, 
  FolderOpen, Bell, TrendingUp, Mail, Users,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { EUCLOUD_URL, EUTYPE_URL, EUMAIL_URL, EUMAIL_API_URL, EUGROUPS_URL } from '../config/constants';

// Suppress unused import warning
void EUMAIL_API_URL;

// Event type for calendar
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  color: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('eusuite-events');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', color: 'emerald' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [unreadMailCount, setUnreadMailCount] = useState(0);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem('eusuite-events', JSON.stringify(events));
  }, [events]);

  // Fetch unread mail count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`${EUMAIL_API_URL}/api/mail/unread-count`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadMailCount(data.count);
        }
      } catch (error) {
        console.log('Could not fetch mail count');
      }
    };
    
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const apps = [
    {
      title: 'EUType',
      description: 'Maak en bewerk documenten',
      icon: Type,
      color: 'rose',
      onClick: () => window.location.href = EUTYPE_URL,
    },
    {
      title: 'EUCloud',
      description: 'Cloud opslag & bestanden',
      icon: Cloud,
      color: 'blue',
      onClick: () => window.location.href = EUCLOUD_URL,
    },
    {
      title: 'EUMail',
      description: 'Interne berichten',
      icon: Mail,
      color: 'purple',
      onClick: () => window.location.href = EUMAIL_URL,
      badge: unreadMailCount > 0 ? unreadMailCount : undefined,
    },
    {
      title: 'EUGroups',
      description: 'Teams & samenwerking',
      icon: Users,
      color: 'cyan',
      onClick: () => window.location.href = EUGROUPS_URL,
    },
    {
      title: 'Profiel',
      description: 'Account instellingen',
      icon: User,
      color: 'amber',
      onClick: () => navigate('/profile'),
    },
    {
      title: 'Instellingen',
      description: 'Voorkeuren',
      icon: Settings,
      color: 'emerald',
      onClick: () => navigate('/settings'),
    },
  ];

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (dateKey: string) => {
    return events.filter(e => e.date === dateKey);
  };

  const handleAddEvent = () => {
    if (newEvent.title && newEvent.date) {
      setEvents([...events, { ...newEvent, id: Date.now().toString() }]);
      setNewEvent({ title: '', date: '', time: '', color: 'emerald' });
      setShowAddEvent(false);
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                      'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const todaysEvents = getEventsForDate(todayKey);
  const upcomingEvents = events
    .filter(e => e.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Real stats based on actual data
  const stats = [
    { label: 'Apps', value: '5', icon: FolderOpen, color: 'text-emerald-500' },
    { label: 'Events', value: String(events.length), icon: Calendar, color: 'text-amber-500' },
    { label: 'Vandaag', value: String(todaysEvents.length), icon: Clock, color: 'text-blue-500' },
    { label: 'Komend', value: String(upcomingEvents.length), icon: Bell, color: 'text-rose-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800">
      <div className="px-4 lg:px-6 py-6">
        
        {/* Top Section: Welcome + Clock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Welcome Card */}
          <div className="lg:col-span-2 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-200 text-sm font-medium mb-1">
                  {currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h1 className="text-3xl font-bold mb-2">Welkom terug!</h1>
                <p className="text-emerald-100 text-lg">Wat ga je vandaag doen?</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold tabular-nums">
                  {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-emerald-200 text-lg">
                  {currentTime.toLocaleTimeString('nl-NL', { second: '2-digit' }).split(':').pop()}s
                </div>
              </div>
            </div>
            
            {/* Today's Events Preview */}
            {todaysEvents.length > 0 && (
              <div className="mt-6 pt-6 border-t border-emerald-500/30">
                <p className="text-emerald-200 text-sm mb-3 flex items-center gap-2">
                  <Calendar size={16} /> Vandaag op de planning:
                </p>
                <div className="flex flex-wrap gap-2">
                  {todaysEvents.map(event => (
                    <span key={event.id} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {event.time && `${event.time} - `}{event.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-lg border border-stone-200 dark:border-stone-700">
            <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" /> Overzicht
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4">
                  <stat.icon size={24} className={stat.color} />
                  <p className="text-2xl font-bold text-stone-800 dark:text-white mt-2">{stat.value}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Apps Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 dark:text-white mb-4">Applicaties</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {apps.map((app) => (
              <DashboardCard
                key={app.title}
                title={app.title}
                description={app.description}
                icon={app.icon}
                color={app.color}
                onClick={app.onClick}
              />
            ))}
          </div>
        </div>

        {/* Calendar + Events Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-lg border border-stone-200 dark:border-stone-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-stone-800 dark:text-white flex items-center gap-2">
                <Calendar size={24} className="text-emerald-500" /> Agenda
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition"
                >
                  <ChevronLeft size={20} className="text-stone-600 dark:text-stone-300" />
                </button>
                <span className="text-stone-800 dark:text-white font-medium min-w-[140px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition"
                >
                  <ChevronRight size={20} className="text-stone-600 dark:text-stone-300" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-stone-500 dark:text-stone-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} />;
                
                const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const dayEvents = getEventsForDate(dateKey);
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateKey === selectedDate ? null : dateKey)}
                    className={`
                      aspect-square rounded-lg p-1 text-sm font-medium transition-all relative
                      ${isToday ? 'bg-emerald-500 text-white' : 'hover:bg-stone-100 dark:hover:bg-stone-700'}
                      ${isSelected && !isToday ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : ''}
                      ${!isToday ? 'text-stone-700 dark:text-stone-300' : ''}
                    `}
                  >
                    {day}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <span 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              e.color === 'emerald' ? 'bg-emerald-400' :
                              e.color === 'amber' ? 'bg-amber-400' :
                              e.color === 'rose' ? 'bg-rose-400' : 'bg-blue-400'
                            }`} 
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
              <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">
                  Events op {new Date(selectedDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}:
                </p>
                {getEventsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).map(event => (
                      <div key={event.id} className="flex items-center justify-between bg-stone-50 dark:bg-stone-700/50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            event.color === 'emerald' ? 'bg-emerald-500' :
                            event.color === 'amber' ? 'bg-amber-500' :
                            event.color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'
                          }`} />
                          <span className="text-stone-800 dark:text-white">{event.title}</span>
                          {event.time && <span className="text-stone-500 text-sm">{event.time}</span>}
                        </div>
                        <button onClick={() => handleDeleteEvent(event.id)} className="text-stone-400 hover:text-rose-500">
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-sm">Geen events</p>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Events + Add Event */}
          <div className="space-y-6">
            {/* Add Event Button */}
            <button
              onClick={() => setShowAddEvent(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 font-semibold"
            >
              <Plus size={20} /> Nieuw Event
            </button>

            {/* Upcoming Events */}
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-lg border border-stone-200 dark:border-stone-700">
              <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-amber-500" /> Aankomende Events
              </h3>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
                      <div className={`w-2 h-full min-h-[40px] rounded-full ${
                        event.color === 'emerald' ? 'bg-emerald-500' :
                        event.color === 'amber' ? 'bg-amber-500' :
                        event.color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-stone-800 dark:text-white">{event.title}</p>
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                          {new Date(event.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {event.time && ` • ${event.time}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 text-sm text-center py-4">Geen aankomende events</p>
              )}
            </div>
          </div>
        </div>

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-semibold text-stone-800 dark:text-white mb-4">Nieuw Event</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Titel</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-800 dark:text-white"
                    placeholder="Event naam..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Datum</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Tijd</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Kleur</label>
                  <div className="flex gap-2">
                    {['emerald', 'amber', 'rose', 'blue'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewEvent({ ...newEvent, color })}
                        className={`w-8 h-8 rounded-full ${
                          color === 'emerald' ? 'bg-emerald-500' :
                          color === 'amber' ? 'bg-amber-500' :
                          color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'
                        } ${newEvent.color === color ? 'ring-2 ring-offset-2 ring-stone-400' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="flex-1 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleAddEvent}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Toevoegen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
