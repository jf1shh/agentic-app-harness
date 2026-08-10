'use client';

import { useState, useEffect } from 'react';
import WardrobeAnalyzer from '../components/WardrobeAnalyzer';
import { Garment, DayItinerary, WearabilityReport } from '../types';
import { analyzeWardrobe } from '../utils/wardrobeEngine';
import { applyGarmentSwap, OutfitRole } from '../utils/outfitEditor';
import { geocodeLocation, fetchWeather, transformWeatherToItinerary } from '../services/weatherApi';
import { calculateKnapsackPhysics, getPackedGarments, PackingPhysicsReport } from '../utils/knapsackEngine';
import { computeVolumeBreakdown } from '../utils/volumeBreakdown';
import VolumeDonutChart from '../components/VolumeDonutChart';
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
import { buildDestinationLegs } from '../utils/multiDestination';
import { fetchLegItinerary } from '../services/weatherApi';
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
  const [additionalDestinations, setAdditionalDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-05');
  const [report, setReport] = useState<WearabilityReport | null>(null);
  const [physics, setPhysics] = useState<PackingPhysicsReport | null>(null);
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // The primary destination's country code — feeds LocalInfoPanel, which is
  // deliberately scoped to one destination's local-cost/advisory lookup even
  // on a multi-destination trip (see the "Left undone" PR note).
  const [destinationCountryCode, setDestinationCountryCode] = useState<string | null>(null);
  // One country code per leg (a single-destination trip is a one-element
  // array) — feeds the packing checklist, which needs an adapter per
  // distinct plug type across the whole trip, not just the first leg.
  const [legCountryCodes, setLegCountryCodes] = useState<(string | null)[]>([]);
  const [selectedSuitcase, setSelectedSuitcase] = useState(suitcaseKey(MODELS[0]));
  const [selectedAirline, setSelectedAirline] = useState('EK'); // Emirates

  const [archetype, setArchetype] = useState('quiet-luxury');
  const [strategy, setStrategy] = useState('standard');
  // On a trip much longer than one laundry cycle, assumes the same tops/
  // bottoms get worn on repeat after washing rather than packing a fresh
  // item for every remaining day (see src/utils/laundryCycle.ts). A no-op
  // for any trip within one cycle, so on by default.
  const [hasLaundryAccess, setHasLaundryAccess] = useState(true);
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
      setAdditionalDestinations(shared.additionalDestinations ?? []);
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
    const trimmedAdditionalDestinations = additionalDestinations.map((d) => d.trim()).filter((d) => d.length > 0);
    const url = buildShareUrl(
      {
        destination, startDate, endDate, archetype, strategy, activity,
        additionalDestinations: trimmedAdditionalDestinations.length > 0 ? trimmedAdditionalDestinations : undefined,
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
      const validAdditionalDestinations = additionalDestinations.map((d) => d.trim()).filter((d) => d.length > 0);
      let generatedItinerary: DayItinerary[];
      let legCodes: (string | null)[];

      if (validAdditionalDestinations.length === 0) {
        // Single destination: unchanged from before multi-destination trips
        // existed, so this path carries none of the new feature's risk.
        const geo = await geocodeLocation(destination);
        const primaryCountryCode = 'country_code' in geo && geo.country_code ? geo.country_code : null;
        const weather = await fetchWeather(geo.latitude, geo.longitude, startDate, endDate);
        const resolvedDailyActivities = dailyActivities.map((a) => resolveActivity(a, destination));
        generatedItinerary = transformWeatherToItinerary(weather, activity, resolvedDailyActivities);
        legCodes = [primaryCountryCode];
      } else {
        // Multi-destination: split the trip's total days across every
        // destination in order, fetch each leg's own weather, and number
        // the combined itinerary continuously (day 1..N across all legs)
        // rather than restarting at 1 per leg.
        const totalTripDays = tripDurationFromDates(startDate, endDate);
        const legs = buildDestinationLegs([destination, ...validAdditionalDestinations], totalTripDays, startDate);
        generatedItinerary = [];
        legCodes = [];
        let dayOffset = 0;
        for (const leg of legs) {
          const legDailyActivities = dailyActivities
            .slice(dayOffset, dayOffset + leg.days)
            .map((a) => resolveActivity(a, leg.destination));
          const legResult = await fetchLegItinerary(leg, dayOffset, activity, legDailyActivities);
          generatedItinerary.push(...legResult.itinerary);
          legCodes.push(legResult.countryCode);
          dayOffset += leg.days;
        }
      }

      setDestinationCountryCode(legCodes[0] ?? null);
      setLegCountryCodes(legCodes);
      setItinerary(generatedItinerary);

      const tripDuration = generatedItinerary.length;

      const garmentsToUse = closetSource === 'custom' && customGarments.length > 0
        ? customGarments
        : generateWardrobeFromArchetype(archetype, strategy, tripDuration, hasLaundryAccess);

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
        setError(t('trip.failedToAnalyze'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOutfitSwap = (day: number, role: OutfitRole, garmentId: string): boolean => {
    if (!report) return false;
    const replacement = activeGarments.find((g) => g.id === garmentId);
    if (!replacement) return false;

    const updated = applyGarmentSwap(report, day, role, replacement, activeGarments);
    if (!updated) return false;

    setReport(updated);

    // The knapsack physics (weight/volume) were computed from the outfit
    // schedule at Analyze time -- a manual swap can change which garments
    // are actually packed, so it must be recomputed here or it goes stale
    // relative to the schedule the reader is now looking at.
    const suitcase = MODELS.find((m) => suitcaseKey(m) === selectedSuitcase) || MODELS[0];
    setPhysics(calculateKnapsackPhysics(updated, activeGarments, suitcase, selectedAirline));

    return true;
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

          {additionalDestinations.map((dest, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <DestinationAutocomplete
                  id={`dest-${i + 2}`}
                  label={`Destination ${i + 2}`}
                  value={dest}
                  onChange={(next) => setAdditionalDestinations((prev) => prev.map((d, j) => (j === i ? next : d)))}
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                aria-label={t('trip.removeDestination', { n: i + 2 })}
                onClick={() => setAdditionalDestinations((prev) => prev.filter((_, j) => j !== i))}
                style={{ padding: '10px 14px' }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAdditionalDestinations((prev) => [...prev, ''])}
            style={{ alignSelf: 'flex-start' }}
          >
            {t('trip.addDestination')}
          </button>

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
                    <option value="corporate">{t('archetype.corporate')}</option>
                    <option value="old-money">{t('archetype.oldMoney')}</option>
                    <option value="balletcore">{t('archetype.balletcore')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="strategy" className="label">{t('trip.packingStrategy')}</label>
                  <select id="strategy" className="input-field" value={strategy} onChange={e => setStrategy(e.target.value)}>
                    <option value="standard">{t('strategy.standard')}</option>
                    <option value="flexible">{t('strategy.flexible')}</option>
                    <option value="minimalist">{t('strategy.minimalist')}</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={hasLaundryAccess}
                      onChange={(e) => setHasLaundryAccess(e.target.checked)}
                    />
                    {t('trip.hasLaundryAccess')}
                  </label>
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
          <div className="glass-panel no-print" style={{ padding: '24px', marginTop: '32px' }}>
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
              <div style={{ padding: '16px', border: '2px solid var(--primary)', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '8px' }}>{t('knapsack.volumeByCategory')}</h3>
                <VolumeDonutChart slices={computeVolumeBreakdown(getPackedGarments(report, activeGarments))} />
              </div>
            </div>
          </div>

          <div className="glass-panel no-print" style={{ padding: '24px', marginTop: '32px' }}>
            <h2>{t('itinerary.title', { destination })}</h2>
            <ul style={{ margin: '16px 0', paddingLeft: '24px' }}>
              {itinerary.map(day => (
                <li key={day.dayNumber} style={{ marginBottom: '8px' }}>
                  {t(day.destinationName ? 'itinerary.dayLineForDestination' : 'itinerary.dayLine', {
                    n: day.dayNumber,
                    destination: day.destinationName ?? '',
                    temp: day.maxTempC !== undefined ? `${day.maxTempC}°C` : t('itinerary.notAvailable'),
                    warmth: day.weatherWarmthTarget,
                  })}
                </li>
              ))}
            </ul>
          </div>
          <WardrobeAnalyzer report={report} garments={activeGarments} destinationCountryCodes={legCountryCodes} onOutfitSwap={handleOutfitSwap} />
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
