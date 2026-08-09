'use client';

import { useState, useEffect } from 'react';
import WardrobeAnalyzer from '../components/WardrobeAnalyzer';
import { Garment, DayItinerary, WearabilityReport } from '../types';
import { analyzeWardrobe } from '../utils/wardrobeEngine';
import { geocodeLocation, fetchWeather, transformWeatherToItinerary } from '../services/weatherApi';
import { calculateKnapsackPhysics, PackingPhysicsReport, TravelMode } from '../utils/knapsackEngine';
import { MODELS, SuitcaseModel } from '../utils/suitcaseDatabase';
import { AIRLINES } from '../utils/airlineBaggage';
import { generateWardrobeFromArchetype } from '../utils/generator';
import { parseClosetFile } from '../utils/fileImporter';
import { useT } from '../i18n/context';
import { buildShareUrl, parseShareFromHash } from '../utils/share';
import DestinationAutocomplete from '../components/DestinationAutocomplete';
import LocalInfoPanel from '../components/LocalInfoPanel';
import { resolveActivity } from '../utils/activity';
import { tripDurationFromDates } from '../utils/tripDuration';
import DailyActivityPicker from '../components/DailyActivityPicker';
import WardrobeManager from '../components/WardrobeManager';
import SuitcaseFinder from '../components/SuitcaseFinder';
import { clearAllLocalData } from '../services/db';

