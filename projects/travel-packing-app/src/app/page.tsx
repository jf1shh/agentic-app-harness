'use client';

import { useState, useEffect } from 'react';
import WardrobeAnalyzer from '../components/WardrobeAnalyzer';
import { Garment, DayItinerary, WearabilityReport } from '../types';
import { analyzeWardrobe } from '../utils/wardrobeEngine';
import { geocodeLocation, fetchWeather, transformWeatherToItinerary } from '../services/weatherApi';
import { calculateKnapsackPhysics, PackingPhysicsReport } from '../utils/knapsackEngine';
import { MODELS, SuitcaseModel } from '../utils/suitcaseDatabase';
import { AIRLINES } from '../utils/airlineBaggage';
import { generateWardrobeFromArchetype } from '../utils/generator';
import { parseClosetFile } from '../utils/fileImporter';
import { buildShareUrl, parseShareFromHash } from '../utils/share';
import { resolveActivity } from '../utils/activity';
import { tripDurationFromDates } from '../utils/tripDuration';
import DailyActivityPicker from '../components/DailyActivityPicker';
import WardrobeManager from '../components/WardrobeManager';
import SuitcaseFinder from '../components/SuitcaseFinder';

// Model names alone collide across brands (e.g. Away, Arlo Skye and Roam all
// sell "The Carry-On"), so selection is keyed by brand+model together.
const suitcaseKey = (m: SuitcaseModel) => `${m.brand} — ${m.model}`;



