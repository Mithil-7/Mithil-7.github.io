(() => {
  'use strict';

  const toggle = document.getElementById('audio-toggle');
  const label = document.getElementById('audio-label');
  const volumeInput = document.getElementById('audio-volume');
  const status = document.getElementById('audio-status');
  if (!toggle || !label || !volumeInput || !status) return;

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  const MIN_VOLUME = 0;
  const MAX_VOLUME = 100;
  const DEFAULT_VOLUME = 55;
  const MAX_GAIN = 0.32;
  const UNLOCK_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'keyup', 'wheel', 'scroll', 'click'];
  const notes = [130.81, 164.81, 196.00, 246.94, 261.63, 196.00, 146.83, 220.00];
  const STEP_SECONDS = 4.6;
  const LOOKAHEAD_SECONDS = 0.9;
  let context = null;
  let filter = null;
  let masterGain = null;
  let scheduler = 0;
  let nextNoteTime = 0;
  let noteIndex = 0;
  let userEnabled = false;
  let hiddenPause = false;
  let fadeVersion = 0;
  let unlockListenersArmed = false;
  let playbackActive = false;

  volumeInput.min = String(MIN_VOLUME);
  volumeInput.max = String(MAX_VOLUME);
  if (!volumeInput.value) volumeInput.value = String(DEFAULT_VOLUME);
  volumeInput.step = volumeInput.step || '1';
  status.setAttribute('role', status.getAttribute('role') || 'status');
  status.setAttribute('aria-live', status.getAttribute('aria-live') || 'polite');

  const getVolume = () => {
    const value = Number(volumeInput.value);
    if (!Number.isFinite(value)) return DEFAULT_VOLUME;
    return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, value));
  };

  const updateVolumeAccessibility = () => {
    const value = getVolume();
    volumeInput.setAttribute('aria-valuetext', `${value} of ${MAX_VOLUME}`);
    return value;
  };

  const setStatus = message => { status.textContent = message; };

  const setToggleState = enabled => {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Turn ambient sound off' : 'Turn ambient sound on');
    label.textContent = enabled ? 'Ambient on' : 'Ambient off';
  };

  const volumeLevel = () => (updateVolumeAccessibility() / MAX_VOLUME) * MAX_GAIN;

  function removeUnlockListeners() {
    if (!unlockListenersArmed) return;
    UNLOCK_EVENTS.forEach(eventName => {
      window.removeEventListener(eventName, unlockAudio, true);
    });
    unlockListenersArmed = false;
  }

  function armUnlockListeners() {
    if (unlockListenersArmed) return;
    UNLOCK_EVENTS.forEach(eventName => {
      window.addEventListener(eventName, unlockAudio, true);
    });
    unlockListenersArmed = true;
  }

  function unlockAudio(event) {
    if (!userEnabled || !context || document.hidden || event.target?.closest?.('#audio-toggle')) return;
    removeUnlockListeners();
    enableAudio(false);
  }

  function createGraph() {
    if (context) return;
    context = new AudioContextConstructor();

    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1750;
    filter.Q.value = 0.35;

    masterGain = context.createGain();
    masterGain.gain.value = 0;
    filter.connect(masterGain);
    masterGain.connect(context.destination);

    // A very slow filter movement keeps the original pad from sounding static.
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.frequency.value = 0.035;
    lfoDepth.gain.value = 320;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();
  }

  function fadeMaster(target, duration) {
    if (!context || !masterGain) return;
    const now = context.currentTime;
    const current = Math.max(0, masterGain.gain.value);
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(current, now);
    masterGain.gain.linearRampToValueAtTime(target, now + duration);
  }

  function scheduleNote(startTime, frequency) {
    const voice = context.createGain();
    const voiceLevel = 0.105;
    const releaseAt = startTime + 7.2;
    voice.gain.setValueAtTime(0.0001, startTime);
    voice.gain.linearRampToValueAtTime(voiceLevel, startTime + 1.35);
    voice.gain.setValueAtTime(voiceLevel, startTime + 4.8);
    voice.gain.exponentialRampToValueAtTime(0.0001, releaseAt);
    voice.connect(filter);

    const fundamental = context.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(frequency, startTime);
    fundamental.detune.value = -2;

    const fifth = context.createOscillator();
    fifth.type = 'triangle';
    fifth.frequency.setValueAtTime(frequency * 1.5, startTime);
    fifth.detune.value = 2;
    const fifthGain = context.createGain();
    fifthGain.gain.value = 0.18;
    fifth.connect(fifthGain);
    fifthGain.connect(voice);
    fundamental.connect(voice);

    fundamental.start(startTime);
    fifth.start(startTime);
    fundamental.stop(releaseAt + 0.1);
    fifth.stop(releaseAt + 0.1);
  }

  function scheduleNotes() {
    if (!userEnabled || hiddenPause || document.hidden || !context) return;
    const horizon = context.currentTime + LOOKAHEAD_SECONDS;
    while (nextNoteTime < horizon) {
      scheduleNote(nextNoteTime, notes[noteIndex % notes.length]);
      noteIndex += 1;
      nextNoteTime += STEP_SECONDS;
    }
    window.clearTimeout(scheduler);
    scheduler = window.setTimeout(scheduleNotes, 220);
  }

  function startScheduler() {
    window.clearTimeout(scheduler);
    nextNoteTime = context.currentTime + 0.08;
    scheduleNotes();
  }

  function stopScheduler() {
    window.clearTimeout(scheduler);
    scheduler = 0;
  }

  function startPlayback() {
    if (!userEnabled || hiddenPause || document.hidden || !context || context.state !== 'running' || playbackActive) return;
    startScheduler();
    playbackActive = true;
    removeUnlockListeners();
    fadeMaster(volumeLevel(), 0.55);
    setStatus(`Ambient on · volume ${getVolume()}/${MAX_VOLUME}.`);
  }

  function reportAudioError() {
    userEnabled = false;
    hiddenPause = false;
    playbackActive = false;
    removeUnlockListeners();
    fadeVersion += 1;
    stopScheduler();
    setToggleState(false);
    toggle.disabled = true;
    setStatus('Ambient sound is unavailable in this browser.');
  }

  async function enableAudio(isAutoplayAttempt = false) {
    if (!AudioContextConstructor) {
      reportAudioError();
      return;
    }
    userEnabled = true;
    hiddenPause = false;
    fadeVersion += 1;
    setToggleState(true);
    try {
      createGraph();
      if (context.state !== 'running') {
        if (isAutoplayAttempt) {
          // Some browsers leave this promise pending when autoplay is blocked.
          // Arm the gesture listeners before attempting resume so they still
          // work even if the page-load attempt never settles.
          armUnlockListeners();
          context.resume()
            .then(() => startPlayback())
            .catch(() => setStatus('Ambient ready · interact once to start playback.'));
          setStatus('Ambient ready · interact once to start playback.');
          return;
        }
        await context.resume();
      }
      if (!userEnabled) return;
      if (document.hidden) {
        hiddenPause = true;
        playbackActive = false;
        stopScheduler();
        setStatus('Ambient paused while the page is hidden.');
        await context.suspend();
        return;
      }
      if (context.state !== 'running') {
        armUnlockListeners();
        setStatus('Ambient ready · interact once to start playback.');
        return;
      }
      startPlayback();
    } catch (_) {
      armUnlockListeners();
      setStatus('Ambient ready · interact once to start playback.');
    }
  }

  function disableAudio() {
    userEnabled = false;
    hiddenPause = false;
    playbackActive = false;
    removeUnlockListeners();
    fadeVersion += 1;
    stopScheduler();
    setToggleState(false);
    if (context) {
      const version = fadeVersion;
      fadeMaster(0, 0.45);
      window.setTimeout(() => {
        if (!userEnabled && version === fadeVersion) context.suspend().catch(() => {});
      }, 500);
    }
    setStatus('Ambient off.');
  }

  async function pauseForHiddenPage() {
    if (!userEnabled || !context) return;
    hiddenPause = true;
    playbackActive = false;
    stopScheduler();
    const version = ++fadeVersion;
    fadeMaster(0, 0.2);
    setStatus('Ambient paused while the page is hidden.');
    window.setTimeout(async () => {
      if (hiddenPause && userEnabled && version === fadeVersion) {
        try { await context.suspend(); } catch (_) { /* already suspended */ }
      }
    }, 240);
  }

  async function resumeVisiblePage() {
    if (!userEnabled || !hiddenPause || !context) return;
    hiddenPause = false;
    try {
      if (context.state !== 'running') {
        armUnlockListeners();
        await context.resume();
      }
      if (!userEnabled || document.hidden) return;
      startPlayback();
    } catch (_) {
      armUnlockListeners();
      setStatus('Ambient ready · interact once to start playback.');
    }
  }

  const startOnLoad = true;
  updateVolumeAccessibility();
  setToggleState(startOnLoad);
  setStatus(startOnLoad ? 'Ambient is starting.' : 'Ambient off. Click to enable synthesized ambient sound.');

  if (!AudioContextConstructor) {
    reportAudioError();
    return;
  }

  toggle.addEventListener('click', () => {
    const isPlaying = userEnabled && playbackActive && !hiddenPause;
    if (isPlaying) disableAudio();
    else enableAudio(false);
  });
  volumeInput.addEventListener('input', () => {
    const value = getVolume();
    if (userEnabled && !hiddenPause && !document.hidden) fadeMaster(volumeLevel(), 0.18);
    else if (!userEnabled) setStatus(`Ambient off · volume ${value}/${MAX_VOLUME}.`);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseForHiddenPage();
    else resumeVisiblePage();
  });

  // Try to start on page load. Browsers may require one user gesture before
  // audible playback; in that case the first interaction unlocks this same loop.
  if (startOnLoad) enableAudio(true);
})();
