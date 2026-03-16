import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Send, Clock, CheckSquare, FileText, Monitor, Terminal, Volume2, Zap } from 'lucide-react';
import { useSpeech, useVoices, speak, unlockAudio } from './hooks/useSpeech';
import { sendCommandToVyom } from './services/geminiService';
import { VyomOrb } from './components/VyomOrb';

interface Log {
  role: 'user' | 'vyom';
  text: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface Note {
  id: string;
  content: string;
  timestamp: number;
}

export default function App() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Settings
  const voices = useVoices();
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  
  // State for widgets
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [systemStatus, setSystemStatus] = useState({ cpu: 12, ram: 45, battery: 100 });
  const [currentTime, setCurrentTime] = useState(new Date());

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Battery API
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setSystemStatus(prev => ({ ...prev, battery: Math.round(battery.level * 100) }));
        battery.addEventListener('levelchange', () => {
          setSystemStatus(prev => ({ ...prev, battery: Math.round(battery.level * 100) }));
        });
      });
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleToolCall = async (name: string, args: any) => {
    console.log(`Executing tool: ${name}`, args);
    switch (name) {
      case 'openWebsite':
        window.open(args.url, '_blank');
        return `Opened ${args.url}`;
      case 'addTodo':
        setTodos(prev => [...prev, { id: Date.now().toString(), text: args.task, completed: false }]);
        return `Added "${args.task}" to your to-do list.`;
      case 'takeNote':
        setNotes(prev => [...prev, { id: Date.now().toString(), content: args.content, timestamp: Date.now() }]);
        return `Note saved successfully.`;
      case 'simulateDesktopAction':
        return `Simulated desktop action: ${args.action}. (Note: As a web app, I cannot directly control your local OS, but I have simulated the action.)`;
      case 'setReminder':
        setTimeout(() => {
          speak(`Reminder: ${args.message}`, selectedVoiceURI);
          alert(`Reminder: ${args.message}`);
        }, args.timeInSeconds * 1000);
        return `Reminder set for ${args.timeInSeconds} seconds from now.`;
      case 'getSystemInfo':
        return `System Info: CPU ${systemStatus.cpu}% (Mocked), RAM ${systemStatus.ram}% (Mocked), Battery ${systemStatus.battery}% (Actual).`;
      case 'getWeather':
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!apiKey) return "OpenWeather API key is missing. Please add VITE_OPENWEATHER_API_KEY to your environment variables.";
        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${args.city}&appid=${apiKey}&units=metric`);
          const data = await res.json();
          if (data.cod !== 200) return `Error: ${data.message}`;
          return `The weather in ${args.city} is ${data.weather[0].description} with a temperature of ${data.main.temp}°C.`;
        } catch (e) {
          return "Failed to fetch weather data.";
        }
      case 'sendWhatsApp':
        const waUrl = `whatsapp://send?phone=${args.number.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(args.message)}`;
        window.location.href = waUrl;
        return `Opened WhatsApp app to send message to ${args.number}.`;
      case 'createCalendarEvent':
        const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(args.title)}&details=${encodeURIComponent(args.details)}&dates=${args.date}/${args.date}`;
        window.open(calUrl, '_blank');
        return `Opened Google Calendar to create event: ${args.title}.`;
      case 'simulateMouseKeyboard':
        return "As a web application, I cannot control your local mouse or keyboard due to browser security sandboxing.";
      default:
        return `Tool ${name} not recognized.`;
    }
  };

  const processCommand = async (text: string) => {
    if (!text.trim()) return;
    
    setLogs(prev => [...prev, { role: 'user', text }]);
    setIsProcessing(true);
    
    try {
      const response = await sendCommandToVyom(text, handleToolCall);
      setLogs(prev => [...prev, { role: 'vyom', text: response }]);
      speak(response, selectedVoiceURI);
    } catch (error) {
      console.error(error);
      setLogs(prev => [...prev, { role: 'vyom', text: "Error processing request." }]);
      speak("Error processing request.", selectedVoiceURI);
    } finally {
      setIsProcessing(false);
    }
  };

  const { isListening, transcript, startListening, stopListening } = useSpeech((text, isFinal) => {
    if (isFinal && text) {
      processCommand(text);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudio();
    processCommand(inputText);
    setInputText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-cyan-50 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* Left Panel: Chat Logs & Settings */}
      <div className="w-full md:w-1/3 border-r border-cyan-900/30 flex flex-col h-[50vh] md:h-screen bg-neutral-900/50 backdrop-blur-sm">
        <div className="p-4 border-b border-cyan-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold tracking-wide text-cyan-100 uppercase">Command Log</h2>
          </div>
          
          {/* Voice Settings Dropdown */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-600" />
            <select 
              className="bg-neutral-950 border border-cyan-900/50 rounded px-2 py-1 text-xs text-cyan-300 focus:outline-none max-w-[120px]"
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
            >
              <option value="">Default Voice</option>
              {voices.map((v, i) => (
                <option key={i} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-center text-cyan-700/50 mt-10 text-sm">
              Awaiting commands... Say "Hey Vyom" or type below.
            </div>
          ) : (
            logs.map((log, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  log.role === 'user' 
                    ? 'bg-cyan-900/40 text-cyan-100 rounded-tr-sm border border-cyan-800/30' 
                    : 'bg-neutral-800/80 text-neutral-300 rounded-tl-sm border border-neutral-700/50'
                }`}>
                  {log.text}
                </div>
              </motion.div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-cyan-900/30 bg-neutral-900/80">
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-neutral-950 border border-cyan-900/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button 
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="p-2 rounded-full bg-cyan-900/50 text-cyan-400 hover:bg-cyan-800/50 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          <div className="mt-4 flex items-center justify-end">
            {/* Manual Mic Toggle */}
            <button 
              onClick={() => {
                unlockAudio();
                isListening ? stopListening() : startListening();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium ${
                isListening 
                  ? 'bg-red-900/20 border-red-500/50 text-red-400 animate-pulse' 
                  : 'bg-cyan-900/20 border-cyan-800/50 text-cyan-500 hover:bg-cyan-900/40'
              }`}
            >
              {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              {isListening ? 'Listening...' : 'Enable Mic'}
            </button>
          </div>
          <div className="mt-2 text-[10px] text-cyan-700/70 h-3 text-center">
            {transcript && `Heard: ${transcript}`}
          </div>
        </div>
      </div>

      {/* Center Panel: Vyom Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-8 h-[50vh] md:h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black">
        <div className="absolute top-8 left-8 text-cyan-500/30 font-mono text-xs tracking-widest uppercase">
          Vyom Core v2.5.0
        </div>
        
        <VyomOrb isListening={isListening} isProcessing={isProcessing} />
        
        <div className="mt-12 text-center">
          <h1 className="text-4xl font-light tracking-widest text-cyan-50 mb-2">VYOM</h1>
          <p className="text-cyan-600/60 text-sm uppercase tracking-widest">Personal Assistant</p>
        </div>
      </div>

      {/* Right Panel: Widgets */}
      <div className="w-full md:w-1/4 border-l border-cyan-900/30 bg-neutral-900/30 backdrop-blur-sm p-6 space-y-8 overflow-y-auto h-screen custom-scrollbar hidden md:block">
        
        {/* Clock Widget */}
        <div className="bg-neutral-950/50 border border-cyan-900/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-cyan-500 mb-3">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">System Time</span>
          </div>
          <div className="text-3xl font-light text-cyan-50 tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm text-cyan-700 mt-1">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* System Status Widget */}
        <div className="bg-neutral-950/50 border border-cyan-900/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-cyan-500 mb-4">
            <Monitor className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">System Status</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-cyan-600 mb-1">
                <span>CPU Usage (Mocked)</span>
                <span>{systemStatus.cpu}%</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${systemStatus.cpu}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cyan-600 mb-1">
                <span>Memory (Mocked)</span>
                <span>{systemStatus.ram}%</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${systemStatus.ram}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cyan-600 mb-1">
                <span>Battery (Actual)</span>
                <span>{systemStatus.battery}%</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${systemStatus.battery}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Widget */}
        <div className="bg-neutral-950/50 border border-cyan-900/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-cyan-500 mb-4">
            <CheckSquare className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Active Tasks</span>
          </div>
          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-xs text-cyan-800 italic">No active tasks.</div>
            ) : (
              todos.map(todo => (
                <div key={todo.id} className="flex items-start gap-3 group cursor-pointer" onClick={() => toggleTodo(todo.id)}>
                  <div className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                    todo.completed ? 'bg-cyan-500 border-cyan-500' : 'border-cyan-700 group-hover:border-cyan-500'
                  }`}>
                    {todo.completed && <CheckSquare className="w-3 h-3 text-neutral-950" />}
                  </div>
                  <span className={`text-sm ${todo.completed ? 'text-cyan-800 line-through' : 'text-cyan-100'}`}>
                    {todo.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes Widget */}
        <div className="bg-neutral-950/50 border border-cyan-900/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-cyan-500 mb-4">
            <FileText className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Recent Notes</span>
          </div>
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-xs text-cyan-800 italic">No saved notes.</div>
            ) : (
              notes.slice(-3).reverse().map(note => (
                <div key={note.id} className="bg-neutral-900/50 p-3 rounded-xl border border-cyan-900/20">
                  <p className="text-sm text-cyan-100 line-clamp-2">{note.content}</p>
                  <span className="text-[10px] text-cyan-700 mt-2 block">
                    {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