export default function Home() {
  const [destination, setDestination] = useState('Hawaii');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-05');
  const [report, setReport] = useState<WearabilityReport | null>(null);
  const [physics, setPhysics] = useState<PackingPhysicsReport | null>(null);
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSuitcase, setSelectedSuitcase] = useState(suitcaseKey(MODELS[0]));
  const [selectedAirline, setSelectedAirline] = useState('EK'); // Emirates
  
  const [archetype, setArchetype] = useState('quiet-luxury');
  const [strategy, setStrategy] = useState('standard');
  const [activity, setActivity] = useState('sightseeing');
  const [dailyActivities, setDailyActivities] = useState<(string | null)[]>([]);
  const [activeGarments, setActiveGarments] = useState<Garment[]>([]);

  const [closetSource, setClosetSource] = useState<'archetype' | 'custom'>('archetype');
  const [customGarments, setCustomGarments] = useState<Garment[]>([]);
  const [customFileName, setCustomFileName] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [closetManagerOpen, setClosetManagerOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const savedTheme = localStorage.getItem('packright_theme') as 'light' | 'dark' | null;
      if (savedTheme) return savedTheme;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      // Ignore fallback
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('packright_theme', nextTheme);
    } catch {
      // Ignore fallback
    }
  };

  // Fragment-only navigation (opening/pasting a #share=... link while the
  // app is already open in a tab) is a same-document navigation in every
  // browser -- no reload, no remount -- so a mount-only effect would never
  // see it. Checking on mount AND on 'hashchange' covers both a fresh load
  // and a link opened into an already-running tab.
  useEffect(() => {
    const applyShareFromHash = () => {
      const shared = parseShareFromHash(window.location.hash);
      if (!shared) return;
      setDestination(shared.destination);
      setStartDate(shared.startDate);
      setEndDate(shared.endDate);
      setArchetype(shared.archetype);
      setStrategy(shared.strategy);
      setActivity(shared.activity);
      setClosetSource(shared.closetSource);
      if (shared.customGarments) setCustomGarments(shared.customGarments);
      setSelectedSuitcase(shared.selectedSuitcase);
      setSelectedAirline(shared.selectedAirline);
    };
    applyShareFromHash();
    window.addEventListener('hashchange', applyShareFromHash);
    return () => window.removeEventListener('hashchange', applyShareFromHash);
  }, []);

  const handleShare = async () => {
    const url = buildShareUrl(
      {
        destination, startDate, endDate, archetype, strategy, activity,
        closetSource, customGarments: closetSource === 'custom' ? customGarments : undefined,
        selectedSuitcase, selectedAirline,
      },
      window.location.href
    );
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) -- fall back to
      // updating the URL bar itself so the link is still copyable manually.
      window.location.hash = url.slice(url.indexOf('#') + 1);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseClosetFile(text);
        setCustomGarments(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const geo = await geocodeLocation(destination);
      const weather = await fetchWeather(geo.latitude, geo.longitude, startDate, endDate);
      const resolvedDailyActivities = dailyActivities.map((a) => resolveActivity(a, destination));
      const generatedItinerary = transformWeatherToItinerary(weather, activity, resolvedDailyActivities);
      
      setItinerary(generatedItinerary);

      const tripDuration = generatedItinerary.length;
      
      const garmentsToUse = closetSource === 'custom' && customGarments.length > 0
        ? customGarments
        : generateWardrobeFromArchetype(archetype, strategy, tripDuration);

      setActiveGarments(garmentsToUse);

      const result = analyzeWardrobe(garmentsToUse, generatedItinerary);
      setReport(result);

      // Run Knapsack Physics
      const suitcase = MODELS.find(m => suitcaseKey(m) === selectedSuitcase) || MODELS[0];
      const physicsResult = calculateKnapsackPhysics(result, garmentsToUse, suitcase, selectedAirline);
      setPhysics(physicsResult);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to analyze trip');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header no-print" style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        <button
          onClick={toggleTheme}
          className="btn-secondary theme-toggle-btn"
          style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.9rem', padding: '6px 12px' }}
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
        <button
          onClick={handleShare}
          className="btn-secondary"
          style={{ position: 'absolute', left: 0, top: 0, fontSize: '0.9rem', padding: '6px 12px' }}
        >
          {shareCopied ? '✔ Copied!' : '🔗 Share Trip'}
        </button>
        <h1 suppressHydrationWarning style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--primary)' }}>PackRight V4</h1>
        <p suppressHydrationWarning style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Live Weather & Intelligent Wardrobe Analyzer</p>
      </header>

      <div className="glass-panel no-print" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Trip Details</h2>
        
        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label htmlFor="dest" className="label">Destination</label>
            <input id="dest" className="input-field" value={destination} onChange={e => setDestination(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="start" className="label">Start Date</label>
              <input id="start" type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="end" className="label">End Date</label>
              <input id="end" type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <DailyActivityPicker
            duration={tripDurationFromDates(startDate, endDate)}
            destination={destination}
            dailyActivities={dailyActivities}
            setDailyActivities={setDailyActivities}
          />

          <div style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
            <label className="label">Wardrobe Source</label>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="radio" 
                  name="closetSource" 
                  checked={closetSource === 'archetype'} 
                  onChange={() => setClosetSource('archetype')} 
                />
                Style Archetype Preset
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="radio" 
                  name="closetSource" 
                  checked={closetSource === 'custom'} 
                  onChange={() => setClosetSource('custom')} 
                />
                Upload Custom Closet (.txt / .md)
              </label>
            </div>

            {closetSource === 'archetype' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
                <div>
                  <label htmlFor="archetype" className="label">Fashion Archetype</label>
                  <select id="archetype" className="input-field" value={archetype} onChange={e => setArchetype(e.target.value)}>
                    <option value="quiet-luxury">Quiet Luxury</option>
                    <option value="gorpcore">Gorpcore</option>
                    <option value="scandi">Scandi Minimalist</option>
                    <option value="streetwear">Y2K Streetwear</option>
                    <option value="dark-academia">Dark Academia</option>
                    <option value="athleisure">Athleisure</option>
                    <option value="bohemian">Bohemian / Resort</option>
                    <option value="preppy">Ivy League Prep</option>
                    <option value="rock">Rock Chic</option>
                    <option value="whimsigoth">Whimsigoth</option>
                    <option value="coastal">Coastal Maritime</option>
                    <option value="cottagecore">Cottagecore</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="strategy" className="label">Packing Strategy</label>
                  <select id="strategy" className="input-field" value={strategy} onChange={e => setStrategy(e.target.value)}>
                    <option value="standard">Standard (Comfortable)</option>
                    <option value="flexible">Flexible & Efficient</option>
                    <option value="minimalist">Extreme Minimalist</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="activity" className="label">Default Activity</label>
                  <select id="activity" className="input-field" value={activity} onChange={e => setActivity(e.target.value)}>
                    <option value="sightseeing">📸 Sightseeing</option>
                    <option value="transit">✈️ Transit Day</option>
                    <option value="formal">🍷 Formal / Night Out</option>
                    <option value="casual">🚶 Casual</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="closet-upload" className="label">Upload Wardrobe File (.txt or .md)</label>
                <input
                  id="closet-upload"
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                />
                {customGarments.length > 0 && customFileName && (
                  <p style={{ marginTop: '8px', color: '#22c55e', fontSize: '0.9rem' }}>
                    ✔ Loaded {customGarments.length} garments from {customFileName}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: '12px' }}
                  onClick={() => setClosetManagerOpen(true)}
                >
                  📸 Manage Digital Closet {customGarments.length > 0 ? `(${customGarments.length} items)` : ''}
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
            <div>
              <SuitcaseFinder onSelect={(m) => setSelectedSuitcase(suitcaseKey(m))} />
              <label htmlFor="suitcase" className="label" style={{ marginTop: '12px', display: 'block' }}>Suitcase</label>
              <select id="suitcase" className="input-field" value={selectedSuitcase} onChange={e => setSelectedSuitcase(e.target.value)}>
                {MODELS.map(m => (
                  <option key={suitcaseKey(m)} value={suitcaseKey(m)}>{m.brand} - {m.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="airline" className="label">Airline (Carry-on Limits)</label>
              <select id="airline" className="input-field" value={selectedAirline} onChange={e => setSelectedAirline(e.target.value)}>
                {AIRLINES.map(a => (
                  <option key={a.code} value={a.code}>{a.name} ({a.carryOn.weight}kg)</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={handleAnalyze} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Fetching Weather & Analyzing...' : 'Analyze Wardrobe & Schedule Outfits'}
        </button>
      </div>

      {report && physics && (
        <>
          <div className="glass-panel no-print" style={{ padding: '24px', marginTop: '32px' }}>
            <h2>Knapsack Engine: Luggage Physics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '16px', border: `2px solid ${physics.fitsInSuitcase ? 'var(--primary)' : 'red'}`, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>Volume & Weight</h3>
                <p><strong>Weight:</strong> {physics.totalWeightKg.toFixed(2)}kg / {physics.weightLimitKg}kg Limit</p>
                <p><strong>Volume:</strong> {physics.totalVolumeLiters.toFixed(2)}L / {physics.suitcaseCapacityLiters.toFixed(2)}L</p>
                <div style={{ width: '100%', backgroundColor: '#334155', height: '12px', borderRadius: '6px', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(physics.volumeUsedPercent, 100)}%`, backgroundColor: physics.volumeUsedPercent > 100 ? 'red' : 'var(--primary)', height: '100%' }}></div>
                </div>
                <p style={{ marginTop: '4px', fontSize: '0.9rem', color: '#94a3b8' }}>{physics.volumeUsedPercent.toFixed(1)}% Full</p>
              </div>
              <div style={{ padding: '16px', border: `2px solid ${physics.airlineCompliant ? 'var(--primary)' : 'orange'}`, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>Airline Compliance</h3>
                {physics.airlineWarnings.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', color: 'orange' }}>
                    {physics.airlineWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--primary)' }}>✔ Compliant with {selectedAirline} carry-on limits</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel no-print" style={{ padding: '24px', marginTop: '32px' }}>
            <h2>Live Itinerary ({destination})</h2>
            <ul style={{ margin: '16px 0', paddingLeft: '24px' }}>
              {itinerary.map(day => (
                <li key={day.dayNumber} style={{ marginBottom: '8px' }}>
                  <strong>Day {day.dayNumber}:</strong> {day.maxTempC !== undefined ? `${day.maxTempC}°C` : 'N/A'} (Warmth Target: {day.weatherWarmthTarget}/10)
                </li>
              ))}
            </ul>
          </div>
          <WardrobeAnalyzer report={report} garments={activeGarments} />
        </>
      )}

      <WardrobeManager
        isOpen={closetManagerOpen}
        onClose={() => setClosetManagerOpen(false)}
        garments={customGarments}
        setGarments={setCustomGarments}
      />
    </main>
  );
}
