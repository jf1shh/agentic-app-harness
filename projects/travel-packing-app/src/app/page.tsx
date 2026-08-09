'use client';

import { useState, useEffect } from 'react';
import WardrobeAnalyzer from '../components/WardrobeAnalyzer';
import { Garment, DayItinerary, WearabilityReport } from '../types';
import { analyzeWardrobe } from '../utils/wardrobeEngine';
import { geocodeLocation, fetchWeather, transformWeatherToItinerary } from '../services/weatherApi';
import { calculateKnapsackPhysics, PackingPhysicsReport } from '../utils/knapsackEngine';
import { MODELS } from '../utils/suitcaseDatabase';
import { AIRLINES } from '../utils/airlineBaggage';
import { generateWardrobeFromArchetype } from '../utils/generator';
import { parseClosetFile } from '../utils/fileImporter';
import { useT } from '../i18n/context';



export default function Home() {
  const { t, language, setLanguage, languages } = useT();
  const [destination, setDestination] = useState('Hawaii');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-05');
  const [report, setReport] = useState<WearabilityReport | null>(null);
  const [physics, setPhysics] = useState<PackingPhysicsReport | null>(null);
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSuitcase, setSelectedSuitcase] = useState(MODELS[0].model);
  const [selectedAirline, setSelectedAirline] = useState('EK'); // Emirates
  
  const [archetype, setArchetype] = useState('quiet-luxury');
  const [strategy, setStrategy] = useState('standard');
  const [activity, setActivity] = useState('sightseeing');
  const [activeGarments, setActiveGarments] = useState<Garment[]>([]);

  const [closetSource, setClosetSource] = useState<'archetype' | 'custom'>('archetype');
  const [customGarments, setCustomGarments] = useState<Garment[]>([]);
  const [customFileName, setCustomFileName] = useState('');

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
      const generatedItinerary = transformWeatherToItinerary(weather, activity);
      
      setItinerary(generatedItinerary);

      const tripDuration = generatedItinerary.length;
      
      const garmentsToUse = closetSource === 'custom' && customGarments.length > 0
        ? customGarments
        : generateWardrobeFromArchetype(archetype, strategy, tripDuration);

      setActiveGarments(garmentsToUse);

      const result = analyzeWardrobe(garmentsToUse, generatedItinerary);
      setReport(result);

      // Run Knapsack Physics
      const suitcase = MODELS.find(m => m.model === selectedSuitcase) || MODELS[0];
      const physicsResult = calculateKnapsackPhysics(result, garmentsToUse, suitcase, selectedAirline);
      setPhysics(physicsResult);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('trip.failedToAnalyze'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select
            id="language-switcher"
            aria-label={t('language.label')}
            className="btn-secondary theme-toggle-btn"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{ fontSize: '0.9rem', padding: '6px 12px' }}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.nativeName}</option>
            ))}
          </select>
          <button
            onClick={toggleTheme}
            className="btn-secondary theme-toggle-btn"
            style={{ fontSize: '0.9rem', padding: '6px 12px' }}
          >
            {theme === 'light' ? t('theme.dark') : t('theme.light')}
          </button>
        </div>
        <h1 suppressHydrationWarning style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--primary)' }}>{t('app.title')}</h1>
        <p suppressHydrationWarning style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{t('app.subtitle')}</p>
      </header>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>{t('trip.detailsTitle')}</h2>
        
        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label htmlFor="dest" className="label">{t('trip.destination')}</label>
            <input id="dest" className="input-field" value={destination} onChange={e => setDestination(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="start" className="label">{t('trip.startDate')}</label>
              <input id="start" type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="end" className="label">{t('trip.endDate')}</label>
              <input id="end" type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
            <label className="label">{t('trip.wardrobeSource')}</label>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name="closetSource"
                  checked={closetSource === 'archetype'}
                  onChange={() => setClosetSource('archetype')}
                />
                {t('trip.archetypePreset')}
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  name="closetSource"
                  checked={closetSource === 'custom'}
                  onChange={() => setClosetSource('custom')}
                />
                {t('trip.uploadCloset')}
              </label>
            </div>

            {closetSource === 'archetype' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
                <div>
                  <label htmlFor="archetype" className="label">{t('trip.fashionArchetype')}</label>
                  <select id="archetype" className="input-field" value={archetype} onChange={e => setArchetype(e.target.value)}>
                    <option value="quiet-luxury">{t('archetype.quietLuxury')}</option>
                    <option value="gorpcore">{t('archetype.gorpcore')}</option>
                    <option value="scandi">{t('archetype.scandi')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="strategy" className="label">{t('trip.packingStrategy')}</label>
                  <select id="strategy" className="input-field" value={strategy} onChange={e => setStrategy(e.target.value)}>
                    <option value="standard">{t('strategy.standard')}</option>
                    <option value="flexible">{t('strategy.flexible')}</option>
                    <option value="minimalist">{t('strategy.minimalist')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="activity" className="label">{t('trip.defaultActivity')}</label>
                  <select id="activity" className="input-field" value={activity} onChange={e => setActivity(e.target.value)}>
                    <option value="sightseeing">{t('activity.sightseeing')}</option>
                    <option value="transit">{t('activity.transit')}</option>
                    <option value="formal">{t('activity.formal')}</option>
                    <option value="casual">{t('activity.casual')}</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="closet-upload" className="label">{t('trip.uploadWardrobeFile')}</label>
                <input
                  id="closet-upload"
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                />
                {customGarments.length > 0 && (
                  <p style={{ marginTop: '8px', color: '#22c55e', fontSize: '0.9rem' }}>
                    {t('trip.loadedGarments', { count: customGarments.length, file: customFileName })}
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="suitcase" className="label">{t('trip.suitcase')}</label>
              <select id="suitcase" className="input-field" value={selectedSuitcase} onChange={e => setSelectedSuitcase(e.target.value)}>
                {MODELS.map(m => (
                  <option key={m.model} value={m.model}>{m.brand} - {m.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="airline" className="label">{t('trip.airline')}</label>
              <select id="airline" className="input-field" value={selectedAirline} onChange={e => setSelectedAirline(e.target.value)}>
                {AIRLINES.map(a => (
                  <option key={a.code} value={a.code}>{a.name} ({a.carryOn.weight}kg)</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={handleAnalyze} disabled={loading} style={{ width: '100%' }}>
          {loading ? t('trip.analyzing') : t('trip.analyzeButton')}
        </button>
      </div>

      {report && physics && (
        <>
          <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
            <h2>{t('knapsack.title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '16px', border: `2px solid ${physics.fitsInSuitcase ? 'var(--primary)' : 'red'}`, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>{t('knapsack.volumeWeight')}</h3>
                <p>{t('knapsack.weightLine', { weight: physics.totalWeightKg.toFixed(2), limit: physics.weightLimitKg ?? 0 })}</p>
                <p>{t('knapsack.volumeLine', { volume: physics.totalVolumeLiters.toFixed(2), capacity: physics.suitcaseCapacityLiters.toFixed(2) })}</p>
                <div style={{ width: '100%', backgroundColor: '#334155', height: '12px', borderRadius: '6px', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(physics.volumeUsedPercent, 100)}%`, backgroundColor: physics.volumeUsedPercent > 100 ? 'red' : 'var(--primary)', height: '100%' }}></div>
                </div>
                <p style={{ marginTop: '4px', fontSize: '0.9rem', color: '#94a3b8' }}>{t('knapsack.percentFull', { percent: physics.volumeUsedPercent.toFixed(1) })}</p>
              </div>
              <div style={{ padding: '16px', border: `2px solid ${physics.airlineCompliant ? 'var(--primary)' : 'orange'}`, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>{t('knapsack.airlineCompliance')}</h3>
                {physics.airlineWarnings.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', color: 'orange' }}>
                    {physics.airlineWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--primary)' }}>{t('knapsack.compliantWith', { airline: selectedAirline })}</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
            <h2>{t('itinerary.title', { destination })}</h2>
            <ul style={{ margin: '16px 0', paddingLeft: '24px' }}>
              {itinerary.map(day => (
                <li key={day.dayNumber} style={{ marginBottom: '8px' }}>
                  {t('itinerary.dayLine', {
                    n: day.dayNumber,
                    temp: day.maxTempC !== undefined ? `${day.maxTempC}°C` : t('itinerary.notAvailable'),
                    warmth: day.weatherWarmthTarget,
                  })}
                </li>
              ))}
            </ul>
          </div>
          <WardrobeAnalyzer report={report} garments={activeGarments} />
        </>
      )}
    </main>
  );
}