// Model names alone collide across brands (e.g. Away, Arlo Skye and Roam all
// sell "The Carry-On"), so selection is keyed by brand+model together.
const suitcaseKey = (m: SuitcaseModel) => `${m.brand} — ${m.model}`;



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
  const [destinationCountryCode, setDestinationCountryCode] = useState<string | null>(null);
  const [selectedSuitcase, setSelectedSuitcase] = useState(suitcaseKey(MODELS[0]));
  const [selectedAirline, setSelectedAirline] = useState('EK'); // Emirates
  const [travelMode, setTravelMode] = useState<TravelMode>('flying');

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
      setDestinationCountryCode('country_code' in geo && geo.country_code ? geo.country_code : null);
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
      const physicsResult = calculateKnapsackPhysics(result, garmentsToUse, suitcase, selectedAirline, travelMode);
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

  const handleStartOver = () => {
    setReport(null);
    setPhysics(null);
    setItinerary([]);
    setActiveGarments([]);
    setError('');
  };

  const handleDeleteAllData = async () => {
    if (typeof window !== 'undefined' && !window.confirm(t('app.deleteConfirm'))) return;
    await clearAllLocalData();
    try {
      localStorage.clear();
    } catch {
      // Best-effort; IndexedDB is already cleared above.
    }
    window.location.reload();
  };

  return (
    <main className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header no-print" style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        <button
          onClick={handleShare}
          className="btn-secondary"
          style={{ position: 'absolute', left: 0, top: 0, fontSize: '0.9rem', padding: '6px 12px' }}
        >
          {shareCopied ? '✔ Copied!' : '🔗 Share Trip'}
        </button>
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

      <div className="glass-panel no-print" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>{t('trip.detailsTitle')}</h2>

        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          <div>
            <DestinationAutocomplete value={destination} onChange={setDestination} />
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

          <DailyActivityPicker
            duration={tripDurationFromDates(startDate, endDate)}
            destination={destination}
            dailyActivities={dailyActivities}
            setDailyActivities={setDailyActivities}
          />

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
                {customGarments.length > 0 && customFileName && (
                  <p style={{ marginTop: '8px', color: '#22c55e', fontSize: '0.9rem' }}>
                    {t('trip.loadedGarments', { count: customGarments.length, file: customFileName })}
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
          <div>
            <label htmlFor="travelMode" className="label">{t('trip.travelMode')}</label>
            <select id="travelMode" className="input-field" value={travelMode} onChange={e => setTravelMode(e.target.value as TravelMode)}>
              <option value="flying">{t('trip.travelModeFlying')}</option>
              <option value="driving">{t('trip.travelModeDriving')}</option>
              <option value="train">{t('trip.travelModeTrain')}</option>
              <option value="biking">{t('trip.travelModeBiking')}</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
            <div>
              <SuitcaseFinder onSelect={(m) => setSelectedSuitcase(suitcaseKey(m))} />
              <label htmlFor="suitcase" className="label" style={{ marginTop: '12px', display: 'block' }}>{t('trip.suitcase')}</label>
              <select id="suitcase" className="input-field" value={selectedSuitcase} onChange={e => setSelectedSuitcase(e.target.value)}>
                {MODELS.map(m => (
                  <option key={suitcaseKey(m)} value={suitcaseKey(m)}>{m.brand} - {m.model}</option>
                ))}
              </select>
            </div>
            {travelMode === 'flying' && (
              <div>
                <label htmlFor="airline" className="label">{t('trip.airline')}</label>
                <select id="airline" className="input-field" value={selectedAirline} onChange={e => setSelectedAirline(e.target.value)}>
                  {AIRLINES.map(a => (
                    <option key={a.code} value={a.code}>{a.name} ({a.carryOn.weight}kg)</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <button className="btn-primary" onClick={handleAnalyze} disabled={loading} style={{ width: '100%' }}>
          {loading ? t('trip.analyzing') : t('trip.analyzeButton')}
        </button>
      </div>

      {report && physics && (
        <>
          <div className="glass-panel no-print" style={{ padding: '24px', marginTop: '32px' }}>
            <h2>{t('knapsack.title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '16px', border: `2px solid ${physics.fitsInSuitcase ? 'var(--primary)' : 'red'}`, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>{t('knapsack.volumeWeight')}</h3>
                <p>
                  {physics.weightLimitKg !== undefined
                    ? t('knapsack.weightLine', { weight: physics.totalWeightKg.toFixed(2), limit: physics.weightLimitKg })
                    : t('knapsack.weightLineNoLimit', { weight: physics.totalWeightKg.toFixed(2) })}
                </p>
                <p>{t('knapsack.volumeLine', { volume: physics.totalVolumeLiters.toFixed(2), capacity: physics.suitcaseCapacityLiters.toFixed(2) })}</p>
                <div style={{ width: '100%', backgroundColor: '#334155', height: '12px', borderRadius: '6px', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(physics.volumeUsedPercent, 100)}%`, backgroundColor: physics.volumeUsedPercent > 100 ? 'red' : 'var(--primary)', height: '100%' }}></div>
                </div>
                <p style={{ marginTop: '4px', fontSize: '0.9rem', color: '#94a3b8' }}>{t('knapsack.percentFull', { percent: physics.volumeUsedPercent.toFixed(1) })}</p>
              </div>
              <div style={{ padding: '16px', border: `2px solid ${physics.airlineCompliant ? 'var(--primary)' : 'orange'}`, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>{t('knapsack.airlineCompliance')}</h3>
                {travelMode !== 'flying' ? (
                  <p style={{ color: 'var(--text-muted)' }}>{t('knapsack.notFlying')}</p>
                ) : physics.airlineWarnings.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', color: 'orange' }}>
                    {physics.airlineWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--primary)' }}>{t('knapsack.compliantWith', { airline: selectedAirline })}</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel no-print" style={{ padding: '24px', marginTop: '32px' }}>
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
          <WardrobeAnalyzer report={report} garments={activeGarments} destinationCountryCode={destinationCountryCode} travelMode={travelMode} />
          <LocalInfoPanel countryCode={destinationCountryCode} />

          <div className="no-print" style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleStartOver}
              className="btn-secondary"
              style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 24px' }}
            >
              {t('app.startOver')}
            </button>
          </div>
        </>
      )}

      <WardrobeManager
        isOpen={closetManagerOpen}
        onClose={() => setClosetManagerOpen(false)}
        garments={customGarments}
        setGarments={setCustomGarments}
      />

      <div className="no-print" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <button
          onClick={handleDeleteAllData}
          className="btn-secondary"
          style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', fontSize: '0.85rem', padding: '8px 16px' }}
        >
          {t('app.deleteAllData')}
        </button>
      </div>
    </main>
  );
}
