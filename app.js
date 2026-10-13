const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const defaults = { exposure: 0, contrast: 0, highlights: 0, shadows: 0, temperature: 0, tint: 0, saturation: 0, grain: 0 };
const textStyleDefaults = { fontFamily: 'Manrope', fontSize: 25, fontWeight: 700, color: '#ffffff', gradientEnabled: false, gradientColor: '#65d7ff', outlineColor: '#000000', outlineWidth: 12, shadowColor: '#000000', shadowBlur: 7, glowColor: '#83ecff', glowBlur: 0, opacity: 100, letterSpacing: 0, lineSpacing: 1.2, alignment: 'center', backgroundEnabled: false, backgroundColor: '#111111', backgroundOpacity: 65, rotation: 0, animationDuration: .6 };
const localTextFonts = new Set(['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Consolas', 'Manrope', 'DM Sans']);
const textFontLoadPromises = new Map();
const motionEffectGroups = [
  { title: 'Entrance Animation', phase: 'entry', effects: [['Fade In','fadeIn'],['Slide In','slideIn'],['Slide Up','slideUp'],['Slide Down','slideDown'],['Slide Left','slideLeft'],['Slide Right','slideRight'],['Zoom In','zoomIn'],['Pop-up Animation','popUp'],['Typewriter Effect','typewriter'],['Text Reveal','textReveal'],['Image Reveal','imageReveal'],['Scroll Reveal','scrollReveal'],['Blur In','blurIn'],['Wipe Reveal','wipeReveal'],['Mask Reveal','maskReveal'],['Split Text Animation','splitText'],['Stagger Animation','stagger'],['Spring Animation','spring'],['Entrance Animation','fadeIn']] },
  { title: 'Exit Animation', phase: 'exit', effects: [['Fade Out','fadeOut'],['Slide Out','slideOut'],['Zoom Out','zoomOut'],['Blur Out','blurOut'],['Exit Animation','fadeOut']] },
  { title: 'Motion Effects', phase: 'loop', effects: [['Bounce Animation','bounce'],['Rotate Animation','rotate'],['Flip Animation','flip'],['Shake Animation','shake'],['Pulse Animation','pulse'],['Scale Animation','scale'],['Morph Animation','morph'],['Parallax Effect','parallax'],['Ken Burns Effect','kenBurns'],['Floating Animation','floating'],['Glitch Effect','glitch'],['Wave Animation','wave'],['Spring Animation','springLoop'],['Loop Animation','loop']] },
  { title: 'Transition Effects', phase: 'transition', effects: [['Fade Transition','fade'],['Wipe Transition','wipe'],['Zoom Transition','zoom'],['Blur Transition','blur']] }
];
const videoLooks = {
  original: 'none',
  warm: 'sepia(.22) saturate(1.18)',
  cool: 'saturate(1.08) hue-rotate(8deg)',
  mono: 'grayscale(1) contrast(1.08)',
  film: 'contrast(.92) saturate(.82) sepia(.12)'
};
const videoEffects = {
  none: 'none',
  softGlow: 'blur(.7px) brightness(1.08)',
  vintage: 'sepia(.3) contrast(.92) saturate(.82)',
  vivid: 'saturate(1.35) contrast(1.08)'
};
const effectLibrary = {
  shadowLines: { name: 'Shadow Lines', category: 'Trending', filter: strength => `contrast(${1 + strength * .22}) brightness(${1 - strength * .08}) saturate(${1 - strength * .15})` },
  vrGameFire: { name: 'VR Game Fire', category: 'Trending', filter: strength => `saturate(${1 + strength * .65}) hue-rotate(${-strength * 12}deg) contrast(${1 + strength * .12})` },
  slantedOpen: { name: 'Slanted Open', category: 'Classic', filter: strength => `contrast(${1 + strength * .2}) saturate(${1 + strength * .18})` },
  tremorScan: { name: 'Tremor Scan', category: 'Body effects', filter: strength => `contrast(${1 + strength * .3}) saturate(${1 + strength * .45})` }
};
let values = { ...defaults };
let crop = { x: 0, y: 0, width: 1, height: 1 };
let rotation = 0;
let flipped = false;
let originalUrl = '';
let originalFile = null;
let isVideo = false;
let toastTimer;
let saveTimer;
let isRestoring = false;
let databasePromise;
let history = [];
let historyIndex = -1;
let historyTimer;
let trimRange = { start: 0, end: null };
let splitRange = { start: 0, end: null };
let splitPoints = [];
let selectedSegment = null;
let activeRecorder = null;
let videoLook = 'original';
let videoEffect = 'none';
let videoTransition = 'none';
let muteOriginalAudio = false;
let recorderFailed = false;
let videoTitle = '';
let videoTitlePosition = 'bottom';
let textItems = [];
let textToolActive = false;
let selectedTextId = null;
let musicClips = [];
let musicAudioContext = null;
let musicCaptureDestination = null;
let effectClips = [];
let selectedEffectClipId = null;
let timelineLocks = new Set();
let timelineLanes = [
  { id: 'media-1', type: 'media', name: 'Media + effects' }
];
let mediaTrackId = 'media-1';
let mediaMotion = { effect: 'none', phase: 'entry' };
let timelineCursorTime = 0;
let timelineGuideTime = null;
let timelineGuidePreviewActive = false;
let playheadAnimationFrame = 0;
let timelinePlaying = false;
let timelineLastFrameTime = 0;
let suppressPreviewPause = 0;
let activeTimelinePreviewClipId = null;
const internalPreviewPauses = new WeakSet();
let mediaAssets = [];
let timelineMediaClips = [];
let selectedMediaAssetId = null;
let selectedTimelineMediaId = null;
let selectedMusicClipId = null;
let projectImportMode = 'project';
let defaultImageClipDuration = 5;

const fileInput = $('#fileInput');
const photo = $('#photo');
const videoPreview = $('#videoPreview');
const timelineClipVideo = $('#timelineClipVideo');
const timelineClipImage = $('#timelineClipImage');
const musicPreview = $('#musicPreview');
const stage = $('#dropZone');
const mediaResizeOverlay = $('#mediaResizeOverlay');
const mediaResizeHandle = $('#mediaResizeHandle');
const mediaResizeValue = $('#mediaResizeValue');
const filters = $$('.slider-row input');

function buildMotionEffectGroups(container, target) {
  const textOnly = new Set(['typewriter','textReveal','splitText','stagger','keyframe']);
  motionEffectGroups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'motion-effect-group';
    const heading = document.createElement('strong');
    heading.textContent = group.title;
    const buttons = document.createElement('div');
    buttons.className = 'motion-effect-buttons';
    group.effects.forEach(([label, effect]) => {
      if (target === 'media' && textOnly.has(effect)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.motionEffect = effect;
      button.dataset.motionPhase = group.phase;
      button.dataset.motionTarget = target;
      buttons.appendChild(button);
    });
    section.append(heading, buttons);
    container.appendChild(section);
  });
  const special = document.createElement('section');
  special.className = 'motion-effect-group';
  special.innerHTML = '<strong>Animation Effects</strong><div class="motion-effect-buttons"><button type="button" data-motion-effect="keyframe" data-motion-phase="motion" data-motion-target="text">Keyframe Animation</button></div>';
  if (target === 'text') container.appendChild(special);
}
buildMotionEffectGroups($('#textMotionEffects'), 'text');
buildMotionEffectGroups($('#mediaMotionEffects'), 'media');

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function editSnapshot() {
  return { values: { ...values }, crop: { ...crop }, rotation, flipped, videoLook, videoEffect, videoTransition, mediaMotion: { ...mediaMotion }, muteOriginalAudio, videoTitle, videoTitlePosition, defaultImageClipDuration, textItems: textItems.map(item => ({ ...item, keyframes: (item.keyframes || []).map(frame => ({ ...frame })) })), effectClips: effectClips.map(item => ({ ...item })), selectedEffectClipId, musicClips: musicClips.map(({ id, file, start, end, offset, trackId, assetId, waveform }) => ({ id, file, start, end, offset, trackId, assetId, waveform })), selectedMusicClipId, mediaAssets: mediaAssets.map(({ id, file, name, type, kind, duration, thumbnailUrl, waveform, width, height }) => ({ id, file, name, type, kind, duration, thumbnailUrl: thumbnailUrl.startsWith('data:') ? thumbnailUrl : '', waveform, width, height })), selectedMediaAssetId, timelineMediaClips: timelineMediaClips.map(item => ({ ...item })), selectedTimelineMediaId, timelineLanes: timelineLanes.map(lane => ({ ...lane })), mediaTrackId, timelineGuideTime, splitRange: { ...splitRange }, splitPoints: [...splitPoints], selectedSegment };
}

function refreshHistoryButtons() {
  $('#undoButton').disabled = historyIndex <= 0;
  $('#redoButton').disabled = historyIndex < 0 || historyIndex >= history.length - 1;
}

function resetHistory() {
  clearTimeout(historyTimer);
  history = [editSnapshot()];
  historyIndex = 0;
  refreshHistoryButtons();
}

function queueHistory() {
  if (isRestoring) return;
  clearTimeout(historyTimer);
  historyTimer = setTimeout(commitHistorySnapshot, 350);
}

function commitHistorySnapshot() {
  const next = editSnapshot();
  if (historyIndex >= 0 && JSON.stringify(next) === JSON.stringify(history[historyIndex])) return;
  history = history.slice(0, historyIndex + 1);
  history.push(next);
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  refreshHistoryButtons();
}

function restoreHistorySnapshot(snapshot) {
  isRestoring = true;
  defaultImageClipDuration = Number(snapshot.defaultImageClipDuration) || defaultImageClipDuration;
  pausePreviewElement(timelineClipVideo); timelineClipVideo.removeAttribute('src'); delete timelineClipVideo.dataset.assetId; timelineClipVideo.load();
  timelineClipImage.removeAttribute('src'); timelineClipImage.hidden = true;
  $('#selectedMediaPreview').removeAttribute('src');
  mediaAssets.forEach(asset => URL.revokeObjectURL(asset.url));
  mediaAssets = (snapshot.mediaAssets || []).map(saved => {
    const url = URL.createObjectURL(saved.file);
    return { ...saved, url, thumbnailUrl: saved.thumbnailUrl || (saved.kind === 'image' ? url : '') };
  });
  selectedMediaAssetId = snapshot.selectedMediaAssetId ?? null;
  selectedMusicClipId = snapshot.selectedMusicClipId ?? null;
  values = { ...defaults, ...snapshot.values };
  crop = { ...snapshot.crop };
  rotation = snapshot.rotation;
  flipped = snapshot.flipped;
  videoLook = snapshot.videoLook || 'original';
  videoEffect = snapshot.videoEffect || 'none';
  videoTransition = snapshot.videoTransition || 'none';
  mediaMotion = { effect: 'none', phase: 'entry', ...(snapshot.mediaMotion || {}) };
  muteOriginalAudio = Boolean(snapshot.muteOriginalAudio);
  videoPreview.muted = muteOriginalAudio;
  $('#muteOriginalAudio').checked = muteOriginalAudio;
  effectClips = (snapshot.effectClips || []).map(item => ({ ...item }));
  timelineMediaClips = (snapshot.timelineMediaClips || []).map(item => ({ ...item, scale: clampMediaScale(item.scale) }));
  selectedTimelineMediaId = snapshot.selectedTimelineMediaId ?? null;
  selectedEffectClipId = snapshot.selectedEffectClipId ?? null;
  timelineLanes = normalizeTimelineLanes(snapshot.timelineLanes);
  mediaTrackId = timelineLanes.some(lane => lane.id === snapshot.mediaTrackId && lane.type === 'media') ? snapshot.mediaTrackId : getDefaultTimelineLane('media').id;
  timelineGuideTime = Number.isFinite(snapshot.timelineGuideTime) ? snapshot.timelineGuideTime : null;
  $('#videoLook').value = videoLook;
  $('#videoEffect').value = videoEffect;
  $('#videoTransition').value = videoTransition;
  applyVideoLook();
  videoTitle = snapshot.videoTitle || '';
  videoTitlePosition = snapshot.videoTitlePosition || 'bottom';
  textItems = (snapshot.textItems || []).map(item => ({ ...item, keyframes: (item.keyframes || []).map(frame => ({ ...frame })) }));
  textItems.forEach(item => { item.trackId ||= getDefaultTimelineLane('text').id; });
  restoreMusicClips(snapshot.musicClips || []);
  selectedMusicClipId = snapshot.selectedMusicClipId ?? null;
  selectedTextId = null;
  splitRange = { ...(snapshot.splitRange || trimRange) };
  splitPoints = [...(snapshot.splitPoints || [])];
  selectedSegment = snapshot.selectedSegment ?? null;
  updateVideoFadePreview();
  $('#videoTitle').value = videoTitle;
  $('#videoTitlePosition').value = videoTitlePosition;
  syncVideoTitlePreview();
  renderTextItems();
  renderTextTimeline();
  renderMediaLibrary(); renderTimelinePreviewAt(timelineCursorTime);
  filters.forEach(input => { input.value = values[input.dataset.key]; });
  applyCropPreview();
  updatePreview();
  isRestoring = false;
  scheduleSave();
  refreshHistoryButtons();
}

function stepHistory(direction) {
  clearTimeout(historyTimer);
  commitHistorySnapshot();
  const nextIndex = historyIndex + direction;
  if (nextIndex < 0 || nextIndex >= history.length) return;
  historyIndex = nextIndex;
  restoreHistorySnapshot(history[historyIndex]);
}

$('#undoButton').addEventListener('click', () => stepHistory(-1));
$('#redoButton').addEventListener('click', () => stepHistory(1));

function openPicker(mode = 'project') {
  projectImportMode = mode;
  fileInput.click();
}
$('#uploadButton').addEventListener('click', () => openPicker('project'));
$('#canvasUpload').addEventListener('click', () => openPicker('project'));
$('#addMedia').addEventListener('click', () => openPicker('library'));

function getMediaKind(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  const extension = file.name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','avif','bmp','tif','tiff'].includes(extension)) return 'image';
  if (['mp4','webm','mov','m4v','ogv','avi','mkv'].includes(extension)) return 'video';
  if (['mp3','wav','m4a','aac','ogg','flac','opus'].includes(extension)) return 'audio';
  return null;
}

function clampVideoAssetClips(asset) {
  if (!asset?.duration) return;
  timelineMediaClips.filter(clip => clip.assetId === asset.id).forEach(clip => {
    if (clip.autoDuration) {
      clip.end = clip.start + asset.duration;
      clip.autoDuration = false;
      return;
    }
    clip.sourceOffset = Math.min(Math.max(0, clip.sourceOffset || 0), Math.max(0, asset.duration - .1));
    clip.end = Math.min(clip.end, clip.start + Math.max(.1, asset.duration - clip.sourceOffset));
  });
}

function registerMediaAsset(file) {
  const existing = mediaAssets.find(asset => asset.file === file || (asset.name === file.name && asset.file.size === file.size && asset.file.lastModified === file.lastModified));
  if (existing) return existing;
  const kind = getMediaKind(file);
  if (!kind) return null;
  const asset = {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file, name: file.name, type: file.type || 'application/octet-stream', kind,
    url: URL.createObjectURL(file), duration: kind === 'image' ? defaultImageClipDuration : 0,
    thumbnailUrl: kind === 'image' ? '' : '', waveform: null
  };
  mediaAssets.push(asset);
  if (kind === 'image') {
    const image = new Image();
    image.onload = () => { asset.width = image.naturalWidth; asset.height = image.naturalHeight; asset.thumbnailUrl = asset.url; renderMediaLibrary(); };
    image.src = asset.url;
  } else {
    const probe = document.createElement(kind === 'video' ? 'video' : 'audio');
    probe.preload = 'metadata'; probe.muted = true; probe.src = asset.url;
    const releaseProbe = () => { probe.removeAttribute('src'); probe.load(); };
    probe.addEventListener('loadedmetadata', () => {
      asset.duration = Number.isFinite(probe.duration) ? probe.duration : 0;
      if (kind === 'video') {
        probe.addEventListener('loadeddata', () => {
          try { const canvas = document.createElement('canvas'); canvas.width = 112; canvas.height = 64; canvas.getContext('2d').drawImage(probe, 0, 0, canvas.width, canvas.height); asset.thumbnailUrl = canvas.toDataURL('image/jpeg', .7); } catch {}
          renderMediaLibrary(); releaseProbe();
        }, { once: true });
        if (probe.readyState >= 2) {
          try { const canvas = document.createElement('canvas'); canvas.width = 112; canvas.height = 64; canvas.getContext('2d').drawImage(probe, 0, 0, canvas.width, canvas.height); asset.thumbnailUrl = canvas.toDataURL('image/jpeg', .7); } catch {}
          renderMediaLibrary(); releaseProbe();
        }
      }
      if (kind === 'video') clampVideoAssetClips(asset);
      renderMediaLibrary(); renderTextTimeline(); scheduleSave();
      if (kind === 'audio') releaseProbe();
    }, { once: true });
    probe.addEventListener('error', releaseProbe, { once: true });
    if (kind === 'audio') buildAssetWaveform(asset);
  }
  renderMediaLibrary();
  return asset;
}

async function buildAssetWaveform(asset) {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (asset.file.size > 18 * 1024 * 1024 || !AudioContextType) return;
  let context;
  try {
    context = musicAudioContext || new AudioContextType();
    const buffer = await context.decodeAudioData(await asset.file.arrayBuffer());
    const channel = buffer.getChannelData(0), bars = 72, stride = Math.max(1, Math.floor(channel.length / bars));
    asset.waveform = Array.from({ length: bars }, (_, index) => {
      let peak = 0;
      for (let sample = index * stride; sample < Math.min(channel.length, (index + 1) * stride); sample += 1) peak = Math.max(peak, Math.abs(channel[sample]));
      return Math.max(.12, peak);
    });
    musicClips.filter(clip => clip.assetId === asset.id).forEach(clip => { clip.waveform = asset.waveform; });
    renderMediaLibrary();
    renderTextTimeline(); scheduleSave();
  } catch {} finally {
    if (context && context !== musicAudioContext) await context.close().catch(() => {});
  }
}

function selectMediaAsset(id) {
  selectedMediaAssetId = id;
  renderMediaLibrary();
}

function renderMediaLibrary() {
  const library = $('#mediaLibrary');
  if (!library) return;
  library.replaceChildren();
  $('#mediaAssetCount').textContent = String(mediaAssets.length);
  $('#mediaEmpty').hidden = mediaAssets.length > 0;
  mediaAssets.forEach(asset => {
    const card = document.createElement('article');
    card.className = `media-library-item${asset.id === selectedMediaAssetId ? ' selected' : ''}`;
    card.draggable = true; card.dataset.assetId = asset.id;
    card.addEventListener('click', event => { if (!event.target.closest('button')) selectMediaAsset(asset.id); });
    card.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', asset.id); event.dataTransfer.setData('application/x-neura-media', asset.id); event.dataTransfer.effectAllowed = 'copy'; });
    const thumb = document.createElement('div'); thumb.className = `media-library-thumb ${asset.kind}-thumb`;
    if (asset.thumbnailUrl || (asset.kind === 'image' && asset.url)) {
      const image = document.createElement('img'); image.src = asset.thumbnailUrl || asset.url; image.alt = ''; thumb.appendChild(image);
      if (asset.kind === 'video') { const badge = document.createElement('span'); badge.className = 'media-kind-badge'; badge.textContent = '\u25b6'; thumb.appendChild(badge); }
    } else thumb.textContent = asset.kind === 'audio' ? '\u266b' : '\u25b6';
    const info = document.createElement('span'); info.className = 'media-library-copy';
    const name = document.createElement('strong'); name.textContent = asset.name;
    const meta = document.createElement('small'); meta.textContent = `${asset.kind[0].toUpperCase()}${asset.kind.slice(1)}${asset.duration ? ` · ${formatDuration(asset.duration)}` : ''}`;
    info.append(name, meta);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'media-library-remove'; remove.textContent = '\u00d7'; remove.title = `Remove ${asset.name} from library`;
    remove.addEventListener('click', event => { event.stopPropagation(); removeMediaAsset(asset.id); });
    card.append(thumb, info, remove); library.appendChild(card);
  });
  const selected = mediaAssets.find(asset => asset.id === selectedMediaAssetId);
  const details = $('#mediaSelectionInfo'), addButton = $('#addSelectedMediaToTimeline');
  details.hidden = !selected;
  addButton.disabled = !selected;
  if (selected) {
    $('#selectedMediaName').textContent = selected.name;
    $('#selectedMediaMeta').textContent = `${selected.type} · ${selected.duration ? formatDuration(selected.duration) : 'Reading duration…'}`;
    $('#imageDurationControl').hidden = selected.kind !== 'image';
    const preview = $('#selectedMediaPreview');
    preview.hidden = !selected.thumbnailUrl && selected.kind !== 'image';
    if (!preview.hidden) preview.src = selected.thumbnailUrl || selected.url;
  }
}

function mediaTrackAppendTime(trackId, duration) {
  const sameTrack = timelineMediaClips.filter(clip => clip.trackId === trackId);
  if (sameTrack.length) return Math.max(...sameTrack.map(clip => clip.end));
  return Math.max(0, timelineCursorTime);
}

function addMediaAssetToTimeline(assetId, trackId = null, start = null) {
  const asset = mediaAssets.find(item => item.id === assetId);
  if (!asset) return;
  if (asset.kind === 'audio') {
    const preferred = timelineLanes.find(item => item.id === trackId && item.type === 'music' && !timelineLocks.has(item.id));
    const lane = preferred || timelineLanes.find(item => item.type === 'music' && !timelineLocks.has(item.id)) || createTimelineLane('music');
    const at = Number.isFinite(start) ? start : Math.max(timelineCursorTime, ...musicClips.map(item => item.end ?? item.start));
    loadMusic(asset.file, at, null, 0, null, lane.id, asset.id, asset.waveform);
    selectedMediaAssetId = asset.id; renderMediaLibrary(); renderTimelinePreviewAt(timelineCursorTime); return;
  }
  const preferred = timelineLanes.find(item => item.id === trackId && item.type === 'media' && !timelineLocks.has(item.id));
  const lane = preferred || timelineLanes.find(item => item.type === 'media' && !timelineLocks.has(item.id)) || createTimelineLane('media');
  const clipDuration = asset.kind === 'image' ? defaultImageClipDuration : asset.duration || 5;
  const at = Number.isFinite(start) ? start : mediaTrackAppendTime(lane.id, clipDuration);
  const clip = {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId: asset.id, start: Math.max(0, at), end: Math.max(0, at) + clipDuration,
    sourceOffset: 0, trackId: lane.id, isPrimary: false, scale: 1,
    autoDuration: asset.kind === 'video' && !asset.duration
  };
  timelineMediaClips.push(clip); selectedTimelineMediaId = clip.id;
  selectedMusicClipId = null; selectedEffectClipId = null; syncEffectProperties();
  renderTextTimeline(); renderTimelinePreviewAt(timelineCursorTime); scheduleSave(); queueHistory();
}

function removeMediaAsset(id) {
  const asset = mediaAssets.find(item => item.id === id);
  if (!asset) return;
  timelineMediaClips = timelineMediaClips.filter(clip => clip.assetId !== id);
  musicClips.filter(clip => clip.assetId === id).forEach(clip => removeMusicClip(clip.id, false));
  if (timelineClipVideo.dataset.assetId === id) { pausePreviewElement(timelineClipVideo); timelineClipVideo.removeAttribute('src'); delete timelineClipVideo.dataset.assetId; timelineClipVideo.load(); }
  if (timelineClipImage.src === asset.url) { timelineClipImage.removeAttribute('src'); timelineClipImage.hidden = true; }
  mediaAssets = mediaAssets.filter(item => item.id !== id);
  URL.revokeObjectURL(asset.url);
  if (selectedMediaAssetId === id) { selectedMediaAssetId = null; $('#selectedMediaPreview').removeAttribute('src'); }
  if (selectedTimelineMediaId && !timelineMediaClips.some(clip => clip.id === selectedTimelineMediaId)) selectedTimelineMediaId = null;
  pruneEmptyTimelineLanes(); renderMediaLibrary(); renderTextTimeline(); renderTimelinePreviewAt(timelineCursorTime); scheduleSave(); queueHistory();
}

$('#addSelectedMediaToTimeline').addEventListener('click', () => {
  const imageDurationInput = $('#imageClipDuration');
  defaultImageClipDuration = Math.max(.2, Math.min(60, Number(imageDurationInput.value) || 5));
  addMediaAssetToTimeline(selectedMediaAssetId);
});
$('#imageClipDuration').addEventListener('change', event => { defaultImageClipDuration = Math.max(.2, Math.min(60, Number(event.target.value) || 5)); event.target.value = String(defaultImageClipDuration); scheduleSave(); queueHistory(); });

function syncMediaClipProperties() {
  const clip = timelineMediaClips.find(item => item.id === selectedTimelineMediaId);
  const music = musicClips.find(item => item.id === selectedMusicClipId);
  const panel = $('#mediaClipProperties');
  panel.hidden = !clip && !music;
  if (clip) {
    const asset = mediaAssets.find(item => item.id === clip.assetId);
    $('#mediaClipSelectedName').textContent = asset?.name || 'Missing media';
    $('#mediaClipStart').value = clip.start.toFixed(1);
    $('#mediaClipEnd').value = clip.end.toFixed(1);
    $('#mediaClipEnd').min = String((clip.start + .1).toFixed(1));
  } else if (music) {
    const end = music.end ?? (music.start + (Number(music.audio.duration) || .1) - music.offset);
    $('#mediaClipSelectedName').textContent = music.file.name;
    $('#mediaClipStart').value = music.start.toFixed(1);
    $('#mediaClipEnd').value = end.toFixed(1);
    $('#mediaClipEnd').min = String((music.start + .1).toFixed(1));
  }
}

function updateSelectedMediaClipFromFields() {
  const clip = timelineMediaClips.find(item => item.id === selectedTimelineMediaId);
  const music = musicClips.find(item => item.id === selectedMusicClipId);
  const start = Number($('#mediaClipStart').value), end = Number($('#mediaClipEnd').value);
  if (!clip && !music) return;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return syncMediaClipProperties();
  if (music) {
    const delta = start - music.start;
    music.offset = Math.max(0, Math.min(music.audio.duration || 0, music.offset + delta));
    music.start = start;
    music.end = Math.min(end, start + Math.max(.1, (music.audio.duration || end - start) - music.offset));
    renderTextTimeline(); syncMusicPlayback(); scheduleSave(); queueHistory(); return;
  }
  clip.sourceOffset = Math.max(0, (clip.sourceOffset || 0) + start - clip.start);
  clip.start = start;
  const asset = mediaAssets.find(item => item.id === clip.assetId);
  const sourceLimit = asset?.kind === 'video' && asset.duration ? start + Math.max(.1, asset.duration - clip.sourceOffset) : Infinity;
  clip.end = Math.min(end, sourceLimit); clip.autoDuration = false;
  renderTextTimeline(); renderTimelinePreviewAt(timelineCursorTime); scheduleSave(); queueHistory();
}

$('#mediaClipStart').addEventListener('change', updateSelectedMediaClipFromFields);
$('#mediaClipEnd').addEventListener('change', updateSelectedMediaClipFromFields);
$('#deleteMediaClip').addEventListener('click', deleteSelectedMediaClip);
$('#splitMediaClip').addEventListener('click', splitSelectedMediaClip);

function deleteSelectedMediaClip() {
  if (selectedMusicClipId && musicClips.some(clip => clip.id === selectedMusicClipId)) {
    const id = selectedMusicClipId; selectedMusicClipId = null; removeMusicClip(id); queueHistory(); return;
  }
  if (!selectedTimelineMediaId) return;
  timelineMediaClips = timelineMediaClips.filter(clip => clip.id !== selectedTimelineMediaId);
  selectedTimelineMediaId = null;
  pruneEmptyTimelineLanes(); renderTextTimeline(); renderTimelinePreviewAt(timelineCursorTime); scheduleSave(); queueHistory();
}

function splitSelectedMediaClip() {
  const clip = timelineMediaClips.find(item => item.id === selectedTimelineMediaId);
  const music = musicClips.find(item => item.id === selectedMusicClipId);
  const splitTime = timelineCursorTime;
  if (!clip && music) {
    const end = music.end ?? (music.start + (Number(music.audio.duration) || 0) - music.offset);
    if (splitTime <= music.start + .1 || splitTime >= end - .1) return showToast('Move the playhead inside the selected clip to split it.');
    music.end = splitTime;
    const right = loadMusic(music.file, splitTime, end, music.offset + splitTime - music.start, null, music.trackId, music.assetId, music.waveform);
    if (right) selectedMusicClipId = right.id;
    renderTextTimeline(); scheduleSave(); queueHistory(); return;
  }
  if (!clip || splitTime <= clip.start + .1 || splitTime >= clip.end - .1) return showToast('Move the playhead inside the selected clip to split it.');
  const right = { ...clip, id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, start: splitTime, sourceOffset: (clip.sourceOffset || 0) + splitTime - clip.start, autoDuration: false };
  clip.end = splitTime;
  timelineMediaClips.push(right); selectedTimelineMediaId = right.id;
  renderTextTimeline(); renderTimelinePreviewAt(timelineCursorTime); scheduleSave(); queueHistory();
}

function loadFile(file, reset = true) {
  if (!file || !['image','video'].includes(getMediaKind(file))) return showToast('Choose an image or video file to get started.');
  if (file.size > 500 * 1024 * 1024) return showToast('That file is over the 500 MB limit.');
  pauseTimelinePlayback();
  photo.getAnimations().forEach(animation => animation.cancel());
  videoPreview.getAnimations().forEach(animation => animation.cancel());
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalFile = file;
  isVideo = getMediaKind(file) === 'video';
  if (reset) {
    pausePreviewElement(timelineClipVideo); timelineClipVideo.removeAttribute('src'); delete timelineClipVideo.dataset.assetId; timelineClipVideo.load();
    timelineClipImage.removeAttribute('src'); timelineClipImage.hidden = true;
    $('#selectedMediaPreview').removeAttribute('src');
    mediaAssets.forEach(asset => URL.revokeObjectURL(asset.url));
    mediaAssets = []; timelineMediaClips = []; selectedMediaAssetId = null; selectedTimelineMediaId = null;
    timelineGuideTime = null;
    timelineCursorTime = 0;
    clearMusic();
    timelineLanes = normalizeTimelineLanes(null);
    mediaTrackId = getDefaultTimelineLane('media').id;
    timelineLocks = new Set();
    effectClips = []; selectedEffectClipId = null;
    crop = { x: 0, y: 0, width: 1, height: 1 };
    rotation = 0; flipped = false;
    trimRange = { start: 0, end: null };
    splitRange = { start: 0, end: null };
    splitPoints = [];
    selectedSegment = null;
    videoLook = 'original';
    videoEffect = 'none'; videoTransition = 'none';
    mediaMotion = { effect: 'none', phase: 'entry' };
    muteOriginalAudio = false;
    videoPreview.muted = false;
    $('#muteOriginalAudio').checked = false;
    videoTitle = '';
    videoTitlePosition = 'bottom';
    textItems = [];
    selectedTextId = null;
    $('#videoLook').value = videoLook;
    $('#videoEffect').value = videoEffect; $('#videoTransition').value = videoTransition;
    $('#videoTitle').value = videoTitle;
    $('#videoTitlePosition').value = videoTitlePosition;
    applyCropPreview();
  }
  originalUrl = URL.createObjectURL(file);
  const primaryAsset = registerMediaAsset(file);
  let primaryClip = timelineMediaClips.find(clip => clip.assetId === primaryAsset.id && clip.isPrimary);
  if (!primaryClip) {
    primaryClip = { id: `media-primary-${Date.now()}`, assetId: primaryAsset.id, start: 0, end: primaryAsset.duration || (isVideo ? 0 : defaultImageClipDuration), sourceOffset: 0, trackId: mediaTrackId, isPrimary: true, autoDuration: isVideo, scale: 1 };
    timelineMediaClips.push(primaryClip);
  }
  if (!selectedTimelineMediaId || reset) selectedTimelineMediaId = primaryClip.id;
  if (isVideo) {
    photo.removeAttribute('src'); photo.hidden = true;
    videoPreview.src = originalUrl; videoPreview.hidden = false;
    applyVideoLook();
    videoPreview.onloadedmetadata = () => {
      $('#imageDimensions').textContent = `${videoPreview.videoWidth} × ${videoPreview.videoHeight} · ${formatDuration(videoPreview.duration)}`;
      primaryAsset.duration = videoPreview.duration;
      clampVideoAssetClips(primaryAsset);
      if (trimRange.end === null) trimRange.end = videoPreview.duration;
      if (splitRange.end === null) splitRange = { ...trimRange };
      syncTrimInputs();
      renderSplitSegments();
      renderTextItems();
      renderMediaLibrary(); renderTextTimeline();
      updateVideoFadePreview();
      renderTimelinePreviewAt(timelineCursorTime);
    };
    videoPreview.load();
  } else {
    videoPreview.pause(); videoPreview.removeAttribute('src'); videoPreview.hidden = true;
    videoPreview.style.filter = 'none';
    photo.src = originalUrl; photo.hidden = false;
    photo.onload = () => { $('#imageDimensions').textContent = `${photo.naturalWidth} × ${photo.naturalHeight}`; renderTextItems(); renderTextTimeline(); if (mediaMotion.effect !== 'none') previewStaticMotion(photo, mediaMotion.effect, mediaMotion.phase); };
  }
  $('#emptyState').hidden = true;
  $('#compareButton').hidden = isVideo;
  $('#mediaEmpty').hidden = true;
  $('#mediaItem').hidden = false;
  $('#thumb').hidden = isVideo;
  $('#videoThumb').hidden = !isVideo;
  if (!isVideo) $('#thumb').src = originalUrl;
  $('#thumbName').textContent = file.name.length > 23 ? file.name.slice(0, 20) + '…' : file.name;
  $('#projectTitle').textContent = file.name.replace(/\.[^.]+$/, '');
  document.querySelector('.inspector').classList.toggle('video-mode', isVideo);
  $('#videoNotice').hidden = !isVideo;
  syncVideoTitlePreview();
  $('#adjustPanel').hidden = isVideo;
  $('#presetsPanel').hidden = isVideo;
  $$('.inspector-tabs .tab').forEach(tab => tab.hidden = isVideo);
  if (isVideo) $('#cropToolbar').hidden = true;
  if (isVideo) { applyVideoLook(); updateVideoFadePreview(); }
  else { videoPreview.style.opacity = '1'; $('#videoTitlePreview').style.opacity = '1'; $('#textLayer').style.opacity = '1'; stage.classList.remove('video-fading'); }
  renderTextItems();
  renderTextTimeline();
  renderTimelinePreviewAt(timelineCursorTime);
  $('#exportButton').firstChild.textContent = isVideo ? 'Download video ' : 'Export image ';
  if (reset) resetAdjustments(false);
  else applyCropPreview();
  if (reset) resetHistory();
  scheduleSave();
}

fileInput.addEventListener('change', event => {
  const selectedFiles = [...event.target.files];
  const tooLarge = selectedFiles.filter(file => file.size > 500 * 1024 * 1024);
  if (tooLarge.length) showToast(`${tooLarge.length} file${tooLarge.length === 1 ? '' : 's'} over the 500 MB limit were skipped.`);
  const files = selectedFiles.filter(file => file.size <= 500 * 1024 * 1024 && getMediaKind(file));
  if (!files.length) { event.target.value = ''; return showToast('Choose image, video, or audio files.'); }
  const primary = files.find(file => ['image','video'].includes(getMediaKind(file)));
  if (projectImportMode === 'project' && primary) loadFile(primary, true);
  else if (!originalFile && primary) loadFile(primary, mediaAssets.length === 0 && musicClips.length === 0);
  files.forEach(file => registerMediaAsset(file));
  selectedMediaAssetId = (primary && mediaAssets.find(asset => asset.file === primary)?.id) || mediaAssets.at(-1)?.id || null;
  renderMediaLibrary(); renderTextTimeline(); scheduleSave(); queueHistory();
  event.target.value = '';
});
$('#removeMedia').addEventListener('click', () => {
  pauseTimelinePlayback();
  clearMusic();
  $('#selectedMediaPreview').removeAttribute('src');
  mediaAssets.forEach(asset => URL.revokeObjectURL(asset.url));
  mediaAssets = []; timelineMediaClips = []; selectedMediaAssetId = null; selectedTimelineMediaId = null; timelineCursorTime = 0;
  timelineLanes = normalizeTimelineLanes(null); mediaTrackId = getDefaultTimelineLane('media').id; timelineLocks.clear();
  timelineClipVideo.removeAttribute('src'); delete timelineClipVideo.dataset.assetId; timelineClipVideo.load(); timelineClipVideo.hidden = true;
  timelineClipImage.removeAttribute('src'); timelineClipImage.hidden = true;
  photo.getAnimations().forEach(animation => animation.cancel());
  videoPreview.getAnimations().forEach(animation => animation.cancel());
  muteOriginalAudio = false;
  videoPreview.muted = false;
  $('#muteOriginalAudio').checked = false;
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = ''; originalFile = null; isVideo = false; photo.removeAttribute('src'); photo.hidden = true;
  videoPreview.pause(); videoPreview.removeAttribute('src'); videoPreview.load(); videoPreview.hidden = true;
  $('#emptyState').hidden = false; $('#compareButton').hidden = true; $('#mediaItem').hidden = true; $('#mediaEmpty').hidden = false;
  $('#projectTitle').textContent = 'Untitled project'; $('#imageDimensions').textContent = 'No image loaded'; resetAdjustments();
  document.querySelector('.inspector').classList.remove('video-mode'); $('#videoNotice').hidden = true;
  $('#adjustPanel').hidden = false; $('#presetsPanel').hidden = true; $$('.inspector-tabs .tab').forEach(tab => tab.hidden = false);
  $('#exportButton').firstChild.textContent = 'Export image ';
  crop = { x: 0, y: 0, width: 1, height: 1 }; rotation = 0; flipped = false; applyCropPreview(); $('#cropToolbar').hidden = true;
  trimRange = { start: 0, end: null };
  videoEffect = 'none'; videoTransition = 'none';
  mediaMotion = { effect: 'none', phase: 'entry' };
  $('#videoEffect').value = videoEffect; $('#videoTransition').value = videoTransition;
  videoPreview.style.opacity = '1'; $('#videoTitlePreview').style.opacity = '1'; $('#textLayer').style.opacity = '1'; stage.classList.remove('video-fading');
  splitRange = { start: 0, end: null }; splitPoints = []; selectedSegment = null;
  renderSplitSegments();
  videoTitle = ''; videoTitlePosition = 'bottom';
  effectClips = []; selectedEffectClipId = null;
  textItems = [];
  selectedTextId = null;
  $('#videoTitle').value = videoTitle; $('#videoTitlePosition').value = videoTitlePosition;
  syncVideoTitlePreview();
  applyVideoLook();
  renderTextItems();
  renderMediaLibrary(); renderTextTimeline();
  resetHistory();
  scheduleSave();
});

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return 'video';
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${remainder}`;
}

function syncTrimInputs() {
  const start = $('#trimStart');
  const end = $('#trimEnd');
  const duration = Number.isFinite(videoPreview.duration) ? videoPreview.duration : 0;
  start.max = String(duration);
  end.max = String(duration);
  start.value = String(Math.min(trimRange.start, duration));
  end.value = String(Math.min(trimRange.end ?? duration, duration));
  trimRange.start = Number(start.value);
  trimRange.end = Number(end.value);
}

function getVideoSegments() {
  if (splitRange.end === null || splitRange.end <= splitRange.start) return [];
  const boundaries = [splitRange.start, ...splitPoints, splitRange.end];
  return boundaries.slice(0, -1).map((start, index) => ({ start, end: boundaries[index + 1] }));
}

function renderSplitSegments() {
  const list = $('#splitList');
  const segments = getVideoSegments();
  list.replaceChildren();
  list.hidden = !isVideo || splitPoints.length === 0;
  segments.forEach((segment, index) => {
    const row = document.createElement('div');
    row.className = 'split-segment';
    const select = document.createElement('button');
    select.type = 'button';
    select.className = `segment-select${selectedSegment === index ? ' active' : ''}`;
    select.textContent = `Clip ${index + 1} · ${formatDuration(segment.start)}–${formatDuration(segment.end)}`;
    select.addEventListener('click', () => {
      selectedSegment = index;
      renderSplitSegments();
      updateVideoFadePreview();
      $('#trimStatus').textContent = `Clip ${index + 1} selected for export.`;
      scheduleSave(); queueHistory();
    });
    row.appendChild(select);
    if (index < splitPoints.length) {
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'segment-remove'; remove.textContent = '×';
      remove.title = 'Remove this split';
      remove.addEventListener('click', () => {
        splitPoints.splice(index, 1); selectedSegment = null;
        renderSplitSegments(); updateVideoFadePreview(); scheduleSave(); queueHistory();
      });
      row.appendChild(remove);
    }
    list.appendChild(row);
  });
}

$('#splitAtPlayhead').addEventListener('click', () => {
  if (!isVideo || !Number.isFinite(videoPreview.currentTime)) return;
  const start = Number($('#trimStart').value);
  const end = Number($('#trimEnd').value);
  const point = videoPreview.currentTime;
  const boundaries = [start, ...splitPoints, end];
  if (point <= start + .15 || point >= end - .15 || boundaries.some(boundary => Math.abs(boundary - point) < .15)) {
    $('#trimStatus').textContent = 'Pause inside a clip to place a split.';
    return;
  }
  splitRange = { start, end };
  splitPoints.push(point);
  splitPoints.sort((a, b) => a - b);
  selectedSegment = null;
  renderSplitSegments();
  updateVideoFadePreview();
  $('#trimStatus').textContent = `Split added at ${formatDuration(point)}.`;
  scheduleSave(); queueHistory();
});

['#trimStart', '#trimEnd'].forEach(selector => $(selector).addEventListener('change', () => {
  const start = Number($('#trimStart').value);
  const end = Number($('#trimEnd').value);
  const duration = videoPreview.duration;
  if (start < 0 || end > duration || end <= start) {
    $('#trimStatus').textContent = 'Choose an end time after the start, within the clip.';
    return;
  }
  trimRange = { start, end };
  splitRange = { start, end };
  splitPoints = [];
  selectedSegment = null;
  renderSplitSegments();
  updateVideoFadePreview();
  $('#trimStatus').textContent = 'Exports as WebM in this browser.';
  scheduleSave();
  queueHistory();
}));

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable'));
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('neura-photography', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('workspace')) db.createObjectStore('workspace');
      if (!db.objectStoreNames.contains('musicLibrary')) db.createObjectStore('musicLibrary', { keyPath: 'id' });
    };
    request.onblocked = () => showToast('Close another Neura Photography tab to finish the music library update.');
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        databasePromise = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error);
    };
  });
  return databasePromise;
}

function musicAssetId(file) {
  return `${file.name}::${file.size}::${file.lastModified || 0}`;
}

function formatMusicDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function readMusicDuration(file) {
  return new Promise(resolve => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    let finished = false;
    const timeout = setTimeout(() => finish(null), 6000);
    const finish = duration => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : null);
    };
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => finish(audio.duration), { once: true });
    audio.addEventListener('error', () => finish(null), { once: true });
    audio.src = url;
  });
}

function decodeMusicTag(bytes, encoding = 'utf-8') {
  try {
    return new TextDecoder(encoding).decode(bytes).replace(/[\u0000\uFFFE\uFEFF]/g, '').trim();
  } catch (error) {
    return '';
  }
}

function parseId3Metadata(bytes) {
  const tags = {};
  if (bytes.length >= 10 && String.fromCharCode(...bytes.subarray(0, 3)) === 'ID3') {
    const version = bytes[3];
    const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    const end = Math.min(bytes.length, 10 + tagSize);
    let offset = 10;
    while (offset + 10 <= end) {
      const frame = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      if (!/^[A-Z0-9]{4}$/.test(frame)) break;
      const size = version === 4
        ? ((bytes[offset + 4] & 0x7f) << 21) | ((bytes[offset + 5] & 0x7f) << 14) | ((bytes[offset + 6] & 0x7f) << 7) | (bytes[offset + 7] & 0x7f)
        : (bytes[offset + 4] * 0x1000000) + (bytes[offset + 5] << 16) + (bytes[offset + 6] << 8) + bytes[offset + 7];
      if (!size || offset + 10 + size > end) break;
      const property = ({ TIT2: 'title', TPE1: 'artist', TALB: 'album' })[frame];
      if (property && size > 1) {
        const encodingByte = bytes[offset + 10];
        const textEncoding = encodingByte === 0 ? 'windows-1252' : encodingByte === 1 ? 'utf-16' : encodingByte === 2 ? 'utf-16be' : 'utf-8';
        tags[property] = decodeMusicTag(bytes.subarray(offset + 11, offset + 10 + size), textEncoding);
      }
      offset += 10 + size;
    }
  }
  return tags;
}

function parseVorbisCommentData(bytes, offset) {
  const tags = {};
  if (offset < 0 || offset + 8 > bytes.length) return tags;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const vendorLength = view.getUint32(offset, true); offset += 4 + vendorLength;
  if (offset + 4 > bytes.length) return tags;
  const commentCount = Math.min(view.getUint32(offset, true), 1000); offset += 4;
  for (let index = 0; index < commentCount && offset + 4 <= bytes.length; index++) {
    const length = view.getUint32(offset, true); offset += 4;
    if (offset + length > bytes.length) break;
    const comment = decodeMusicTag(bytes.subarray(offset, offset + length));
    const split = comment.indexOf('=');
    if (split > 0) {
      const key = comment.slice(0, split).toLowerCase();
      const property = ({ title: 'title', artist: 'artist', album: 'album' })[key];
      if (property && !tags[property]) tags[property] = comment.slice(split + 1).trim();
    }
    offset += length;
  }
  return tags;
}

function parseOggComments(bytes, signature) {
  const marker = new TextEncoder().encode(signature);
  for (let index = 0; index <= bytes.length - marker.length; index++) {
    if (!marker.every((value, markerIndex) => bytes[index + markerIndex] === value)) continue;
    if (signature === 'vorbis' && (index === 0 || bytes[index - 1] !== 3)) continue;
    return parseVorbisCommentData(bytes, index + marker.length);
  }
  return {};
}

function parseFlacComments(bytes) {
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'fLaC') return {};
  let offset = 4;
  while (offset + 4 <= bytes.length) {
    const header = bytes[offset];
    const type = header & 0x7f;
    const length = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const bodyOffset = offset + 4;
    if (bodyOffset + length > bytes.length) return {};
    if (type === 4) return parseVorbisCommentData(bytes.subarray(0, bodyOffset + length), bodyOffset);
    offset = bodyOffset + length;
    if (header & 0x80) break;
  }
  return {};
}

function parseWavMetadata(bytes) {
  const tags = {};
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF') return tags;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunk = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    const end = Math.min(bytes.length, offset + 8 + size);
    if (chunk === 'LIST' && size >= 4 && String.fromCharCode(...bytes.subarray(offset + 8, offset + 12)) === 'INFO') {
      let infoOffset = offset + 12;
      while (infoOffset + 8 <= end) {
        const id = String.fromCharCode(...bytes.subarray(infoOffset, infoOffset + 4));
        const valueSize = view.getUint32(infoOffset + 4, true);
        if (infoOffset + 8 + valueSize > end) break;
        const property = ({ INAM: 'title', IART: 'artist', IPRD: 'album' })[id];
        if (property) tags[property] = decodeMusicTag(bytes.subarray(infoOffset + 8, infoOffset + 8 + valueSize), 'windows-1252');
        infoOffset += 8 + valueSize + (valueSize % 2);
      }
      break;
    }
    if (!size || end <= offset) break;
    offset = end + (size % 2);
  }
  return tags;
}

async function readMusicMetadata(file) {
  try {
    const head = new Uint8Array(await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer());
    const tags = parseId3Metadata(head);
    const riffTags = parseWavMetadata(head);
    const flacTags = parseFlacComments(head);
    const oggTags = { ...parseOggComments(head, 'vorbis'), ...parseOggComments(head, 'OpusTags') };
    const parsed = { ...flacTags, ...oggTags, ...riffTags, ...tags };
    if (!parsed.title && !parsed.artist && file.size >= 128) {
      const tail = new Uint8Array(await file.slice(-128).arrayBuffer());
      if (String.fromCharCode(...tail.subarray(0, 3)) === 'TAG') {
        parsed.title ||= decodeMusicTag(tail.subarray(3, 33), 'windows-1252');
        parsed.artist ||= decodeMusicTag(tail.subarray(33, 63), 'windows-1252');
        parsed.album ||= decodeMusicTag(tail.subarray(63, 93), 'windows-1252');
      }
    }
    return parsed;
  } catch (error) {
    return {};
  }
}

async function saveMusicLibraryAsset(file) {
  const db = await openDatabase();
  const metadata = await readMusicMetadata(file);
  const track = {
    id: musicAssetId(file),
    name: file.name,
    title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
    type: file.type || 'audio/mpeg',
    size: file.size,
    duration: null,
    artist: metadata.artist || '',
    album: metadata.album || '',
    lastModified: file.lastModified || 0,
    addedAt: Date.now(),
    file
  };
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('musicLibrary', 'readwrite');
    transaction.objectStore('musicLibrary').put(track);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  await renderMusicLibrary();
  const duration = await readMusicDuration(file);
  if (!Number.isFinite(duration)) return;
  track.duration = duration;
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('musicLibrary', 'readwrite');
    transaction.objectStore('musicLibrary').put(track);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  await renderMusicLibrary();
}

async function renderMusicLibrary() {
  const list = $('#musicLibraryTracks');
  if (!list) return;
  list.replaceChildren();
  const empty = document.createElement('p');
  empty.className = 'music-library-empty';
  empty.textContent = 'No saved tracks yet. Add a downloaded audio file to build your library.';
  list.appendChild(empty);
  try {
    const db = await openDatabase();
    const tracks = await new Promise((resolve, reject) => {
      const request = db.transaction('musicLibrary').objectStore('musicLibrary').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    list.replaceChildren();
    if (!tracks.length) {
      list.appendChild(empty);
      return;
    }
    tracks.sort((a, b) => b.addedAt - a.addedAt).forEach(track => {
      const row = document.createElement('article');
      row.className = 'music-track-card';
      const cover = document.createElement('div');
      cover.className = 'music-track-cover';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'music-track-preview';
      preview.setAttribute('aria-label', `Preview ${track.name}`);
      preview.addEventListener('click', () => previewLibraryTrack(track, preview));
      cover.appendChild(preview);
      const details = document.createElement('div');
      details.className = 'music-track-details';
      const name = document.createElement('strong');
      name.textContent = track.title || track.name.replace(/\.[^.]+$/, '');
      const artist = document.createElement('small');
      artist.textContent = [track.artist, track.album].filter(Boolean).join(' · ') || 'From your device';
      details.append(name, artist);
      const waveform = document.createElement('div');
      waveform.className = 'music-track-waveform';
      waveform.setAttribute('aria-hidden', 'true');
      let seed = [...track.name].reduce((value, letter) => ((value * 33) ^ letter.charCodeAt(0)) >>> 0, 5381);
      for (let index = 0; index < 52; index++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const bar = document.createElement('i');
        bar.style.height = `${14 + (seed % 83)}%`;
        waveform.appendChild(bar);
      }
      const duration = document.createElement('span');
      duration.className = 'music-track-duration';
      duration.textContent = Number.isFinite(track.duration) ? formatMusicDuration(track.duration) : 'Audio';
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'music-track-add';
      use.textContent = 'Add';
      use.title = 'Add this track to the timeline';
      use.addEventListener('click', () => {
        const file = new File([track.file], track.name, { type: track.type, lastModified: track.lastModified });
        loadMusic(file);
        use.textContent = 'Added';
        use.disabled = true;
      });
      row.append(cover, details, waveform, duration, use);
      list.appendChild(row);
    });
  } catch (error) {
    empty.textContent = 'Could not load saved tracks from this browser.';
  }
}

let libraryPreviewAudio = null;
let libraryPreviewUrl = '';
let libraryPreviewButton = null;

function stopLibraryPreview() {
  if (libraryPreviewAudio) {
    libraryPreviewAudio.pause();
    libraryPreviewAudio.removeAttribute('src');
    libraryPreviewAudio.load();
  }
  if (libraryPreviewUrl) URL.revokeObjectURL(libraryPreviewUrl);
  if (libraryPreviewButton) {
    libraryPreviewButton.classList.remove('playing');
    libraryPreviewButton.setAttribute('aria-label', 'Preview track');
  }
  libraryPreviewAudio = null;
  libraryPreviewUrl = '';
  libraryPreviewButton = null;
}

function previewLibraryTrack(track, button) {
  if (libraryPreviewButton === button && libraryPreviewAudio && !libraryPreviewAudio.paused) {
    stopLibraryPreview();
    return;
  }
  stopLibraryPreview();
  libraryPreviewUrl = URL.createObjectURL(track.file);
  libraryPreviewAudio = new Audio(libraryPreviewUrl);
  libraryPreviewButton = button;
  button.classList.add('playing');
  button.setAttribute('aria-label', `Pause ${track.name}`);
  libraryPreviewAudio.addEventListener('ended', stopLibraryPreview, { once: true });
  libraryPreviewAudio.play().catch(() => {
    stopLibraryPreview();
    showToast('Could not preview this audio file.');
  });
}

function setSaveStatus(message, failed = false) {
  const status = $('#savedStatus');
  status.lastChild.textContent = ` ${message}`;
  status.classList.toggle('save-error', failed);
}

function scheduleSave() {
  if (isRestoring) return;
  setSaveStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveWorkspace, 450);
}

async function saveWorkspace() {
  if (isRestoring) return;
  const record = {
    name: originalFile?.name || '',
    type: originalFile?.type || '',
    image: originalFile || null,
    music: musicClips[0]?.file || null,
    musicName: musicClips[0]?.file.name || '',
    musicStart: musicClips[0]?.start ?? 0,
    musicEnd: musicClips[0]?.end ?? null,
    musicOffset: musicClips[0]?.offset ?? 0,
    musicTracks: musicClips.map(({ id, file, start, end, offset, trackId, assetId, waveform }) => ({ id, file, name: file.name, type: file.type, start, end, offset, trackId, assetId, waveform })),
    mediaAssets: mediaAssets.map(({ id, file, name, type, kind, duration, thumbnailUrl, waveform, width, height }) => ({ id, file, name, type, kind, duration, thumbnailUrl: thumbnailUrl.startsWith('data:') ? thumbnailUrl : '', waveform, width, height })),
    timelineMediaClips: timelineMediaClips.map(clip => ({ ...clip })),
    timelineLanes: timelineLanes.map(lane => ({ ...lane })),
    mediaTrackId,
    timelineGuideTime,
    timelineCursorTime,
    selectedMediaAssetId,
    selectedTimelineMediaId,
    selectedMusicClipId,
    defaultImageClipDuration,
    values: { ...values },
    crop: { ...crop },
    rotation,
    flipped,
    trimRange: { ...trimRange },
    splitRange: { ...splitRange },
    splitPoints: [...splitPoints],
    selectedSegment,
    videoLook,
    videoEffect,
    videoTransition,
    mediaMotion: { ...mediaMotion },
    muteOriginalAudio,
    videoTitle,
    videoTitlePosition,
    effectClips: effectClips.map(item => ({ ...item })),
    textItems: textItems.map(item => ({ ...item, keyframes: (item.keyframes || []).map(frame => ({ ...frame })) }))
  };
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('workspace', 'readwrite');
      transaction.objectStore('workspace').put(record, 'active');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    setSaveStatus('Saved on this device');
  } catch (error) {
    setSaveStatus('Could not save locally', true);
  }
}

async function restoreWorkspace() {
  try {
    const db = await openDatabase();
    const record = await new Promise((resolve, reject) => {
      const request = db.transaction('workspace').objectStore('workspace').get('active');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!record) return;
    isRestoring = true;
    pausePreviewElement(timelineClipVideo); timelineClipVideo.removeAttribute('src'); delete timelineClipVideo.dataset.assetId; timelineClipVideo.load();
    timelineClipImage.removeAttribute('src'); timelineClipImage.hidden = true;
    $('#selectedMediaPreview').removeAttribute('src');
    mediaAssets.forEach(asset => URL.revokeObjectURL(asset.url));
    mediaAssets = []; timelineMediaClips = []; selectedMediaAssetId = null; selectedTimelineMediaId = null;
    clearMusic(false);
    trimRange = record.trimRange || { start: 0, end: null };
    splitRange = record.splitRange || { ...trimRange };
    splitPoints = record.splitPoints || [];
    selectedSegment = record.selectedSegment ?? null;
    videoLook = videoLooks[record.videoLook] ? record.videoLook : 'original';
    videoEffect = videoEffects[record.videoEffect] ? record.videoEffect : 'none';
    videoTransition = ['none','fade','wipe','zoom','blur'].includes(record.videoTransition) ? record.videoTransition : 'none';
    mediaMotion = { effect: 'none', phase: 'entry', ...(record.mediaMotion || {}) };
    muteOriginalAudio = Boolean(record.muteOriginalAudio);
    videoPreview.muted = muteOriginalAudio;
    videoTitle = record.videoTitle || '';
    videoTitlePosition = record.videoTitlePosition || 'bottom';
    textItems = (record.textItems || []).map(item => ({ ...item, keyframes: (item.keyframes || []).map(frame => ({ ...frame })) }));
    effectClips = (record.effectClips || []).map(item => ({ ...item }));
    timelineLanes = normalizeTimelineLanes(record.timelineLanes);
    mediaTrackId = timelineLanes.some(lane => lane.id === record.mediaTrackId && lane.type === 'media') ? record.mediaTrackId : getDefaultTimelineLane('media').id;
    timelineGuideTime = Number.isFinite(record.timelineGuideTime) ? record.timelineGuideTime : null;
    timelineCursorTime = Number.isFinite(record.timelineCursorTime) ? record.timelineCursorTime : 0;
    defaultImageClipDuration = Math.max(.2, Math.min(60, Number(record.defaultImageClipDuration) || 5));
    $('#imageClipDuration').value = String(defaultImageClipDuration);
    textItems.forEach(item => { item.trackId ||= getDefaultTimelineLane('text').id; });
    effectClips.forEach(item => { item.trackId ||= getDefaultTimelineLane('media').id; });
    selectedEffectClipId = null;
    selectedTextId = null;
    if (record.image) loadFile(new File([record.image], record.name || 'photo', { type: record.type || 'image/jpeg', lastModified: record.image.lastModified || Date.now() }), false);
    const restoredPrimary = mediaAssets.find(asset => asset.name === record.name && asset.type === record.type);
    (record.mediaAssets || []).forEach(saved => {
      let asset = restoredPrimary && saved.kind !== 'audio' && saved.name === restoredPrimary.name && saved.type === restoredPrimary.type ? restoredPrimary : null;
      if (!asset && saved.file) asset = registerMediaAsset(new File([saved.file], saved.name || 'media', { type: saved.type || saved.file.type || 'application/octet-stream', lastModified: saved.file.lastModified || Date.now() }));
      if (!asset) return;
      asset.id = saved.id || asset.id;
      asset.duration = Number(saved.duration) || asset.duration;
      asset.thumbnailUrl = saved.thumbnailUrl || asset.thumbnailUrl;
      asset.waveform = saved.waveform || asset.waveform;
      asset.width = saved.width || asset.width; asset.height = saved.height || asset.height;
    });
    timelineMediaClips = (record.timelineMediaClips || []).map(clip => ({ ...clip, scale: clampMediaScale(clip.scale) }));
    selectedTimelineMediaId = record.selectedTimelineMediaId ?? null;
    if (!timelineMediaClips.length && originalFile) {
      const primary = mediaAssets.find(asset => asset.name === originalFile.name && asset.type === originalFile.type);
      if (primary) timelineMediaClips = [{ id: `media-primary-${Date.now()}`, assetId: primary.id, start: 0, end: primary.duration || (isVideo ? 0 : defaultImageClipDuration), sourceOffset: 0, trackId: mediaTrackId, isPrimary: true, autoDuration: isVideo, scale: 1 }];
    }
    const savedMusic = record.musicTracks?.length ? record.musicTracks : (record.music ? [{ file: record.music, name: record.musicName || 'music', type: record.music.type || 'audio/mpeg', start: record.musicStart, end: record.musicEnd, offset: record.musicOffset }] : []);
    savedMusic.forEach(track => loadMusic(new File([track.file], track.name || 'music', { type: track.type || track.file.type || 'audio/mpeg', lastModified: track.file.lastModified || Date.now() }), track.start, track.end ?? null, track.offset || 0, track.id, track.trackId, track.assetId, track.waveform));
    selectedMusicClipId = record.selectedMusicClipId ?? null;
    selectedMediaAssetId = record.selectedMediaAssetId && mediaAssets.some(asset => asset.id === record.selectedMediaAssetId) ? record.selectedMediaAssetId : mediaAssets[0]?.id || null;
    renderMediaLibrary(); renderTextTimeline();
    pruneEmptyTimelineLanes();
    values = { ...defaults, ...(record.values || {}) };
    filters.forEach(input => { input.value = values[input.dataset.key]; });
    crop = record.crop || { x: 0, y: 0, width: 1, height: 1 };
    rotation = record.rotation || 0;
    flipped = !!record.flipped;
    if (isVideo && videoPreview.readyState >= 1) syncTrimInputs();
    renderSplitSegments();
    $('#videoLook').value = videoLook;
    $('#videoEffect').value = videoEffect;
    $('#videoTransition').value = videoTransition;
    $('#muteOriginalAudio').checked = muteOriginalAudio;
    $('#videoTitle').value = videoTitle;
    $('#videoTitlePosition').value = videoTitlePosition;
    syncVideoTitlePreview();
    renderTextItems();
    applyVideoLook();
    updateVideoFadePreview();
    applyCropPreview();
    updatePreview();
    resetHistory();
    setSaveStatus('Saved on this device');
    isRestoring = false;
  } catch (error) {
    isRestoring = false;
    setSaveStatus('Local saving unavailable', true);
  }
}

function applyVideoLook() {
  videoPreview.style.filter = currentVideoFilter();
  updateActiveVideoEffects();
  applyMediaMotionPreview();
}

function currentVideoFilter() {
  const time = videoPreview.currentTime;
  const temporal = effectClips.filter(clip => time >= clip.start && time < clip.end)
    .map(clip => effectLibrary[clip.effect]?.filter(clip.intensity ?? .7));
  return [videoLooks[videoLook], videoEffects[videoEffect], ...temporal]
    .filter(filter => filter && filter !== 'none').join(' ') || 'none';
}

function updateActiveVideoEffects(time = videoPreview.currentTime) {
  const active = effectClips.filter(clip => time >= clip.start && time < clip.end);
  stage.classList.toggle('effect-shadow-lines', active.some(clip => clip.effect === 'shadowLines'));
  stage.classList.toggle('effect-tremor-scan', active.some(clip => clip.effect === 'tremorScan'));
  stage.style.setProperty('--effect-opacity', String(Math.max(0, ...active.map(clip => clip.intensity ?? .7)) * .16));
}

function drawEffectOverlays(context, width, height, time) {
  const active = effectClips.filter(clip => time >= clip.start && time < clip.end);
  active.forEach(clip => {
    const strength = clip.intensity ?? .7;
    context.save();
    if (clip.effect === 'shadowLines' || clip.effect === 'tremorScan') {
      context.globalAlpha = strength * (clip.effect === 'shadowLines' ? .13 : .1);
      context.fillStyle = '#000';
      for (let y = 0; y < height; y += clip.effect === 'shadowLines' ? 7 : 4) context.fillRect(0, y, width, 1);
    } else if (clip.effect === 'vrGameFire') {
      context.globalAlpha = strength * .2;
      const glow = context.createLinearGradient(0, height, width, 0);
      glow.addColorStop(0, '#ff4b16'); glow.addColorStop(.52, '#ef2c86'); glow.addColorStop(1, '#12d9ff');
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
    } else if (clip.effect === 'slantedOpen') {
      const progress = Math.max(0, Math.min(1, (time - clip.start) / Math.max(.1, clip.end - clip.start)));
      context.globalAlpha = strength * .18;
      const edge = progress * (width + height) - height;
      context.fillStyle = '#fff'; context.beginPath();
      context.moveTo(edge, 0); context.lineTo(edge + height * .25, 0);
      context.lineTo(edge + height * .25 + height, height); context.lineTo(edge + height, height);
      context.closePath(); context.fill();
    }
    context.restore();
  });
}

function currentTransitionRange() {
  if (selectedSegment !== null) return getVideoSegments()[selectedSegment] || trimRange;
  return { start: Number($('#trimStart').value), end: Number($('#trimEnd').value) };
}

function getVideoTransitionState(time, start, end) {
  const state = { opacity: 1, reveal: 1, scale: 1, blur: 0 };
  if (!videoTransition || videoTransition === 'none' || end <= start) return state;
  const duration = Math.min(.6, (end - start) / 2);
  const progress = Math.max(0, Math.min(1, (time - start) / duration, (end - time) / duration));
  if (videoTransition === 'fade') state.opacity = progress;
  if (videoTransition === 'wipe') state.reveal = progress;
  if (videoTransition === 'zoom') state.scale = .86 + .14 * progress;
  if (videoTransition === 'blur') state.blur = (1 - progress) * 10;
  return state;
}

function getMediaMotionState(time = videoPreview.currentTime, range = currentTransitionRange()) {
  if (!mediaMotion.effect || mediaMotion.effect === 'none' || !isVideo) return { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, blur: 0, reveal: 1 };
  const duration = Math.max(.1, Math.min(.9, (range.end - range.start) / 3));
  const phase = mediaMotion.phase || 'entry';
  let progress = phase === 'exit' ? (time - (range.end - duration)) / duration : (time - range.start) / duration;
  if (phase === 'loop') progress = ((time - range.start) % duration) / duration;
  return motionPhaseState(mediaMotion.effect, phase === 'transition' ? 'entry' : phase, progress, time - range.start);
}

function applyMediaMotionPreview() {
  if (!isVideo) return;
  const range = currentTransitionRange();
  const transition = getVideoTransitionState(videoPreview.currentTime, range.start, range.end);
  const motion = getMediaMotionState();
  const activeClip = timelineMediaClips.find(clip => clip.id === activeTimelinePreviewClipId) || getActiveTimelineMediaClip(timelineCursorTime);
  const reveal = Math.min(transition.reveal, motion.reveal);
  videoPreview.style.opacity = String(transition.opacity * motion.opacity);
  videoPreview.style.transformOrigin = 'center center';
  videoPreview.style.transform = `translate(${motion.x * 100}%, ${motion.y * 100}%) scale(${motion.scale * transition.scale * getTimelineMediaScale(activeClip)}) rotate(${motion.rotation}deg)`;
  videoPreview.style.filter = [currentVideoFilter(), motion.blur + transition.blur ? `blur(${motion.blur + transition.blur}px)` : ''].filter(value => value && value !== 'none').join(' ') || 'none';
  videoPreview.style.clipPath = reveal < 1 ? `inset(0 0 ${(1 - reveal) * 100}% 0)` : 'none';
}

function updateVideoFadePreview() {
  if (!isVideo) return;
  const range = currentTransitionRange();
  const transition = getVideoTransitionState(videoPreview.currentTime, range.start, range.end);
  const overlayOpacity = videoTransition === 'fade' ? transition.opacity : 1;
  $('#videoTitlePreview').style.opacity = String(overlayOpacity);
  $('#textLayer').style.opacity = String(overlayOpacity);
  stage.classList.toggle('video-fading', videoTransition === 'fade' && overlayOpacity < 1);
  applyMediaMotionPreview();
}

function syncVideoTitlePreview() {
  const preview = $('#videoTitlePreview');
  preview.textContent = videoTitle;
  preview.className = `video-title-preview position-${videoTitlePosition}`;
  preview.hidden = !isVideo || !videoTitle.trim();
}

function renderTextItems() {
  const layer = $('#textLayer');
  layer.replaceChildren();
  textItems.forEach(item => {
    const object = document.createElement('div');
    object.className = 'text-object';
    object.dataset.id = item.id;
    positionTextObject(object, item);

    const tools = document.createElement('div');
    tools.className = 'text-tools';
    const drag = document.createElement('button');
    drag.type = 'button'; drag.className = 'text-drag'; drag.textContent = '⠿'; drag.title = 'Move text';
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'text-delete'; remove.textContent = '×'; remove.title = 'Delete text';
    tools.append(drag, remove);

    const input = document.createElement('textarea');
    input.rows = 1; input.maxLength = 120; input.placeholder = 'Type here…'; input.value = item.text;
    input.setAttribute('aria-label', 'Text overlay');
    input.addEventListener('input', () => {
      item.text = input.value;
      resizeTextInput(input);
      scheduleSave(); queueHistory();
    });
    input.addEventListener('focus', () => {
      selectedTextId = item.id;
      syncTextTimingPanel();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') input.blur();
    });
    remove.addEventListener('click', event => {
      event.stopPropagation();
      textItems = textItems.filter(candidate => candidate.id !== item.id);
      pruneEmptyTimelineLanes();
      if (selectedTextId === item.id) selectedTextId = null;
      renderTextItems(); scheduleSave(); queueHistory();
    });
    drag.addEventListener('pointerdown', event => {
      event.preventDefault();
      drag.setPointerCapture(event.pointerId);
      const startX = event.clientX, startY = event.clientY;
      const initial = getTextPosition(item, timelineCursorTime);
      item.x = initial.x; item.y = initial.y;
      const initialX = item.x, initialY = item.y;
      const mediaRect = getTimelinePreviewElement().getBoundingClientRect();
      const move = moveEvent => {
        item.x = Math.max(.03, Math.min(.97, initialX + (moveEvent.clientX - startX) / mediaRect.width));
        item.y = Math.max(.04, Math.min(.96, initialY + (moveEvent.clientY - startY) / mediaRect.height));
        positionTextObject(object, { ...item, keyframes: [] });
      };
      const finish = () => {
        drag.removeEventListener('pointermove', move);
        drag.removeEventListener('pointerup', finish);
        drag.removeEventListener('pointercancel', finish);
        if (isVideo && item.keyframes?.length) {
          setTextKeyframe(item, timelineCursorTime, item.x, item.y);
          renderTextTimeline();
        }
        scheduleSave(); queueHistory();
      };
      drag.addEventListener('pointermove', move);
      drag.addEventListener('pointerup', finish);
      drag.addEventListener('pointercancel', finish);
    });
    object.append(tools, input);
    layer.appendChild(object);
    applyTextStylePreview(object, item);
    resizeTextInput(input);
  });
  updateTextVisibility();
  syncTextTimingPanel();
  renderTextTimeline();
}

function syncTextTimingPanel() {
  const panel = $('#textTiming');
  const inspector = $('#textInspector');
  const item = textItems.find(candidate => candidate.id === selectedTextId);
  inspector.hidden = !item;
  panel.hidden = !originalFile || !item;
  $('#mediaMotionPanel').hidden = !originalUrl || Boolean(item);
  if (!item) return;
  syncTextStylePanel(item);
  const duration = getTimelineDuration();
  $('#textStart').max = String(duration);
  $('#textEnd').max = String(duration);
  $('#textStart').value = String(Number(item.start ?? 0).toFixed(1));
  $('#textEnd').value = String(Number(item.end ?? duration).toFixed(1));
  $('#textDuration').textContent = `Duration: ${Math.max(0, Number(item.end ?? duration) - Number(item.start ?? 0)).toFixed(1)}s`;
  $('#textAnimation').value = ['none','fade','pop','zoom','slideUp','slideDown'].includes(item.animation || 'none') ? (item.animation || 'none') : 'custom';
  syncKeyframeStatus(item);
}

function syncTextStylePanel(item) {
  const style = { ...textStyleDefaults, ...item };
  $$('[data-text-property]').forEach(input => {
    const property = input.dataset.textProperty;
    let value = style[property];
    if (property === 'positionX') value = Math.round((item.x ?? .5) * 100);
    if (property === 'positionY') value = Math.round((item.y ?? .5) * 100);
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else input.value = String(value);
  });
  $$('[data-text-output]').forEach(output => {
    const property = output.dataset.textOutput;
    if (property === 'rotation') output.textContent = `${style.rotation}°`;
    else if (property === 'opacity') output.textContent = `${style.opacity}%`;
    else output.textContent = `${Number(style.animationDuration).toFixed(1)}s`;
  });
}

function applyTextStylePreview(object, item) {
  const input = object.querySelector('textarea');
  if (!input) return;
  const style = { ...textStyleDefaults, ...item };
  loadTextFontFamily(style.fontFamily);
  input.style.fontFamily = `"${style.fontFamily}"`;
  input.style.fontSize = `${style.fontSize}px`;
  input.style.fontWeight = String(style.fontWeight);
  input.style.color = style.gradientEnabled ? 'transparent' : style.color;
  input.style.backgroundImage = style.gradientEnabled ? `linear-gradient(90deg, ${style.color}, ${style.gradientColor})` : 'none';
  input.style.backgroundClip = style.gradientEnabled ? 'text' : 'border-box';
  input.style.webkitBackgroundClip = style.gradientEnabled ? 'text' : 'border-box';
  input.style.webkitTextFillColor = style.gradientEnabled ? 'transparent' : style.color;
  input.style.webkitTextStroke = `${Number(style.outlineWidth) / 100 * Number(style.fontSize)}px ${style.outlineColor}`;
  const shadows = [`0 2px ${style.shadowBlur}px ${style.shadowColor}`];
  if (Number(style.glowBlur) > 0) shadows.push(`0 0 ${style.glowBlur}px ${style.glowColor}`);
  input.style.textShadow = shadows.join(', ');
  input.style.letterSpacing = `${style.letterSpacing}px`;
  input.style.lineHeight = String(style.lineSpacing);
  input.style.textAlign = style.alignment;
  object.style.backgroundColor = style.backgroundEnabled ? colorWithAlpha(style.backgroundColor, style.backgroundOpacity / 100) : 'transparent';
  object.style.borderRadius = style.backgroundEnabled ? '6px' : '0';
  object.style.padding = style.backgroundEnabled ? '8px 12px' : '0';
  input.style.backgroundColor = 'transparent';
  input.style.borderRadius = '4px';
  input.style.padding = '5px 7px';
}

function loadTextFontFamily(family) {
  if (localTextFonts.has(family)) return document.fonts.load(`400 24px "${family}"`).catch(() => {});
  if (textFontLoadPromises.has(family)) return textFontLoadPromises.get(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.textFontFamily = family;
  link.addEventListener('load', () => $$('#textLayer textarea').forEach(resizeTextInput), { once: true });
  link.href = `https://fonts.googleapis.com/css2?${new URLSearchParams({ family, display: 'swap' })}`;
  const promise = new Promise(resolve => {
    const timeout = setTimeout(resolve, 5000);
    link.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
    link.addEventListener('error', () => { clearTimeout(timeout); resolve(); }, { once: true });
  }).then(() => document.fonts.load(`400 24px "${family}"`).catch(() => {}));
  textFontLoadPromises.set(family, promise);
  document.head.appendChild(link);
  return promise;
}

async function ensureTextFontsReady() {
  const families = [...new Set(textItems.map(item => item.fontFamily || textStyleDefaults.fontFamily))];
  await Promise.all(families.map(loadTextFontFamily));
}

function colorWithAlpha(color, alpha) {
  const value = String(color).replace('#', '');
  if (!/^[\da-f]{6}$/i.test(value)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${Math.max(0, Math.min(1, alpha))})`;
}

function normalizeTimelineLanes(lanes) {
  const defaults = [
    { id: 'media-1', type: 'media', name: 'Media + effects' }
  ];
  const valid = Array.isArray(lanes) ? lanes.filter(lane => lane && ['media', 'text', 'music'].includes(lane.type)) : [];
  const result = valid.map(lane => ({ ...lane }));
  defaults.forEach(base => { if (!result.some(lane => lane.type === base.type)) result.push({ ...base }); });
  const seen = new Set();
  result.forEach(lane => { if (!lane.id || seen.has(lane.id)) lane.id = `${lane.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; seen.add(lane.id); });
  return result;
}

function getDefaultTimelineLane(type) {
  return timelineLanes.find(item => item.type === type) || createTimelineLane(type);
}

function createTimelineLane(type) {
  const base = { media: 'Media + effects', text: 'Text', music: 'Music' }[type];
  const siblings = timelineLanes.filter(lane => lane.type === type);
  const lane = { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, name: siblings.length ? `${base} ${siblings.length + 1}` : base };
  timelineLanes.push(lane);
  return lane;
}

function pruneEmptyTimelineLanes() {
  timelineLanes = timelineLanes.filter(lane => {
    if (lane.type === 'media' && lane.id === mediaTrackId) return true;
    if (lane.type === 'media') return effectClips.some(item => item.trackId === lane.id) || timelineMediaClips.some(item => item.trackId === lane.id);
    if (lane.type === 'text') return textItems.some(item => item.trackId === lane.id);
    return musicClips.some(item => item.trackId === lane.id);
  });
  timelineLocks = new Set([...timelineLocks].filter(id => timelineLanes.some(lane => lane.id === id)));
  if (!timelineLanes.some(lane => lane.id === mediaTrackId && lane.type === 'media')) mediaTrackId = getDefaultTimelineLane('media').id;
}

function moveTimelineLane(id, delta) {
  const index = timelineLanes.findIndex(lane => lane.id === id), target = index + delta;
  if (index < 0 || target < 0 || target >= timelineLanes.length) return;
  [timelineLanes[index], timelineLanes[target]] = [timelineLanes[target], timelineLanes[index]];
  renderTextTimeline(); scheduleSave(); queueHistory();
}

function createTimelineLaneLabel(lane, icon) {
  const { type, name: title } = lane;
  const label = document.createElement('div');
  label.className = 'timeline-label timeline-lane-label';
  label.title = `${title} track`;
  const symbol = document.createElement('span');
  symbol.className = `timeline-lane-icon ${type}-lane-icon`;
  symbol.textContent = icon;
  const name = document.createElement('span');
  name.className = 'timeline-lane-name';
  name.textContent = title;
  const up = document.createElement('button');
  up.type = 'button'; up.className = 'timeline-lane-action'; up.textContent = '^'; up.title = `Move ${title} lane up`;
  up.disabled = timelineLanes.indexOf(lane) === 0;
  up.addEventListener('click', event => { event.stopPropagation(); moveTimelineLane(lane.id, -1); });
  const down = document.createElement('button');
  down.type = 'button'; down.className = 'timeline-lane-action'; down.textContent = 'v'; down.title = `Move ${title} lane down`;
  down.disabled = timelineLanes.indexOf(lane) === timelineLanes.length - 1;
  down.addEventListener('click', event => { event.stopPropagation(); moveTimelineLane(lane.id, 1); });
  const lock = document.createElement('button');
  lock.type = 'button';
  lock.className = `timeline-lane-lock${timelineLocks.has(lane.id) ? ' locked' : ''}`;
  lock.textContent = '';
  lock.title = timelineLocks.has(lane.id) ? `Unlock ${title} track` : `Lock ${title} track`;
  lock.setAttribute('aria-label', lock.title);
  lock.addEventListener('click', event => {
    event.stopPropagation();
    if (timelineLocks.has(lane.id)) timelineLocks.delete(lane.id); else timelineLocks.add(lane.id);
    renderTextTimeline();
  });
  label.append(symbol, name, up, down, lock);
  return label;
}

function getTimelineRowAtPoint(event, type) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const row = element?.closest('.timeline-row');
  return row?.dataset.trackType === type ? row : null;
}

function appendTimelineDropLane(type, tracks) {
  const lane = createTimelineLane(type);
  const row = document.createElement('div');
  row.className = `timeline-row ${type}-row timeline-drop-lane`;
  row.dataset.trackId = lane.id; row.dataset.trackType = type;
  const icon = type === 'text' ? 'T' : type === 'music' ? '\u266B' : 'V';
  row.appendChild(createTimelineLaneLabel(lane, icon));
  const playhead = tracks.querySelector('.timeline-playhead');
  tracks.insertBefore(row, playhead);
  return row;
}

function renderTimelineMediaClip(clipItem, row, duration, tracks) {
  const asset = mediaAssets.find(item => item.id === clipItem.assetId);
  if (!asset || !row) return;
  const clip = document.createElement('div');
  clip.className = `timeline-clip media-clip media-edit-clip${clipItem.id === selectedTimelineMediaId ? ' selected' : ''}`;
  clip.dataset.clipId = clipItem.id;
  clip.style.left = `${clipItem.start / duration * 100}%`;
  clip.style.width = `${Math.max(12, (clipItem.end - clipItem.start) / duration * tracks.clientWidth)}px`;
  const strip = document.createElement('span'); strip.className = 'timeline-media-filmstrip';
  if (asset.thumbnailUrl || asset.kind === 'image') {
    strip.style.backgroundImage = `linear-gradient(#0b171b55,#0b171b55),url("${asset.thumbnailUrl || asset.url}")`;
    strip.classList.add(asset.kind === 'image' ? 'image-filmstrip' : 'video-filmstrip');
  } else strip.classList.add('video-filmstrip');
  const title = document.createElement('span'); title.className = 'timeline-clip-title'; title.textContent = asset.name;
  const startHandle = document.createElement('span'); startHandle.className = 'timeline-edge start';
  const endHandle = document.createElement('span'); endHandle.className = 'timeline-edge end';
  clip.append(strip, title, startHandle, endHandle); row.appendChild(clip);
  clip.addEventListener('pointerdown', event => {
    if (timelineLocks.has(clipItem.trackId)) return;
    event.preventDefault(); event.stopPropagation();
    selectedTimelineMediaId = clipItem.id; selectedMusicClipId = null; selectedEffectClipId = null; syncEffectProperties(); syncMediaClipProperties(); clip.classList.add('selected'); updateMediaResizeOverlay();
    const originX = event.clientX, initialStart = clipItem.start, initialEnd = clipItem.end, initialOffset = clipItem.sourceOffset || 0;
    const mode = event.target === startHandle ? 'start' : event.target === endHandle ? 'end' : 'move';
    if (mode === 'move') clip.style.pointerEvents = 'none';
    let dropLane = null;
    const dropBoundary = tracks.getBoundingClientRect().bottom;
    const pxPerSecond = Math.max(1, tracks.getBoundingClientRect().width) / duration;
    const move = moveEvent => {
      const delta = (moveEvent.clientX - originX) / pxPerSecond;
      if (mode === 'start') {
        clipItem.start = Math.max(0, Math.min(initialEnd - .1, initialStart + delta));
        clipItem.sourceOffset = Math.max(0, initialOffset + clipItem.start - initialStart);
        if (asset.kind === 'video' && asset.duration) clipItem.end = Math.min(clipItem.end, clipItem.start + Math.max(.1, asset.duration - clipItem.sourceOffset));
      } else if (mode === 'end') {
        const sourceLimit = asset.kind === 'video' && asset.duration ? initialStart + Math.max(.1, asset.duration - initialOffset) : Infinity;
        clipItem.end = Math.min(sourceLimit, Math.max(initialStart + .1, initialEnd + delta));
      }
      else {
        const shift = Math.max(-initialStart, Math.min(3600 - initialEnd, delta));
        clipItem.start = initialStart + shift; clipItem.end = initialEnd + shift;
        let target = getTimelineRowAtPoint(moveEvent, 'media');
        if (!target && !dropLane && moveEvent.clientY >= dropBoundary - 2) dropLane = appendTimelineDropLane('media', tracks);
        if (!target && dropLane && moveEvent.clientY >= dropBoundary - 2) target = dropLane;
        if (target) clip.style.transform = `translateY(${target.getBoundingClientRect().top - row.getBoundingClientRect().top}px)`;
      }
      const nextDuration = Math.max(duration, clipItem.end);
      clip.style.left = `${clipItem.start / nextDuration * 100}%`;
      clip.style.width = `${Math.max(12, (clipItem.end - clipItem.start) / nextDuration * tracks.clientWidth)}px`;
    };
    const finish = upEvent => {
      const target = mode === 'move' ? getTimelineRowAtPoint(upEvent, 'media') : null;
      if (target && !timelineLocks.has(target.dataset.trackId)) clipItem.trackId = target.dataset.trackId;
      pruneEmptyTimelineLanes(); clip.style.transform = ''; clip.style.pointerEvents = '';
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish);
      renderTextTimeline(); renderTimelinePreviewAt(timelineCursorTime); scheduleSave(); queueHistory();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true });
  });
}

function renderTextTimeline() {
  const panel = $('#textTimeline'), ruler = $('#timelineRuler'), tracks = $('#timelineTracks');
  const duration = getTimelineDuration();
  panel.hidden = !duration;
  if (panel.hidden) return;
  $('#timelineDuration').textContent = formatDuration(duration);
  if (!Number.isFinite(timelineGuideTime)) timelineGuideTime = duration * .25;
  timelineGuideTime = Math.max(0, Math.min(duration, timelineGuideTime));
  $('#musicLabel').hidden = musicClips.length === 0;
  $('#musicName').textContent = `${musicClips.length} music track${musicClips.length === 1 ? '' : 's'}`;
  $('#removeMusic').disabled = timelineLanes.filter(lane => lane.type === 'music').every(lane => timelineLocks.has(lane.id));
  ruler.replaceChildren(); tracks.replaceChildren();
  for (let index = 0; index <= 4; index += 1) {
    const tick = document.createElement('span'); tick.className = 'timeline-tick'; tick.style.left = `${index * 25}%`;
    tick.textContent = formatDuration(duration * index / 4); ruler.appendChild(tick);
  }
  ruler.onpointerdown = beginTimelineScrub;
  ruler.onpointermove = updateTimelineGuideFromPointer;
  tracks.onpointerdown = beginTimelineScrub;
  tracks.onpointermove = updateTimelineGuideFromPointer;
  tracks.onclick = event => {
    if (event.target.closest('.timeline-clip') && !event.target.closest('button')) seekTimelineFromPointer(event);
  };
  tracks.ondragover = event => {
    if ([...event.dataTransfer.types].includes('application/x-neura-media')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }
  };
  tracks.ondrop = event => {
    const assetId = event.dataTransfer.getData('application/x-neura-media');
    if (!assetId) return;
    event.preventDefault(); event.stopPropagation();
    const asset = mediaAssets.find(item => item.id === assetId);
    if (!asset) return;
    const type = asset.kind === 'audio' ? 'music' : 'media';
    const target = event.target.closest('.timeline-row');
    if (target?.dataset.trackType === type && timelineLocks.has(target.dataset.trackId)) { showToast('Unlock this track before adding media.'); return; }
    const lane = target?.dataset.trackType === type ? target.dataset.trackId : getDefaultTimelineLane(type).id;
    const rect = tracks.getBoundingClientRect();
    const at = Math.max(0, ((event.clientX - rect.left) / Math.max(1, rect.width)) * duration);
    addMediaAssetToTimeline(assetId, lane, at);
  };

  const rows = new Map();
  timelineLanes.forEach(lane => {
    const row = document.createElement('div');
    row.className = `timeline-row ${lane.type}-row${timelineLocks.has(lane.id) ? ' track-locked' : ''}`;
    row.dataset.trackId = lane.id; row.dataset.trackType = lane.type;
    const icon = lane.type === 'text' ? 'T' : lane.type === 'music' ? '\u266B' : 'V';
    row.appendChild(createTimelineLaneLabel(lane, icon));
    rows.set(lane.id, row); tracks.appendChild(row);
  });
  const defaultMediaLane = getDefaultTimelineLane('media');
  if (!timelineLanes.some(lane => lane.id === mediaTrackId && lane.type === 'media')) mediaTrackId = defaultMediaLane.id;
  timelineMediaClips.forEach(clipItem => {
    let lane = timelineLanes.find(item => item.id === clipItem.trackId && item.type === 'media');
    if (!lane) { lane = defaultMediaLane; clipItem.trackId = lane.id; }
    renderTimelineMediaClip(clipItem, rows.get(lane.id), duration, tracks);
  });

  effectClips.forEach(clipItem => {
    const effect = effectLibrary[clipItem.effect]; if (!effect) return;
    let lane = timelineLanes.find(item => item.id === clipItem.trackId && item.type === 'media');
    if (!lane) { lane = defaultMediaLane; clipItem.trackId = lane.id; }
    const row = rows.get(lane.id);
    const clip = document.createElement('div');
    clip.className = `timeline-clip effect-clip${clipItem.id === selectedEffectClipId ? ' selected' : ''}`;
    clip.dataset.effectId = clipItem.id;
    clip.style.left = `${clipItem.start / duration * 100}%`;
    clip.style.width = `${Math.max(8, (clipItem.end - clipItem.start) / duration * tracks.clientWidth)}px`;
    const title = document.createElement('span'); title.className = 'timeline-clip-title'; title.textContent = effect.name;
    const startHandle = document.createElement('span'); startHandle.className = 'timeline-edge start';
    const endHandle = document.createElement('span'); endHandle.className = 'timeline-edge end';
    clip.append(title, startHandle, endHandle); row.appendChild(clip);
    clip.addEventListener('pointerdown', event => {
      if (timelineLocks.has(lane.id)) return;
      event.preventDefault(); event.stopPropagation(); selectedEffectClipId = clipItem.id; selectedTimelineMediaId = null; selectedMusicClipId = null; syncEffectProperties(); syncMediaClipProperties();
      const originX = event.clientX, initialStart = clipItem.start, initialEnd = clipItem.end;
      const mode = event.target === startHandle ? 'start' : event.target === endHandle ? 'end' : 'move';
      if (mode === 'move') clip.style.pointerEvents = 'none';
      let dropLane = null;
      const dropBoundary = tracks.getBoundingClientRect().bottom;
      const pxPerSecond = tracks.getBoundingClientRect().width / duration;
      const move = moveEvent => {
        const delta = (moveEvent.clientX - originX) / pxPerSecond;
        if (mode === 'start') clipItem.start = Math.max(0, Math.min(initialEnd - .1, initialStart + delta));
        else if (mode === 'end') clipItem.end = Math.min(duration, Math.max(initialStart + .1, initialEnd + delta));
        else {
          const shift = Math.max(-initialStart, Math.min(duration - initialEnd, delta));
          clipItem.start = initialStart + shift; clipItem.end = initialEnd + shift;
          let target = getTimelineRowAtPoint(moveEvent, 'media');
          if (!target && !dropLane && moveEvent.clientY >= dropBoundary - 2) dropLane = appendTimelineDropLane('media', tracks);
          if (!target && dropLane && moveEvent.clientY >= dropBoundary - 2) target = dropLane;
          if (target) clip.style.transform = `translateY(${target.getBoundingClientRect().top - row.getBoundingClientRect().top}px)`;
        }
        clip.style.left = `${clipItem.start / duration * 100}%`;
        clip.style.width = `${Math.max(8, (clipItem.end - clipItem.start) / duration * tracks.clientWidth)}px`;
        syncEffectProperties(); applyVideoLook();
      };
      const finish = upEvent => {
        const target = mode === 'move' ? getTimelineRowAtPoint(upEvent, 'media') : null;
        if (target && !timelineLocks.has(target.dataset.trackId)) clipItem.trackId = target.dataset.trackId;
        pruneEmptyTimelineLanes();
        clip.style.transform = ''; clip.style.pointerEvents = '';
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish);
        renderTextTimeline(); scheduleSave(); queueHistory();
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true });
    });
  });

  textItems.forEach((item, index) => {
    let lane = timelineLanes.find(entry => entry.id === item.trackId && entry.type === 'text');
    if (!lane) { lane = getDefaultTimelineLane('text'); item.trackId = lane.id; }
    const row = rows.get(lane.id);
    const start = Math.max(0, Math.min(duration, Number(item.start ?? 0)));
    const end = Math.max(start, Math.min(duration, Number(item.end ?? duration)));
    const clip = document.createElement('div'); clip.className = `timeline-clip text-clip${item.id === selectedTextId ? ' selected' : ''}`;
    clip.dataset.textId = item.id;
    clip.style.left = `${start / duration * 100}%`; clip.style.width = `${Math.max(5, (end - start) / duration * tracks.clientWidth)}px`;
    const title = document.createElement('span'); title.className = 'timeline-clip-title'; title.textContent = item.text.trim().split('\n')[0] || `Text ${index + 1}`;
    const startHandle = document.createElement('span'); startHandle.className = 'timeline-edge start';
    const endHandle = document.createElement('span'); endHandle.className = 'timeline-edge end';
    clip.append(title, startHandle, endHandle); row.appendChild(clip);
    const beginDrag = (event, mode) => {
      if (timelineLocks.has(lane.id)) return;
      event.preventDefault(); event.stopPropagation(); selectedTextId = item.id;
      const originX = event.clientX, initialStart = start, initialEnd = end;
      if (mode === 'move') clip.style.pointerEvents = 'none';
      let dropLane = null;
      const dropBoundary = tracks.getBoundingClientRect().bottom;
      const pxPerSecond = tracks.getBoundingClientRect().width / duration;
      const move = moveEvent => {
        const delta = (moveEvent.clientX - originX) / pxPerSecond;
        if (mode === 'start') item.start = Math.max(0, Math.min(initialEnd - .1, initialStart + delta));
        else if (mode === 'end') item.end = Math.min(duration, Math.max(initialStart + .1, initialEnd + delta));
        else {
          const shift = Math.max(-initialStart, Math.min(duration - initialEnd, delta)); item.start = initialStart + shift; item.end = initialEnd + shift;
          let target = getTimelineRowAtPoint(moveEvent, 'text');
          if (!target && !dropLane && moveEvent.clientY >= dropBoundary - 2) dropLane = appendTimelineDropLane('text', tracks);
          if (!target && dropLane && moveEvent.clientY >= dropBoundary - 2) target = dropLane;
          if (target) clip.style.transform = `translateY(${target.getBoundingClientRect().top - row.getBoundingClientRect().top}px)`;
        }
        const nextStart = Number(item.start ?? initialStart), nextEnd = Number(item.end ?? initialEnd);
        clip.style.left = `${nextStart / duration * 100}%`; clip.style.width = `${Math.max(5, (nextEnd - nextStart) / duration * tracks.clientWidth)}px`;
        $('#textStart').value = nextStart.toFixed(1); $('#textEnd').value = nextEnd.toFixed(1); updateTextVisibility();
      };
      const finish = upEvent => {
        const target = mode === 'move' ? getTimelineRowAtPoint(upEvent, 'text') : null;
        if (target && !timelineLocks.has(target.dataset.trackId)) item.trackId = target.dataset.trackId;
        pruneEmptyTimelineLanes();
        clip.style.transform = ''; clip.style.pointerEvents = '';
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish);
        syncTextTimingPanel(); renderTextTimeline(); scheduleSave(); queueHistory();
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true });
    };
    clip.addEventListener('pointerdown', event => beginDrag(event, event.target === startHandle ? 'start' : event.target === endHandle ? 'end' : 'move'));
    (item.keyframes || []).forEach(frame => {
      const marker = document.createElement('button'); marker.type = 'button'; marker.className = 'timeline-keyframe';
      marker.style.left = `${frame.time / duration * 100}%`; marker.title = `Keyframe at ${frame.time.toFixed(1)}s`;
      marker.addEventListener('click', event => { event.stopPropagation(); selectedTextId = item.id; setTimelineCursorTime(frame.time); renderTextTimeline(); syncTextTimingPanel(); });
      row.appendChild(marker);
    });
  });

  musicClips.forEach(music => {
    let lane = timelineLanes.find(entry => entry.id === music.trackId && entry.type === 'music');
    if (!lane) { lane = getDefaultTimelineLane('music'); music.trackId = lane.id; }
    const row = rows.get(lane.id);
    const start = Math.max(0, Math.min(duration, music.start));
    const end = Math.max(start, Math.min(duration, music.end ?? duration));
    const clip = document.createElement('div'); clip.className = `timeline-clip music-clip${music.id === selectedMusicClipId ? ' selected' : ''}`;
    clip.dataset.musicId = music.id;
    clip.style.left = `${start / duration * 100}%`; clip.style.width = `${Math.max(5, (end - start) / duration * tracks.clientWidth)}px`;
    const title = document.createElement('span'); title.className = 'timeline-clip-title'; title.textContent = music.file.name;
    const waveform = document.createElement('span'); waveform.className = 'music-waveform';
    const peaks = music.waveform || mediaAssets.find(asset => asset.id === music.assetId)?.waveform;
    if (peaks?.length) peaks.forEach(peak => { const bar = document.createElement('i'); bar.style.height = `${Math.max(12, Math.min(100, Number(peak) * 100))}%`; waveform.appendChild(bar); });
    const startHandle = document.createElement('span'); startHandle.className = 'timeline-edge start';
    const endHandle = document.createElement('span'); endHandle.className = 'timeline-edge end';
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'music-clip-remove'; remove.textContent = '\u00D7'; remove.title = `Remove ${music.file.name}`; remove.disabled = timelineLocks.has(lane.id);
    remove.addEventListener('pointerdown', event => event.stopPropagation());
    remove.addEventListener('click', event => { event.stopPropagation(); removeMusicClip(music.id); queueHistory(); });
    clip.append(waveform, title, startHandle, endHandle, remove); row.appendChild(clip);
    clip.addEventListener('pointerdown', event => {
      if (timelineLocks.has(lane.id) || event.target === remove) return;
      event.preventDefault(); event.stopPropagation();
      selectedMusicClipId = music.id; selectedTimelineMediaId = null; selectedEffectClipId = null; syncEffectProperties(); syncMediaClipProperties(); clip.classList.add('selected');
      const originX = event.clientX, initialStart = start, initialEnd = end, initialOffset = music.offset;
      const mode = event.target === startHandle ? 'start' : event.target === endHandle ? 'end' : 'move';
      if (mode === 'move') clip.style.pointerEvents = 'none';
      let dropLane = null;
      const dropBoundary = tracks.getBoundingClientRect().bottom;
      const pxPerSecond = tracks.getBoundingClientRect().width / duration;
      const move = moveEvent => {
        const delta = (moveEvent.clientX - originX) / pxPerSecond;
        if (mode === 'start') {
          const nextStart = Math.max(0, Math.min(initialEnd - .1, initialStart + delta));
          const audioDuration = Number.isFinite(music.audio.duration) ? music.audio.duration : Infinity;
          music.offset = Math.max(0, Math.min(Math.max(0, audioDuration - .1), initialOffset + nextStart - initialStart));
          music.start = initialStart + music.offset - initialOffset;
          music.end = Number.isFinite(audioDuration) ? Math.min(initialEnd, music.start + audioDuration - music.offset) : initialEnd;
        } else if (mode === 'end') {
          const sourceEnd = Number.isFinite(music.audio.duration) ? music.start + music.audio.duration - music.offset : Infinity;
          music.end = Math.min(sourceEnd, Math.max(music.start + .1, initialEnd + delta));
        }
        else {
          const shift = Math.max(-initialStart, Math.min(3600 - initialEnd, delta)); music.start = initialStart + shift; music.end = initialEnd + shift;
          let target = getTimelineRowAtPoint(moveEvent, 'music');
          if (!target && !dropLane && moveEvent.clientY >= dropBoundary - 2) dropLane = appendTimelineDropLane('music', tracks);
          if (!target && dropLane && moveEvent.clientY >= dropBoundary - 2) target = dropLane;
          if (target) clip.style.transform = `translateY(${target.getBoundingClientRect().top - row.getBoundingClientRect().top}px)`;
        }
        clip.style.left = `${music.start / duration * 100}%`; clip.style.width = `${Math.max(5, ((music.end ?? duration) - music.start) / duration * tracks.clientWidth)}px`; syncMusicPlayback();
      };
      const finish = upEvent => {
        const target = mode === 'move' ? getTimelineRowAtPoint(upEvent, 'music') : null;
        if (target && !timelineLocks.has(target.dataset.trackId)) music.trackId = target.dataset.trackId;
        pruneEmptyTimelineLanes();
        clip.style.transform = ''; clip.style.pointerEvents = '';
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); renderTextTimeline(); scheduleSave(); queueHistory();
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', finish, { once: true });
    });
  });

  const guide = document.createElement('div');
  guide.className = 'timeline-guide-marker';
  guide.setAttribute('aria-hidden', 'true');
  const guideTime = document.createElement('span');
  guideTime.className = 'timeline-guide-time';
  guide.appendChild(guideTime);
  tracks.appendChild(guide);
  const playhead = document.createElement('div');
  playhead.className = 'timeline-playhead';
  playhead.title = 'Playhead — drag to seek';
  playhead.setAttribute('role', 'slider'); playhead.setAttribute('aria-label', 'Playback position');
  tracks.appendChild(playhead);
  updateTimelineGuideMarker(); updateTimelinePlayhead(); syncEffectProperties(); syncMediaClipProperties(); syncTextTimingPanel();
}

function syncEffectProperties() {
  const selected = effectClips.find(item => item.id === selectedEffectClipId);
  const panel = $('#effectProperties');
  panel.hidden = !selected;
  if (!selected) return;
  $('#effectSelectedName').textContent = effectLibrary[selected.effect]?.name || 'Effect';
  $('#effectStart').value = selected.start.toFixed(1);
  $('#effectEnd').value = selected.end.toFixed(1);
  $('#effectStart').max = String(videoPreview.duration);
  $('#effectEnd').max = String(videoPreview.duration);
  $('#effectIntensity').value = String(selected.intensity ?? .7);
}

function addEffectClip(effectId) {
  if (!isVideo) return showToast('Choose a video before adding an effect.');
  const duration = videoPreview.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  const start = Math.min(videoPreview.currentTime, Math.max(0, duration - .1));
  const clip = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, effect: effectId, start, end: Math.min(duration, start + 3), intensity: .7, trackId: createTimelineLane('media').id };
  effectClips.push(clip); selectedEffectClipId = clip.id; selectedTimelineMediaId = null; selectedMusicClipId = null; syncMediaClipProperties();
  $('#effectLibrary').close();
  renderTextTimeline(); syncEffectProperties(); applyVideoLook();
  scheduleSave(); queueHistory();
}

$('#browseEffects').addEventListener('click', () => $('#effectLibrary').showModal());
$('#closeEffects').addEventListener('click', () => $('#effectLibrary').close());
$$('.effect-card').forEach(card => card.addEventListener('click', () => addEffectClip(card.dataset.effect)));
$$('.effect-categories button').forEach(button => button.addEventListener('click', () => {
  $$('.effect-categories button').forEach(item => item.classList.toggle('active', item === button));
  const category = button.dataset.effectCategory;
  $$('.effect-card').forEach(card => { card.hidden = category !== 'All' && category !== 'All effects' && !card.querySelector('small').textContent.includes(category); });
}));
function updateSelectedEffectFromFields() {
  const selected = effectClips.find(item => item.id === selectedEffectClipId);
  if (!selected) return;
  const duration = videoPreview.duration;
  const start = Number($('#effectStart').value), end = Number($('#effectEnd').value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end <= start) {
    syncEffectProperties(); return;
  }
  selected.start = start; selected.end = end;
  applyVideoLook(); renderTextTimeline(); scheduleSave(); queueHistory();
}
$('#effectStart').addEventListener('change', updateSelectedEffectFromFields);
$('#effectEnd').addEventListener('change', updateSelectedEffectFromFields);
$('#effectIntensity').addEventListener('input', () => {
  const selected = effectClips.find(item => item.id === selectedEffectClipId);
  if (!selected) return;
  selected.intensity = Number($('#effectIntensity').value);
  applyVideoLook(); scheduleSave();
});
$('#effectIntensity').addEventListener('change', queueHistory);
$('#removeEffect').addEventListener('click', () => {
  effectClips = effectClips.filter(item => item.id !== selectedEffectClipId); selectedEffectClipId = null;
  pruneEmptyTimelineLanes();
  syncEffectProperties(); renderTextTimeline(); applyVideoLook(); scheduleSave(); queueHistory();
});

function loadMusic(file, start = timelineCursorTime || 0, end = null, offset = 0, id = null, trackId = null, assetId = null, waveform = null) {
  if (!file || (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name))) return showToast('Choose an audio file for the music track.');
  const url = URL.createObjectURL(file);
  const audio = new Audio();
  audio.preload = 'auto'; audio.src = url;
  const savedLane = timelineLanes.find(lane => lane.id === trackId && lane.type === 'music' && !timelineLocks.has(lane.id));
  const libraryAsset = mediaAssets.find(asset => asset.id === assetId);
  const lane = savedLane || timelineLanes.find(item => item.type === 'music' && !timelineLocks.has(item.id)) || createTimelineLane('music');
  const clip = { id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, url, audio, start: Math.max(0, Number(start) || 0), end: end === null ? null : Number(end), offset: Math.max(0, Number(offset) || 0), trackId: lane.id, assetId, waveform: waveform || libraryAsset?.waveform || null, sourceNode: null, gainNode: null };
  if (!isRestoring) { selectedMusicClipId = clip.id; selectedTimelineMediaId = null; selectedEffectClipId = null; syncEffectProperties(); }
  musicClips.push(clip);
  audio.onloadedmetadata = () => {
    clip.offset = Math.min(clip.offset, Math.max(0, audio.duration - .1));
    const sourceEnd = clip.start + audio.duration - clip.offset;
    clip.end = clip.end === null ? sourceEnd : Math.min(clip.end, sourceEnd);
    clip.start = Math.min(clip.start, Math.max(0, clip.end - .1));
    renderTextTimeline(); syncMusicPlayback(); scheduleSave();
    if (!isRestoring) queueHistory();
  };
  audio.onerror = () => { removeMusicClip(clip.id); showToast('This audio file could not be loaded.'); };
  renderTextTimeline(); scheduleSave();
  if (!isRestoring) queueHistory();
  return clip;
}

function removeMusicClip(id, prune = true) {
  const clip = musicClips.find(item => item.id === id);
  if (!clip) return;
  clip.audio.onloadedmetadata = null;
  clip.audio.onerror = null;
  clip.audio.pause(); clip.audio.removeAttribute('src'); clip.audio.load();
  clip.sourceNode?.disconnect(); clip.gainNode?.disconnect();
  URL.revokeObjectURL(clip.url);
  musicClips = musicClips.filter(item => item.id !== id);
  if (selectedMusicClipId === id) selectedMusicClipId = null;
  if (prune) pruneEmptyTimelineLanes();
  renderTextTimeline(); scheduleSave();
}

function clearMusic(prune = true) {
  musicClips.slice().forEach(clip => removeMusicClip(clip.id, prune));
}

function restoreMusicClips(clips) {
  clearMusic(false);
  clips.forEach(clip => loadMusic(clip.file, clip.start, clip.end ?? null, clip.offset || 0, clip.id, clip.trackId, clip.assetId, clip.waveform));
  pruneEmptyTimelineLanes();
}

async function ensureMusicAudioGraph() {
  if (!musicClips.length) return null;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) throw new Error('Web Audio is unavailable');
  if (!musicAudioContext) {
    musicAudioContext = new AudioContextType();
    musicCaptureDestination = musicAudioContext.createMediaStreamDestination();
  }
  musicClips.forEach(clip => {
    if (clip.sourceNode) return;
    clip.sourceNode = musicAudioContext.createMediaElementSource(clip.audio);
    clip.gainNode = musicAudioContext.createGain();
    clip.sourceNode.connect(clip.gainNode);
    clip.gainNode.connect(musicAudioContext.destination);
    clip.gainNode.connect(musicCaptureDestination);
  });
  if (musicAudioContext.state === 'suspended') await musicAudioContext.resume();
  return musicCaptureDestination;
}

function syncMusicPlayback() {
  const time = timelineCursorTime;
  musicClips.forEach(clip => {
    const end = clip.end ?? (clip.start + (Number(clip.audio.duration) || 0) - clip.offset);
    const target = clip.offset + time - clip.start;
    const active = time >= clip.start && time < end && target >= 0 && target < clip.audio.duration;
    if (!active) { clip.audio.pause(); return; }
    if (Math.abs(clip.audio.currentTime - target) > .35) clip.audio.currentTime = target;
    if (!timelinePlaying) clip.audio.pause();
    else if (clip.audio.paused) clip.audio.play().catch(() => {});
  });
}

$('#muteOriginalAudio').addEventListener('change', event => {
  muteOriginalAudio = event.target.checked;
  videoPreview.muted = muteOriginalAudio;
  scheduleSave();
  queueHistory();
  showToast(muteOriginalAudio ? 'Original video audio muted.' : 'Original video audio restored.');
});

$('#addMusic').addEventListener('click', () => { $('#musicLibrary').showModal(); renderMusicLibrary(); });
$('#closeMusicLibrary').addEventListener('click', () => $('#musicLibrary').close());
$('#musicLibrary').addEventListener('close', stopLibraryPreview);
$('#browseMusic').addEventListener('click', () => $('#browseMusicDialog').showModal());
$('#closeBrowseMusic').addEventListener('click', () => $('#browseMusicDialog').close());
$('#chooseLocalMusic').addEventListener('click', () => {
  $('#musicLibrary').close();
  $('#musicPicker').click();
});
$('#musicPicker').addEventListener('change', event => {
  const files = [...event.target.files];
  if (!files.length) return;
  addMusicFilesSequentially(files);
  event.target.value = '';
});

async function addMusicFilesSequentially(files) {
  let start = timelineCursorTime;
  for (const file of files) {
    if (file.size > 500 * 1024 * 1024) { showToast(`${file.name} is over the 500 MB limit.`); continue; }
    const asset = registerMediaAsset(file);
    const clip = loadMusic(file, start, null, 0, null, null, asset?.id, asset?.waveform);
    if (!clip) continue;
    saveMusicLibraryAsset(file).catch(() => showToast('Music was added to the project, but could not be saved in the local library.'));
    if (!(Number.isFinite(clip.audio.duration) && clip.audio.duration > 0)) {
      await new Promise(resolve => {
        clip.audio.addEventListener('loadedmetadata', resolve, { once: true });
        clip.audio.addEventListener('error', resolve, { once: true });
      });
    }
    start = Math.max(start, Number(clip.end) || (clip.start + (Number(clip.audio.duration) || 0)));
  }
}
$('#removeMusic').addEventListener('click', () => { clearMusic(); scheduleSave(); queueHistory(); });
videoPreview.addEventListener('play', () => {
  if (!timelinePlaying) {
    timelinePlaying = true; timelineLastFrameTime = performance.now();
    $('#timelinePlayButton').textContent = '❚❚'; $('#timelinePlayButton').setAttribute('aria-label', 'Pause timeline');
    if (!playheadAnimationFrame) playheadAnimationFrame = requestAnimationFrame(animateTimelinePlayhead);
  }
  updateMediaResizeOverlay();
  syncMusicPlayback();
  if (musicClips.length) ensureMusicAudioGraph().then(syncMusicPlayback).catch(() => {});
});
videoPreview.addEventListener('pause', () => {
  if (internalPreviewPauses.has(videoPreview)) { internalPreviewPauses.delete(videoPreview); return; }
  if (videoPreview.ended) return;
  pauseTimelinePlayback();
});
videoPreview.addEventListener('ended', () => { if (timelinePlaying) internalPreviewPauses.add(videoPreview); });
videoPreview.addEventListener('seeked', () => {
  const guidePreview = timelineGuidePreviewActive && !timelinePlaying;
  const primary = timelineMediaClips.find(clip => clip.isPrimary && videoPreview.currentTime >= (clip.sourceOffset || 0) && videoPreview.currentTime < (clip.sourceOffset || 0) + clip.end - clip.start);
  if (primary && !timelinePlaying && !guidePreview) timelineCursorTime = primary.start + videoPreview.currentTime - (primary.sourceOffset || 0);
  syncMusicPlayback();
  if (guidePreview) updateTextVisibility(timelineGuideTime);
  else renderTimelinePreviewAt(timelineCursorTime);
  updateTimelinePlayhead();
});

$('#timelinePlayButton').addEventListener('click', () => timelinePlaying ? pauseTimelinePlayback() : startTimelinePlayback());

function pausePreviewElement(element) {
  if (element && !element.paused) { internalPreviewPauses.add(element); element.pause(); }
}

function startTimelinePlayback() {
  const duration = getTimelineDuration();
  if (!duration) return;
  if (timelineCursorTime >= duration) timelineCursorTime = 0;
  timelinePlaying = true; timelineLastFrameTime = performance.now();
  updateMediaResizeOverlay();
  $('#timelinePlayButton').textContent = '❚❚'; $('#timelinePlayButton').setAttribute('aria-label', 'Pause timeline');
  renderTimelinePreviewAt(timelineCursorTime); updateTextVisibility(); syncMusicPlayback();
  if (musicClips.length) ensureMusicAudioGraph().then(syncMusicPlayback).catch(() => {});
  if (playheadAnimationFrame) cancelAnimationFrame(playheadAnimationFrame);
  playheadAnimationFrame = requestAnimationFrame(animateTimelinePlayhead);
}

function pauseTimelinePlayback() {
  timelinePlaying = false; timelineLastFrameTime = 0;
  if (playheadAnimationFrame) cancelAnimationFrame(playheadAnimationFrame);
  playheadAnimationFrame = 0;
  pausePreviewElement(videoPreview); pausePreviewElement(timelineClipVideo);
  musicClips.forEach(clip => clip.audio.pause());
  $('#timelinePlayButton').textContent = '▶'; $('#timelinePlayButton').setAttribute('aria-label', 'Play timeline');
  updateTimelinePlayhead();
  updateMediaResizeOverlay();
}

function getActiveTimelineMediaClip(time) {
  return timelineMediaClips
    .filter(clip => time >= clip.start && time < clip.end && mediaAssets.some(asset => asset.id === clip.assetId))
    .sort((a, b) => timelineLanes.findIndex(lane => lane.id === a.trackId) - timelineLanes.findIndex(lane => lane.id === b.trackId) || a.start - b.start)
    .at(-1) || null;
}

function clampMediaScale(value) {
  return Math.max(.12, Math.min(3, Number(value) || 1));
}

function getTimelineMediaScale(clip) {
  return clampMediaScale(clip?.scale);
}

function applyTimelineMediaPreviewScale(clip, element) {
  if (!clip || !element) return;
  if (element === photo) applyPhotoTransform(getTimelineMediaScale(clip));
  else if (element === videoPreview) applyMediaMotionPreview();
  else {
    element.style.transformOrigin = 'center center';
    element.style.transform = `scale(${getTimelineMediaScale(clip)})`;
  }
}

function updateMediaResizeOverlay() {
  if (!mediaResizeOverlay) return;
  const clip = getActiveTimelineMediaClip(timelineCursorTime);
  const element = clip ? getTimelinePreviewElement(timelineCursorTime) : null;
  const unavailable = !clip || clip.id !== selectedTimelineMediaId || !element || element.hidden || timelinePlaying || timelineGuidePreviewActive || textToolActive || !$('#cropToolbar').hidden;
  if (unavailable) {
    mediaResizeOverlay.hidden = true;
    mediaResizeOverlay.setAttribute('aria-hidden', 'true');
    return;
  }
  const stageRect = stage.getBoundingClientRect();
  const mediaRect = element.getBoundingClientRect();
  if (!mediaRect.width || !mediaRect.height) {
    mediaResizeOverlay.hidden = true;
    mediaResizeOverlay.setAttribute('aria-hidden', 'true');
    return;
  }
  mediaResizeOverlay.style.left = `${mediaRect.left - stageRect.left}px`;
  mediaResizeOverlay.style.top = `${mediaRect.top - stageRect.top}px`;
  mediaResizeOverlay.style.width = `${mediaRect.width}px`;
  mediaResizeOverlay.style.height = `${mediaRect.height}px`;
  const visibleHandleX = Math.max(12, Math.min(mediaRect.width - 12, stageRect.right - mediaRect.left - 12));
  const visibleHandleY = Math.max(12, Math.min(mediaRect.height - 12, stageRect.bottom - mediaRect.top - 12));
  mediaResizeHandle.style.left = `${visibleHandleX}px`;
  mediaResizeHandle.style.top = `${visibleHandleY}px`;
  mediaResizeValue.textContent = `${Math.round(getTimelineMediaScale(clip) * 100)}%`;
  mediaResizeOverlay.hidden = false;
  mediaResizeOverlay.setAttribute('aria-hidden', 'false');
}

function setTimelineMediaScale(clip, scale) {
  if (!clip) return;
  clip.scale = clampMediaScale(scale);
  if (clip.id === activeTimelinePreviewClipId) {
    applyTimelineMediaPreviewScale(clip, getTimelinePreviewElement(timelineCursorTime));
    applyAnimatedTextPositions(timelineCursorTime);
  }
  updateMediaResizeOverlay();
}

window.addEventListener('resize', updateMediaResizeOverlay);

mediaResizeHandle.addEventListener('pointerdown', event => {
  const clip = getActiveTimelineMediaClip(timelineCursorTime);
  if (!clip || clip.id !== selectedTimelineMediaId) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = mediaResizeOverlay.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const startDistance = Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY));
  const startingScale = getTimelineMediaScale(clip);
  mediaResizeHandle.setPointerCapture?.(event.pointerId);
  const move = moveEvent => {
    const distance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
    setTimelineMediaScale(clip, startingScale * distance / startDistance);
  };
  const finish = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
    scheduleSave();
    queueHistory();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', finish, { once: true });
  window.addEventListener('pointercancel', finish, { once: true });
});

mediaResizeHandle.addEventListener('dblclick', event => {
  event.preventDefault();
  const clip = getActiveTimelineMediaClip(timelineCursorTime);
  if (!clip || clip.id !== selectedTimelineMediaId) return;
  setTimelineMediaScale(clip, 1);
  scheduleSave();
  queueHistory();
});

mediaResizeHandle.addEventListener('keydown', event => {
  const clip = getActiveTimelineMediaClip(timelineCursorTime);
  if (!clip || clip.id !== selectedTimelineMediaId) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    setTimelineMediaScale(clip, 1);
  } else if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
    event.preventDefault();
    const step = event.shiftKey ? .1 : .05;
    const direction = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1;
    setTimelineMediaScale(clip, getTimelineMediaScale(clip) + step * direction);
  } else return;
  scheduleSave();
  queueHistory();
});

function renderTimelinePreviewAt(time, guidePreview = false) {
  timelineGuidePreviewActive = Boolean(guidePreview && !timelinePlaying);
  const isGuidePreview = timelineGuidePreviewActive;
  const clip = getActiveTimelineMediaClip(time);
  const asset = clip && mediaAssets.find(item => item.id === clip.assetId);
  const secondaryVideo = timelineClipVideo;
  const primaryVideo = clip?.isPrimary && isVideo;
  const primaryImage = clip?.isPrimary && !isVideo;
  stage.classList.toggle('timeline-gap', !clip || !asset);
  if (!clip || !asset) {
    photo.hidden = true; videoPreview.hidden = true; timelineClipImage.hidden = true; secondaryVideo.hidden = true;
    pausePreviewElement(videoPreview); pausePreviewElement(secondaryVideo); activeTimelinePreviewClipId = null;
    updateMediaResizeOverlay();
    updateTextVisibility(time); return;
  }
  const sourceTime = Math.max(0, (clip.sourceOffset || 0) + time - clip.start);
  const seekThreshold = isGuidePreview ? .05 : .45;
  if (primaryVideo) {
    timelineClipImage.hidden = true; secondaryVideo.hidden = true; photo.hidden = true; videoPreview.hidden = false;
    pausePreviewElement(secondaryVideo);
    if (videoPreview.readyState >= 1 && (videoPreview.ended || Math.abs(videoPreview.currentTime - sourceTime) > seekThreshold)) videoPreview.currentTime = Math.min(sourceTime, Math.max(0, videoPreview.duration - .01));
    if (timelinePlaying && videoPreview.paused && !videoPreview.ended) videoPreview.play().catch(() => {});
    else if (!timelinePlaying) pausePreviewElement(videoPreview);
  } else if (primaryImage) {
    pausePreviewElement(videoPreview); pausePreviewElement(secondaryVideo);
    videoPreview.hidden = true; timelineClipImage.hidden = true; photo.hidden = false;
  } else if (asset.kind === 'image') {
    pausePreviewElement(videoPreview); pausePreviewElement(secondaryVideo);
    photo.hidden = true; videoPreview.hidden = true; secondaryVideo.hidden = true;
    if (timelineClipImage.src !== asset.url) timelineClipImage.src = asset.url;
    timelineClipImage.hidden = false;
  } else if (asset.kind === 'video') {
    pausePreviewElement(videoPreview); photo.hidden = true; timelineClipImage.hidden = true; secondaryVideo.hidden = false;
    secondaryVideo.muted = false;
    if (secondaryVideo.dataset.assetId !== asset.id) {
      pausePreviewElement(secondaryVideo); secondaryVideo.dataset.assetId = asset.id; secondaryVideo.src = asset.url;
      secondaryVideo.onloadedmetadata = () => {
        const previewTime = timelineGuidePreviewActive && !timelinePlaying ? timelineGuideTime : timelineCursorTime;
        const current = getActiveTimelineMediaClip(previewTime);
        if (current?.assetId !== asset.id) return;
        const source = Math.max(0, (current.sourceOffset || 0) + previewTime - current.start);
        secondaryVideo.currentTime = Math.min(source, Math.max(0, secondaryVideo.duration - .01));
        if (timelinePlaying) secondaryVideo.play().catch(() => {});
      };
      secondaryVideo.load();
    }
    if (secondaryVideo.readyState >= 1 && (secondaryVideo.ended || Math.abs(secondaryVideo.currentTime - sourceTime) > seekThreshold)) secondaryVideo.currentTime = Math.min(sourceTime, Math.max(0, secondaryVideo.duration - .01));
    if (timelinePlaying && secondaryVideo.paused && !secondaryVideo.ended) secondaryVideo.play().catch(() => {});
    else if (!timelinePlaying) pausePreviewElement(secondaryVideo);
  }
  activeTimelinePreviewClipId = clip.id;
  const previewElement = primaryVideo ? videoPreview : primaryImage ? photo : asset.kind === 'image' ? timelineClipImage : secondaryVideo;
  applyTimelineMediaPreviewScale(clip, previewElement);
  if (!isGuidePreview) updateTimelinePlayhead();
  updateTextVisibility(time);
  updateMediaResizeOverlay();
}

function updateTimelinePlayhead() {
  const tracks = $('#timelineTracks'), duration = getTimelineDuration();
  const playhead = tracks.querySelector('.timeline-playhead');
  const currentTime = timelineCursorTime;
  if (playhead && duration) {
    const percent = Math.max(0, Math.min(100, currentTime / duration * 100));
    playhead.style.left = `${percent}%`;
    playhead.setAttribute('aria-valuemin', '0'); playhead.setAttribute('aria-valuemax', String(duration)); playhead.setAttribute('aria-valuenow', String(currentTime));
  }
  const timecode = $('#timelineCurrentTime');
  if (timecode) timecode.textContent = formatDuration(currentTime);
}

function animateTimelinePlayhead() {
  if (!timelinePlaying) { playheadAnimationFrame = 0; return; }
  const now = performance.now();
  if (timelineLastFrameTime) timelineCursorTime += Math.min(.1, Math.max(0, (now - timelineLastFrameTime) / 1000));
  timelineLastFrameTime = now;
  const duration = getTimelineDuration();
  if (timelineCursorTime >= duration) {
    timelineCursorTime = duration; renderTimelinePreviewAt(timelineCursorTime); syncMusicPlayback(); pauseTimelinePlayback(); return;
  }
  renderTimelinePreviewAt(timelineCursorTime); syncMusicPlayback(); updateTimelinePlayhead();
  playheadAnimationFrame = requestAnimationFrame(animateTimelinePlayhead);
}

function updateTimelineGuideMarker() {
  const duration = getTimelineDuration(), marker = $('#timelineTracks .timeline-guide-marker');
  if (!marker || !duration) return;
  const percent = Math.max(0, Math.min(100, timelineGuideTime / duration * 100));
  marker.style.left = `${percent}%`;
  const timeLabel = marker.querySelector('.timeline-guide-time');
  if (timeLabel) {
    timeLabel.textContent = formatDuration(timelineGuideTime);
    timeLabel.style.left = percent > 78 ? 'auto' : '5px';
    timeLabel.style.right = percent > 78 ? '5px' : 'auto';
  }
  updateTimelineGuideClipHighlights(timelineGuideTime);
}

function updateTimelineGuideClipHighlights(time) {
  const isActive = (start, end) => time >= Number(start ?? 0) && time < Number(end ?? Infinity);
  $$('#timelineTracks .media-edit-clip').forEach(element => {
    const clip = timelineMediaClips.find(item => item.id === element.dataset.clipId);
    element.classList.toggle('guide-active', Boolean(clip && isActive(clip.start, clip.end)));
  });
  $$('#timelineTracks .effect-clip').forEach(element => {
    const clip = effectClips.find(item => item.id === element.dataset.effectId);
    element.classList.toggle('guide-active', Boolean(clip && isActive(clip.start, clip.end)));
  });
  $$('#timelineTracks .text-clip').forEach(element => {
    const item = textItems.find(candidate => candidate.id === element.dataset.textId);
    element.classList.toggle('guide-active', Boolean(item && isActive(item.start, item.end)));
  });
  $$('#timelineTracks .music-clip').forEach(element => {
    const clip = musicClips.find(item => item.id === element.dataset.musicId);
    const end = clip?.end ?? (clip ? clip.start + (Number(clip.audio?.duration) || 0) - (Number(clip.offset) || 0) : 0);
    element.classList.toggle('guide-active', Boolean(clip && isActive(clip.start, end)));
  });
}

function getTimelineDuration() {
  const ends = [
    ...timelineMediaClips.map(clip => Number(clip.end) || 0),
    ...musicClips.map(clip => Number(clip.end) || (Number(clip.start) + (Number(clip.audio?.duration) || 0))),
    ...effectClips.map(clip => Number(clip.end) || 0),
    ...textItems.map(item => Number(item.end) || 0)
  ];
  return Math.max(0, ...ends);
}

function setTimelineCursorTime(time) {
  const duration = getTimelineDuration();
  timelineCursorTime = Math.max(0, Math.min(duration, Number(time) || 0));
  renderTimelinePreviewAt(timelineCursorTime); syncMusicPlayback(); updateTimelinePlayhead();
}

function getTimelineTimeFromPointer(event) {
  const tracks = $('#timelineTracks');
  const rect = tracks.getBoundingClientRect(), duration = getTimelineDuration();
  if (!duration || !rect.width) return null;
  return Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration));
}

function updateTimelineGuideFromPointer(event) {
  const time = getTimelineTimeFromPointer(event);
  if (time === null) return;
  timelineGuideTime = time;
  updateTimelineGuideMarker();
  if (!timelinePlaying && event.buttons === 0) renderTimelinePreviewAt(time, true);
}

function seekTimelineFromPointer(event) {
  const time = getTimelineTimeFromPointer(event);
  if (time === null) return;
  setTimelineCursorTime(time);
}

function beginTimelineScrub(event) {
  if (event.button !== 0 || event.target.closest('.timeline-clip,.timeline-label,button')) return;
  event.preventDefault(); event.stopPropagation();
  seekTimelineFromPointer(event);
  const move = moveEvent => seekTimelineFromPointer(moveEvent);
  const finish = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', finish, { once: true });
  window.addEventListener('pointercancel', finish, { once: true });
}

function getTextPosition(item, time) {
  const frames = [...(item.keyframes || [])].sort((a, b) => a.time - b.time);
  if (!frames.length || time === null) return { x: item.x, y: item.y };
  if (time <= frames[0].time) return { x: frames[0].x, y: frames[0].y };
  const last = frames[frames.length - 1];
  if (time >= last.time) return { x: last.x, y: last.y };
  const nextIndex = frames.findIndex(frame => frame.time >= time);
  const before = frames[nextIndex - 1], after = frames[nextIndex];
  const ratio = (time - before.time) / (after.time - before.time);
  return { x: before.x + (after.x - before.x) * ratio, y: before.y + (after.y - before.y) * ratio };
}

function setTextKeyframe(item, time, x, y) {
  item.keyframes ||= [];
  const existing = item.keyframes.find(frame => Math.abs(frame.time - time) < .05);
  if (existing) { existing.time = time; existing.x = x; existing.y = y; }
  else item.keyframes.push({ time, x, y });
  item.keyframes.sort((a, b) => a.time - b.time);
}

function syncKeyframeStatus(item) {
  const count = item.keyframes?.length || 0;
  $('#keyframeStatus').textContent = count
    ? `${count} keyframe${count === 1 ? '' : 's'} · drag the text after seeking to animate its position.`
    : 'Add a keyframe, seek to another time, then add one and move the text.';
}

function applyAnimatedTextPositions(time = timelineCursorTime) {
  $$('#textLayer .text-object').forEach(object => {
    const item = textItems.find(candidate => candidate.id === object.dataset.id);
    if (item) {
      positionTextObject(object, { ...item, ...getTextPosition(item, time) }, time);
      applyTextAnimationPreview(object, item, time);
    }
  });
}

$('#addTextKeyframe').addEventListener('click', () => {
  const item = textItems.find(candidate => candidate.id === selectedTextId);
  if (!item || !originalFile) return;
  const time = timelineCursorTime;
  const position = getTextPosition(item, time);
  setTextKeyframe(item, time, position.x, position.y);
  item.x = position.x; item.y = position.y;
  syncKeyframeStatus(item);
  applyAnimatedTextPositions();
  renderTextTimeline();
  scheduleSave(); queueHistory();
});

function textIsVisibleAt(item, time) {
  return time === null || item.start === undefined || item.end === undefined || (time >= item.start && time < item.end);
}

function updateTextVisibility(time = timelineCursorTime) {
  $$('#textLayer .text-object').forEach(object => {
    const item = textItems.find(candidate => candidate.id === object.dataset.id);
    object.hidden = !item || !textIsVisibleAt(item, time);
  });
  applyAnimatedTextPositions(time);
}

function motionPhaseState(effect, phase, progress, elapsed = 0) {
  const p = Math.max(0, Math.min(1, progress));
  const eased = 1 - (1 - p) ** 3;
  const state = { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, blur: 0, reveal: 1 };
  const entering = phase === 'entry';
  const exiting = phase === 'exit';
  if (effect === 'fadeIn' || effect === 'fade' || effect === 'scrollReveal') state.opacity = entering ? eased : 1 - eased;
  if (effect === 'fadeOut') state.opacity = exiting ? 1 - eased : eased;
  if (['slideUp','slideIn','slideLeft','slideRight','slideDown','slideOut'].includes(effect)) {
    const distance = entering ? 0.08 * (1 - eased) : 0.08 * eased;
    const direction = effect === 'slideUp' ? 1 : effect === 'slideDown' ? -1 : effect === 'slideLeft' ? 1 : effect === 'slideRight' ? -1 : effect === 'slideOut' ? 1 : 1;
    if (effect === 'slideLeft' || effect === 'slideRight' || effect === 'slideIn' || effect === 'slideOut') state.x = direction * distance;
    else state.y = direction * distance;
    state.opacity = entering ? eased : exiting ? 1 - eased : 1;
  }
  if (['zoomIn','zoom','popUp','pop','scale','kenBurns','imageReveal'].includes(effect)) {
    const from = effect === 'popUp' || effect === 'pop' ? .68 : .78;
    state.scale = entering ? from + (1 - from) * eased : exiting ? 1 - .22 * eased : 1.05 + .05 * Math.sin(elapsed * Math.PI * 2);
    if (entering || exiting) state.opacity = entering ? eased : 1 - eased;
  }
  if (effect === 'zoomOut') { state.scale = exiting ? 1 - .28 * eased : 1; state.opacity = exiting ? 1 - eased : 1; }
  if (effect === 'rotate') state.rotation = entering ? (1 - eased) * -180 : Math.sin(elapsed * Math.PI * 2) * 4;
  if (effect === 'flip') state.rotation = entering ? (1 - eased) * 90 : Math.sin(elapsed * Math.PI * 2) * 6;
  if (effect === 'bounce' || effect === 'spring' || effect === 'springLoop') state.y = entering ? -.04 * Math.sin(p * Math.PI * 2) * (1 - p) : Math.sin(elapsed * Math.PI * 2) * .025;
  if (effect === 'blurIn' || effect === 'blurOut' || effect === 'blur') { state.blur = entering ? (1 - eased) * 12 : exiting ? eased * 12 : 0; state.opacity = entering ? eased : exiting ? 1 - eased : 1; }
  if (effect === 'wipeReveal' || effect === 'maskReveal' || effect === 'imageReveal' || effect === 'textReveal' || effect === 'splitText') state.reveal = entering ? eased : exiting ? 1 - eased : 1;
  if (effect === 'typewriter') state.reveal = entering ? p : 1;
  if (effect === 'stagger') { state.opacity = eased; state.y = .04 * (1 - eased); }
  if (effect === 'shake' || effect === 'glitch') { state.x = (Math.sin(elapsed * 47) * .008) + (effect === 'glitch' ? Math.sin(elapsed * 103) * .006 : 0); state.y = Math.sin(elapsed * 61) * .006; }
  if (effect === 'pulse' || effect === 'loop') state.scale = 1 + .045 * Math.sin(elapsed * Math.PI * 2);
  if (effect === 'floating' || effect === 'wave' || effect === 'parallax' || effect === 'morph') { state.y = Math.sin(elapsed * Math.PI * 2) * .025; state.x = effect === 'parallax' ? Math.sin(elapsed * Math.PI) * .02 : Math.sin(elapsed * Math.PI * 2) * .01; if (effect === 'morph') state.scale = 1 + .025 * Math.sin(elapsed * Math.PI * 2); }
  return state;
}

function textAnimationState(item, time) {
  const state = { opacity: 1, scale: 1, offsetY: 0, offsetX: 0, rotation: 0, blur: 0, reveal: 1 };
  const duration = Math.max(.1, Number(item.animationDuration ?? textStyleDefaults.animationDuration));
  if (time === null) return state;
  const visibleStart = Number(item.start ?? 0), visibleEnd = Number(item.end ?? Infinity);
  const merge = (effect, phase, progress, elapsed) => {
    if (!effect || effect === 'none') return;
    const next = motionPhaseState(effect, phase, progress, elapsed);
    state.opacity *= next.opacity; state.scale *= next.scale;
    state.offsetX += next.x; state.offsetY += next.y;
    state.rotation += next.rotation; state.blur = Math.max(state.blur, next.blur);
    state.reveal = Math.min(state.reveal, next.reveal);
  };
  if (item.animation && time >= visibleStart) merge(item.animation, 'entry', (time - visibleStart) / duration, time - visibleStart);
  if (item.exitAnimation && time >= visibleEnd - duration) merge(item.exitAnimation, 'exit', (time - (visibleEnd - duration)) / duration, time - (visibleEnd - duration));
  if (item.loopAnimation && time >= visibleStart) merge(item.loopAnimation, 'loop', ((time - visibleStart) % duration) / duration, time - visibleStart);
  return state;
}

function applyTextAnimationPreview(object, item, time) {
  const animation = textAnimationState(item, time);
  object.style.opacity = String((Number(item.opacity ?? textStyleDefaults.opacity) / 100) * animation.opacity);
  object.style.transform = `translate(-50%, -50%) translate(${animation.offsetX * stage.clientWidth}px, ${animation.offsetY * stage.clientHeight}px) scale(${animation.scale}) rotate(${Number(item.rotation ?? 0) + animation.rotation}deg)`;
  object.style.filter = animation.blur ? `blur(${animation.blur}px)` : 'none';
  object.style.clipPath = animation.reveal < 1 ? `inset(0 ${(1 - animation.reveal) * 100}% 0 0)` : 'none';
}

function updateSelectedTextTiming() {
  const item = textItems.find(candidate => candidate.id === selectedTextId);
  if (!item || !originalFile) return;
  const duration = getTimelineDuration();
  const start = Number($('#textStart').value);
  const end = Number($('#textEnd').value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration) {
    $('#trimStatus').textContent = `Set text timing between 0 and ${duration.toFixed(1)} seconds, with hide time after show time.`;
    return;
  }
  item.start = start;
  item.end = end;
  $('#textDuration').textContent = `Duration: ${(end - start).toFixed(1)}s`;
  updateTextVisibility();
  scheduleSave(); queueHistory();
  $('#trimStatus').textContent = `Text appears from ${start.toFixed(1)}s to ${end.toFixed(1)}s.`;
  renderTextTimeline();
}

function positionTextObject(object, item, time = timelineCursorTime) {
  const media = getTimelinePreviewElement(time);
  const mediaRect = media.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const x = (mediaRect.left - stageRect.left + item.x * mediaRect.width) / stage.clientWidth;
  const y = (mediaRect.top - stageRect.top + item.y * mediaRect.height) / stage.clientHeight;
  object.style.left = `${x * 100}%`;
  object.style.top = `${y * 100}%`;
}

function getTimelinePreviewElement(time = timelineCursorTime) {
  const clip = getActiveTimelineMediaClip(time);
  const asset = clip && mediaAssets.find(candidate => candidate.id === clip.assetId);
  if (!clip || !asset) return isVideo ? videoPreview : photo;
  if (clip.isPrimary) return isVideo ? videoPreview : photo;
  return asset.kind === 'image' ? timelineClipImage : asset.kind === 'video' ? timelineClipVideo : (isVideo ? videoPreview : photo);
}

function resizeTextInput(input) {
  input.style.height = 'auto';
  input.style.height = `${Math.max(38, input.scrollHeight)}px`;
}

$('#textToolButton').addEventListener('click', () => {
  if (!originalUrl) return showToast('Choose a photo or video before adding text.');
  textToolActive = !textToolActive;
  $('#textToolButton').classList.toggle('selected', textToolActive);
  $('#dropZone').classList.toggle('text-mode', textToolActive);
  updateMediaResizeOverlay();
  if (textToolActive) showToast('Click on the photo or video to place text.');
});

stage.addEventListener('click', event => {
  if (![photo, videoPreview, timelineClipImage, timelineClipVideo].includes(event.target)) return;
  if (!textToolActive) {
    if (selectedTextId !== null) { selectedTextId = null; syncTextTimingPanel(); }
    const clip = getActiveTimelineMediaClip(timelineGuidePreviewActive ? timelineGuideTime : timelineCursorTime);
    if (clip) {
      selectedTimelineMediaId = clip.id;
      selectedMusicClipId = null;
      selectedEffectClipId = null;
      syncMediaClipProperties();
      renderTextTimeline();
      updateMediaResizeOverlay();
      scheduleSave();
    }
    return;
  }
  const mediaRect = event.target.getBoundingClientRect();
  const x = Math.max(.03, Math.min(.97, (event.clientX - mediaRect.left) / mediaRect.width));
  const y = Math.max(.04, Math.min(.96, (event.clientY - mediaRect.top) / mediaRect.height));
  const duration = getTimelineDuration();
  const item = { ...textStyleDefaults, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, x, y, text: '', start: Math.min(timelineCursorTime, Math.max(0, duration - .1)), end: duration || timelineCursorTime + defaultImageClipDuration, trackId: createTimelineLane('text').id };
  textItems.push(item);
  selectedTextId = item.id;
  textToolActive = false;
  $('#textToolButton').classList.remove('selected');
  stage.classList.remove('text-mode');
  renderTextItems();
  const inputs = $$('#textLayer textarea');
  inputs[inputs.length - 1].focus();
  updateMediaResizeOverlay();
  scheduleSave(); queueHistory();
});

function drawTextOverlays(context, width, height, time = null) {
  textItems.forEach(item => {
    if (!textIsVisibleAt(item, time) || !item.text) return;
    const style = { ...textStyleDefaults, ...item };
    const animation = textAnimationState(item, time);
    const position = getTextPosition(item, time);
    const fontSize = Math.max(8, Math.round(width * .045 * Number(style.fontSize) / 25));
    const text = item.animation === 'typewriter' && animation.reveal < 1
      ? [...item.text].slice(0, Math.ceil([...item.text].length * animation.reveal)).join('')
      : item.text;
    const lines = text.split('\n');
    const lineHeight = fontSize * Number(style.lineSpacing);
    const centerY = position.y * height + animation.offsetY * height;
    const centerX = position.x * width + animation.offsetX * width;
    const anchorX = centerX + (style.alignment === 'left' ? -width * .43 : style.alignment === 'right' ? width * .43 : 0);
    context.save();
    context.filter = 'none';
    context.globalAlpha *= Number(style.opacity) / 100 * animation.opacity;
    if (animation.blur) context.filter = `blur(${animation.blur * width / 560}px)`;
    context.translate(centerX, centerY);
    context.rotate((Number(style.rotation) + animation.rotation) * Math.PI / 180);
    context.scale(animation.scale, animation.scale);
    context.font = `${style.fontWeight} ${fontSize}px "${style.fontFamily}", Arial, sans-serif`;
    context.textAlign = style.alignment;
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    const maxWidth = width * .86;
    const lineWidths = lines.map(line => context.measureText(line).width);
    const textWidth = Math.min(maxWidth, Math.max(0, ...lineWidths));
    const left = style.alignment === 'left' ? anchorX - centerX : style.alignment === 'right' ? anchorX - centerX - textWidth : anchorX - centerX - textWidth / 2;
    const firstY = -((lines.length - 1) * lineHeight) / 2;
    if (animation.reveal < 1) {
      context.beginPath();
      context.rect(left, firstY - lineHeight / 2, maxWidth * animation.reveal, lineHeight * lines.length);
      context.clip();
    }
    if (style.backgroundEnabled) {
      context.fillStyle = colorWithAlpha(style.backgroundColor, Number(style.backgroundOpacity) / 100);
      context.fillRect(left - fontSize * .28, firstY - lineHeight / 2, textWidth + fontSize * .56, lineHeight * lines.length);
    }
    const spacing = Number(style.letterSpacing) * (width / 560);
    if ('letterSpacing' in context) context.letterSpacing = `${spacing}px`;
    context.lineWidth = fontSize * Number(style.outlineWidth) / 100;
    lines.forEach((line, index) => {
      const y = firstY + index * lineHeight;
      if (Number(style.glowBlur) > 0) {
        context.save();
        context.shadowColor = style.glowColor;
        context.shadowBlur = Number(style.glowBlur) * width / 560;
        context.strokeStyle = style.glowColor;
        context.fillStyle = style.glowColor;
        context.strokeText(line, anchorX - centerX, y, maxWidth);
        context.fillText(line, anchorX - centerX, y, maxWidth);
        context.restore();
      }
      context.shadowColor = style.shadowColor;
      context.shadowBlur = Number(style.shadowBlur) * width / 560;
      context.strokeStyle = style.outlineColor;
      context.fillStyle = style.color;
      if (style.gradientEnabled) {
        const gradient = context.createLinearGradient(left, y, left + Math.max(1, textWidth), y);
        gradient.addColorStop(0, style.color);
        gradient.addColorStop(1, style.gradientColor);
        context.fillStyle = gradient;
      }
      context.strokeText(line, anchorX - centerX, y, maxWidth);
      context.fillText(line, anchorX - centerX, y, maxWidth);
    });
    if ('letterSpacing' in context) context.letterSpacing = '0px';
    context.restore();
  });
}

function drawVideoTitle(context, width, height) {
  const title = videoTitle.trim();
  if (!title) return;
  const fontSize = Math.max(20, Math.round(width * .052));
  const yByPosition = { top: height * .13, center: height * .5, bottom: height * .87 };
  const baselineByPosition = { top: 'top', center: 'middle', bottom: 'bottom' };
  context.save();
  context.filter = 'none';
  context.font = `700 ${fontSize}px Manrope, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = baselineByPosition[videoTitlePosition] || 'bottom';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(3, fontSize * .12);
  context.strokeStyle = 'rgba(0,0,0,.72)';
  context.fillStyle = '#fff';
  context.strokeText(title, width / 2, yByPosition[videoTitlePosition] || height * .87, width * .84);
  context.fillText(title, width / 2, yByPosition[videoTitlePosition] || height * .87, width * .84);
  context.restore();
}

$('#videoLook').addEventListener('change', () => {
  videoLook = $('#videoLook').value;
  applyVideoLook();
  $('#trimStatus').textContent = 'Exports as WebM in this browser.';
  scheduleSave();
  queueHistory();
});

$('#videoEffect').addEventListener('change', () => {
  videoEffect = $('#videoEffect').value;
  applyVideoLook();
  $('#trimStatus').textContent = 'Effect will be included in the WebM export.';
  scheduleSave(); queueHistory();
});

$('#videoTransition').addEventListener('change', () => {
  videoTransition = $('#videoTransition').value;
  updateVideoFadePreview();
  $('#trimStatus').textContent = videoTransition === 'none' ? 'Transition removed.' : `${$('#videoTransition').selectedOptions[0].textContent} applies at the selected clip edges.`;
  scheduleSave(); queueHistory();
});

videoPreview.addEventListener('timeupdate', () => {
  if (timelinePlaying) {
    const active = timelineMediaClips.find(clip => clip.id === activeTimelinePreviewClipId && clip.isPrimary);
    if (active) timelineCursorTime = Math.max(active.start, Math.min(active.end, active.start + videoPreview.currentTime - (active.sourceOffset || 0)));
  }
  applyVideoLook();
  updateVideoFadePreview();
  updateTextVisibility(timelineGuidePreviewActive && !timelinePlaying ? timelineGuideTime : timelineCursorTime);
  updateTimelinePlayhead();
  syncMusicPlayback();
});
$('#textStart').addEventListener('change', updateSelectedTextTiming);
$('#textEnd').addEventListener('change', updateSelectedTextTiming);
$('#textAnimation').addEventListener('change', event => {
  const item = textItems.find(candidate => candidate.id === selectedTextId);
  if (!item || event.target.value === 'custom') return;
  item.animation = event.target.value;
  updateTextVisibility();
  renderTextTimeline();
  scheduleSave(); queueHistory();
});
function updateSelectedTextStyle(event) {
  const control = event.target.closest('[data-text-property]');
  const item = textItems.find(candidate => candidate.id === selectedTextId);
  if (!control || !item) return;
  const property = control.dataset.textProperty;
  const value = control.type === 'checkbox' ? control.checked : (control.type === 'number' || control.type === 'range' ? Number(control.value) : control.value);
  if (property === 'positionX') item.x = Math.max(.03, Math.min(.97, value / 100));
  else if (property === 'positionY') item.y = Math.max(.04, Math.min(.96, value / 100));
  else item[property] = value;
  if ((property === 'positionX' || property === 'positionY') && item.keyframes?.length) {
    const position = getTextPosition(item, timelineCursorTime);
    if (property === 'positionX') position.x = item.x; else position.y = item.y;
    item.x = position.x; item.y = position.y;
    setTextKeyframe(item, timelineCursorTime, position.x, position.y);
  }
  const object = $(`#textLayer .text-object[data-id="${CSS.escape(item.id)}"]`);
  if (object) {
    applyTextStylePreview(object, item);
    applyAnimatedTextPositions();
    resizeTextInput(object.querySelector('textarea'));
  }
  syncTextStylePanel(item);
  scheduleSave(); queueHistory();
}
$('#textInspector').addEventListener('input', updateSelectedTextStyle);
$('#textInspector').addEventListener('change', updateSelectedTextStyle);
function previewStaticMotion(element, effect, phase) {
  element.getAnimations().forEach(animation => animation.cancel());
  const frames = {
    fadeIn: [{ opacity: 0 }, { opacity: 1 }], fadeOut: [{ opacity: 1 }, { opacity: 0 }],
    slideUp: [{ transform: 'translateY(50px)' }, { transform: 'translateY(0)' }], slideDown: [{ transform: 'translateY(-50px)' }, { transform: 'translateY(0)' }],
    slideLeft: [{ transform: 'translateX(50px)' }, { transform: 'translateX(0)' }], slideRight: [{ transform: 'translateX(-50px)' }, { transform: 'translateX(0)' }], slideOut: [{ transform: 'translateX(0)' }, { transform: 'translateX(50px)', opacity: 0 }],
    zoomIn: [{ transform: 'scale(.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], zoomOut: [{ transform: 'scale(1)' }, { transform: 'scale(.7)', opacity: 0 }],
    popUp: [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .75 }, { transform: 'scale(1)' }],
    blurIn: [{ filter: 'blur(16px)', opacity: 0 }, { filter: 'blur(0)', opacity: 1 }], blurOut: [{ filter: 'blur(0)' }, { filter: 'blur(16px)', opacity: 0 }],
    rotate: [{ transform: 'rotate(-18deg) scale(.9)' }, { transform: 'rotate(0) scale(1)' }], flip: [{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }],
    bounce: [{ transform: 'translateY(-25px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }],
    pulse: [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], shake: [{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
    KenBurns: [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }], kenBurns: [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }],
    floating: [{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], wave: [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-12px) rotate(2deg)' }, { transform: 'translateY(0) rotate(0)' }]
  };
  frames.slideIn = frames.slideLeft;
  frames.imageReveal = [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }];
  frames.wipeReveal = frames.maskReveal = frames.textReveal = [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }];
  frames.splitText = frames.stagger = frames.scrollReveal = frames.spring = frames.springLoop = frames.popUp;
  frames.parallax = frames.morph = frames.loop = frames.kenBurns;
  frames.glitch = [{ transform: 'translateX(-5px) skewX(-5deg)' }, { transform: 'translateX(5px) skewX(5deg)' }, { transform: 'translateX(0)' }];
  frames.scale = frames.pulse;
  frames.typewriter = frames.textReveal;
  const keyframes = (frames[effect] || frames.fadeIn).map(frame => ({ ...frame }));
  if (phase === 'exit' && !['fadeOut','zoomOut','blurOut','slideOut'].includes(effect)) keyframes.reverse();
  element.animate(keyframes, { duration: phase === 'loop' ? 1800 : 900, iterations: phase === 'loop' ? Infinity : 1, easing: effect === 'spring' || effect === 'springLoop' ? 'cubic-bezier(.2,1.6,.4,1)' : 'ease-out', fill: 'both' });
}

function setMotionButtonState(container, activeButton) {
  container.querySelectorAll('[data-motion-effect]').forEach(button => {
    const active = button === activeButton;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function applyTextMotionButton(button) {
  const item = textItems.find(candidate => candidate.id === selectedTextId);
  if (!item) return;
  const effect = button.dataset.motionEffect, phase = button.dataset.motionPhase;
  if (effect === 'keyframe') {
    if (!originalFile) return showToast('Choose media before adding a text keyframe.');
    $('#addTextKeyframe').click(); return;
  }
  const mappedEffect = phase === 'transition' ? ({ fade: 'fadeIn', wipe: 'wipeReveal', zoom: 'zoomIn', blur: 'blurIn' }[effect] || effect) : effect;
  if (phase === 'entry' || phase === 'transition') { item.animation = mappedEffect; item.exitAnimation = null; }
  else if (phase === 'exit') item.exitAnimation = effect;
  else item.loopAnimation = effect;
  $('#textAnimation').value = ['none','fade','pop','zoom','slideUp','slideDown'].includes(item.animation) ? item.animation : 'custom';
  setMotionButtonState($('#textMotionEffects'), button);
  syncTextTimingPanel();
  if (originalFile) {
    const duration = Math.max(.1, Number(item.animationDuration ?? textStyleDefaults.animationDuration));
    const previewTime = phase === 'exit' ? Math.max(item.start ?? 0, item.end - duration) : (item.start ?? 0);
    setTimelineCursorTime(previewTime);
    startTimelinePlayback();
  } else {
    const object = $(`#textLayer .text-object[data-id="${CSS.escape(item.id)}"]`);
    if (object) previewStaticMotion(object.querySelector('textarea'), mappedEffect, phase);
  }
  updateTextVisibility();
  scheduleSave(); queueHistory();
}

function applyMediaMotionButton(button) {
  const effect = button.dataset.motionEffect, phase = button.dataset.motionPhase;
  if (phase === 'transition') {
    videoTransition = effect;
    $('#videoTransition').value = effect;
    updateVideoFadePreview();
    if (!isVideo && !photo.hidden) previewStaticMotion(photo, ({ fade: 'fadeIn', wipe: 'wipeReveal', zoom: 'zoomIn', blur: 'blurIn' })[effect] || effect, 'entry');
  } else mediaMotion = { effect, phase };
  setMotionButtonState($('#mediaMotionEffects'), button);
  if (isVideo) {
    const range = currentTransitionRange();
    const duration = Math.max(.1, Math.min(.8, (range.end - range.start) / 3));
    videoPreview.currentTime = phase === 'exit' ? Math.max(range.start, range.end - duration) : range.start;
    applyMediaMotionPreview();
    videoPreview.play().catch(() => {});
  } else if (!photo.hidden && phase !== 'transition') previewStaticMotion(photo, effect, phase);
  scheduleSave(); queueHistory();
}

$('#textMotionEffects').addEventListener('click', event => {
  const button = event.target.closest('[data-motion-effect]');
  if (button) applyTextMotionButton(button);
});
$('#mediaMotionEffects').addEventListener('click', event => {
  const button = event.target.closest('[data-motion-effect]');
  if (button) applyMediaMotionButton(button);
});
videoPreview.addEventListener('loadedmetadata', () => { syncTextTimingPanel(); renderTextTimeline(); });

$('#videoTitle').addEventListener('input', () => {
  videoTitle = $('#videoTitle').value;
  syncVideoTitlePreview();
  scheduleSave();
  queueHistory();
});
$('#videoTitlePosition').addEventListener('change', () => {
  videoTitlePosition = $('#videoTitlePosition').value;
  syncVideoTitlePreview();
  scheduleSave();
  queueHistory();
});

$('#rotateLeft').addEventListener('click', () => {
  if (!originalUrl || isVideo) return showToast('Choose a photo before rotating.');
  rotation = (rotation + 270) % 360;
  applyCropPreview();
});
$('#rotateRight').addEventListener('click', () => {
  if (!originalUrl || isVideo) return showToast('Choose a photo before rotating.');
  rotation = (rotation + 90) % 360;
  applyCropPreview();
});
$('#flipImage').addEventListener('click', () => {
  if (!originalUrl || isVideo) return showToast('Choose a photo before flipping.');
  flipped = !flipped;
  applyCropPreview();
});

function applyPhotoTransform(mediaScale = getTimelineMediaScale(timelineMediaClips.find(clip => clip.id === activeTimelinePreviewClipId && clip.isPrimary) || timelineMediaClips.find(clip => clip.isPrimary))) {
  photo.style.transformOrigin = 'center center';
  photo.style.transform = `rotate(${rotation}deg) scaleX(${flipped ? -1 : 1}) scale(${1 / Math.min(crop.width, crop.height) * mediaScale})`;
}

function applyCropPreview() {
  if (crop.width === 1 && crop.height === 1) {
    photo.style.clipPath = '';
  } else {
    const top = crop.y * 100;
    const right = (1 - crop.x - crop.width) * 100;
    const bottom = (1 - crop.y - crop.height) * 100;
    const left = crop.x * 100;
    photo.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
  }
  applyPhotoTransform();
  renderTextItems();
  updateMediaResizeOverlay();
  scheduleSave();
  queueHistory();
}

function selectCropRatio(ratio) {
  if (!ratio || !photo.naturalWidth) crop = { x: 0, y: 0, width: 1, height: 1 };
  else {
    const imageRatio = photo.naturalWidth / photo.naturalHeight;
    if (imageRatio > ratio) {
      const width = ratio / imageRatio;
      crop = { x: (1 - width) / 2, y: 0, width, height: 1 };
    } else {
      const height = imageRatio / ratio;
      crop = { x: 0, y: (1 - height) / 2, width: 1, height };
    }
  }
  applyCropPreview();
}

$('#cropButton').addEventListener('click', () => {
  if (!originalUrl || isVideo) return showToast('Choose a photo before cropping.');
  $('#cropToolbar').hidden = !$('#cropToolbar').hidden;
  updateMediaResizeOverlay();
});
$$('.crop-toolbar [data-ratio]').forEach(button => button.addEventListener('click', () => {
  const parts = button.dataset.ratio.split('/').map(Number);
  const ratio = button.dataset.ratio === 'free' ? null : parts[0] / (parts[1] || 1);
  selectCropRatio(ratio);
  $$('.crop-toolbar [data-ratio]').forEach(item => item.classList.toggle('active', item === button));
}));
$('#cropDone').addEventListener('click', () => { $('#cropToolbar').hidden = true; updateMediaResizeOverlay(); showToast('Crop applied.'); });

['dragenter', 'dragover'].forEach(type => stage.addEventListener(type, event => { event.preventDefault(); stage.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => stage.addEventListener(type, event => { event.preventDefault(); stage.classList.remove('dragging'); }));
stage.addEventListener('drop', event => {
  const file = event.dataTransfer.files[0];
  if (file) loadFile(file);
});
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());

function cssFilter() {
  const exposure = Math.pow(2, values.exposure / 100);
  const contrast = 1 + values.contrast / 100;
  const saturation = Math.max(0, 1 + values.saturation / 100);
  return `brightness(${exposure}) contrast(${contrast}) saturate(${saturation}) sepia(${Math.max(0, values.temperature) / 300}) hue-rotate(${values.tint * .25}deg)`;
}

function updatePreview() {
  photo.style.filter = cssFilter();
  filters.forEach(input => {
    const key = input.dataset.key;
    const min = Number(input.min), max = Number(input.max), val = Number(input.value);
    const normalized = ((val - min) / (max - min)) * 100;
    if (min < 0 && max > 0) {
      const zero = ((0 - min) / (max - min)) * 100;
      input.style.background = `linear-gradient(to right,#3b3c35 0%,#3b3c35 ${Math.min(normalized,zero)}%,var(--lime) ${Math.min(normalized,zero)}%,var(--lime) ${Math.max(normalized,zero)}%,#3b3c35 ${Math.max(normalized,zero)}%,#3b3c35 100%)`;
    } else input.style.background = `linear-gradient(to right,var(--lime) ${normalized}%,#3b3c35 ${normalized}%)`;
    const out = $(`#${key}Value`);
    out.textContent = val > 0 && min < 0 ? `+${val}` : String(val);
  });
  scheduleSave();
  queueHistory();
}
filters.forEach(input => input.addEventListener('input', () => { values[input.dataset.key] = Number(input.value); updatePreview(); }));

function resetAdjustments(show = true) {
  values = { ...defaults };
  filters.forEach(input => { input.value = defaults[input.dataset.key]; });
  updatePreview();
  if (show) showToast('Adjustments reset.');
}
$('#resetButton').addEventListener('click', () => resetAdjustments());
$$('.section-reset').forEach(button => button.addEventListener('click', () => {
  const groups = { light: ['exposure','contrast','highlights','shadows'], color: ['temperature','tint','saturation'], detail: ['grain'] };
  groups[button.dataset.reset].forEach(key => { values[key] = defaults[key]; $(`[data-key="${key}"]`).value = defaults[key]; });
  updatePreview();
}));

const presets = [
  { name: 'Golden hour', adjustments: { temperature: 28, saturation: 12, exposure: 5, highlights: -12 } },
  { name: 'Soft portrait', adjustments: { exposure: 8, contrast: -14, saturation: -8, highlights: -18, shadows: 12 } },
  { name: 'Clean & crisp', adjustments: { exposure: 4, contrast: 16, saturation: 4, highlights: -10 } },
  { name: 'Analog glow', adjustments: { temperature: 14, contrast: -9, saturation: -13, grain: 20, tint: 4 } },
  { name: 'Quiet green', adjustments: { temperature: -7, tint: -7, saturation: -20, contrast: 8, shadows: 10 } },
  { name: 'Sunday film', adjustments: { temperature: 18, contrast: -17, saturation: -17, grain: 12, exposure: 4 } }
];
presets.forEach((preset, index) => {
  const button = document.createElement('button');
  button.className = 'preset-card';
  button.innerHTML = `<span class="preset-swatch" aria-hidden="true"></span>${preset.name}`;
  button.addEventListener('click', () => {
    values = { ...defaults, ...preset.adjustments };
    filters.forEach(input => input.value = values[input.dataset.key]);
    updatePreview();
    $$('.preset-card').forEach(card => card.classList.remove('selected'));
    button.classList.add('selected');
    showToast(`${preset.name} applied.`);
  });
  $('#presetGrid').appendChild(button);
});

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(item => item.classList.toggle('active', item === tab));
  const showPresets = tab.dataset.tab === 'presets';
  $('#adjustPanel').hidden = showPresets;
  $('#presetsPanel').hidden = !showPresets;
}));

const compare = $('#compareButton');
function showOriginal() { if (originalUrl) { photo.style.filter = 'none'; $('#canvasOverlay').hidden = false; } }
function showEdited() { $('#canvasOverlay').hidden = true; updatePreview(); }
compare.addEventListener('pointerdown', showOriginal);
['pointerup', 'pointerleave', 'pointercancel'].forEach(type => compare.addEventListener(type, showEdited));
window.addEventListener('keydown', event => {
  if (event.key === '\\' && !photo.hidden) showOriginal();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openPicker(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); stepHistory(event.shiftKey ? 1 : -1);
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault(); stepHistory(1);
  }
});
window.addEventListener('keyup', event => { if (event.key === '\\') showEdited(); });

$('#exportButton').addEventListener('click', async () => {
  if (!originalUrl) return showToast('Choose a photo before exporting.');
  if (isVideo) {
    const link = document.createElement('a');
    const downloadUrl = URL.createObjectURL(originalFile);
    link.href = downloadUrl;
    link.download = originalFile.name || 'neura-video';
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
    return showToast('Original video downloaded. Use Export trimmed clip to include your edits.');
  }
  await ensureTextFontsReady();
  const canvas = document.createElement('canvas');
  const imageClip = timelineMediaClips.find(clip => clip.id === activeTimelinePreviewClipId && clip.isPrimary) || timelineMediaClips.find(clip => clip.isPrimary);
  const imageScale = getTimelineMediaScale(imageClip);
  const sourceX = Math.round(crop.x * photo.naturalWidth);
  const sourceY = Math.round(crop.y * photo.naturalHeight);
  const sourceWidth = Math.round(crop.width * photo.naturalWidth);
  const sourceHeight = Math.round(crop.height * photo.naturalHeight);
  const sideways = rotation % 180 !== 0;
  canvas.width = sideways ? sourceHeight : sourceWidth;
  canvas.height = sideways ? sourceWidth : sourceHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const exposure = Math.pow(2, values.exposure / 100);
  ctx.filter = `brightness(${exposure}) contrast(${1 + values.contrast / 100}) saturate(${Math.max(0,1 + values.saturation / 100)}) sepia(${Math.max(0,values.temperature) / 300}) hue-rotate(${values.tint * .25}deg)`;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(flipped ? -1 : 1, 1);
  ctx.scale(imageScale, imageScale);
  ctx.drawImage(photo, sourceX, sourceY, sourceWidth, sourceHeight, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  try {
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;
    const shadowAmount = values.shadows / 100 * .72;
    const highlightAmount = values.highlights / 100 * .72;
    const warmth = values.temperature * .42;
    const tint = values.tint * .28;
    const grain = values.grain / 100 * 22;
    let seed = 9137;
    for (let i = 0; i < pixels.length; i += 4) {
      const luminance = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
      const shadow = Math.pow(1 - luminance, 2) * shadowAmount * 255;
      const highlight = Math.pow(luminance, 2) * highlightAmount * 255;
      seed = (seed * 16807) % 2147483647;
      const noise = ((seed / 2147483647) * 2 - 1) * grain;
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + shadow + highlight + warmth + noise));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + shadow + highlight - tint * .55 + noise));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + shadow + highlight - warmth + tint + noise));
    }
    ctx.putImageData(frame, 0, 0);
  } catch (error) {
    return showToast('This image is too large to process in this browser.');
  }
  drawTextOverlays(ctx, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    if (!blob) return showToast('This image format could not be exported.');
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url; link.download = `${(originalFile?.name || 'neura-photo').replace(/\.[^.]+$/, '')}-neura.jpg`;
    link.click(); URL.revokeObjectURL(url); showToast('Your edited photo is ready.');
  }, 'image/jpeg', .94);
});

$('#trimExport').addEventListener('click', async () => {
  if (!isVideo || !originalFile) return showToast('Choose a video before exporting a clip.');
  const selectedRange = selectedSegment === null ? null : getVideoSegments()[selectedSegment];
  const selectedClipNumber = selectedRange ? selectedSegment + 1 : null;
  const start = selectedRange?.start ?? Number($('#trimStart').value);
  const end = selectedRange?.end ?? Number($('#trimEnd').value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > videoPreview.duration) {
    $('#trimStatus').textContent = 'Choose a valid start and end time.';
    return;
  }
  if (!('MediaRecorder' in window) || (!videoPreview.captureStream && !videoPreview.mozCaptureStream) || !HTMLCanvasElement.prototype.captureStream) {
    $('#trimStatus').textContent = 'Video export is not supported in this browser.';
    return;
  }
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(type => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    $('#trimStatus').textContent = 'This browser cannot encode a WebM video.';
    return;
  }

  const button = $('#trimExport');
  const status = $('#trimStatus');
  button.disabled = true;
  status.textContent = 'Preparing clip…';
  recorderFailed = false;
  try {
    const exportScaleClip = timelineMediaClips.find(clip => clip.id === selectedTimelineMediaId && clip.isPrimary) || timelineMediaClips.find(clip => clip.isPrimary && timelineCursorTime >= clip.start && timelineCursorTime < clip.end) || timelineMediaClips.find(clip => clip.isPrimary);
    const exportMediaScale = getTimelineMediaScale(exportScaleClip);
    await ensureTextFontsReady();
    const musicDestination = musicClips.length ? await ensureMusicAudioGraph() : null;
    if (Math.abs(videoPreview.currentTime - start) > .05) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video seek timed out')), 10000);
        videoPreview.addEventListener('seeked', () => { clearTimeout(timeout); resolve(); }, { once: true });
        videoPreview.currentTime = start;
      });
    }
    const sourceStream = (videoPreview.captureStream || videoPreview.mozCaptureStream).call(videoPreview);
    let videoAudioSource = null;
    let videoAudioGain = null;
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = videoPreview.videoWidth;
    renderCanvas.height = videoPreview.videoHeight;
    const renderContext = renderCanvas.getContext('2d');
    const outputStream = renderCanvas.captureStream(30);
    if (musicDestination) {
      const sourceAudioTracks = sourceStream.getAudioTracks();
      if (sourceAudioTracks.length && !muteOriginalAudio) {
        videoAudioSource = musicAudioContext.createMediaStreamSource(new MediaStream(sourceAudioTracks));
        videoAudioGain = musicAudioContext.createGain();
        videoAudioSource.connect(videoAudioGain);
        videoAudioGain.connect(musicCaptureDestination);
      }
      musicDestination.stream.getAudioTracks().forEach(track => outputStream.addTrack(track));
    } else if (!muteOriginalAudio) sourceStream.getAudioTracks().forEach(track => outputStream.addTrack(track));
    const recorder = new MediaRecorder(outputStream, { mimeType });
    activeRecorder = recorder;
    const chunks = [];
    let animationFrame;
    const drawFrame = () => {
      const frameRange = { start, end };
      const transition = getVideoTransitionState(videoPreview.currentTime, start, end);
      const motion = getMediaMotionState(videoPreview.currentTime, frameRange);
      const reveal = Math.min(transition.reveal, motion.reveal);
      renderContext.filter = 'none';
      renderContext.globalAlpha = 1;
      renderContext.fillStyle = '#000';
      renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
      renderContext.save();
      renderContext.globalAlpha = transition.opacity * motion.opacity;
      renderContext.filter = [currentVideoFilter(), motion.blur + transition.blur ? `blur(${motion.blur + transition.blur}px)` : ''].filter(value => value && value !== 'none').join(' ') || 'none';
      renderContext.translate(renderCanvas.width / 2 + motion.x * renderCanvas.width, renderCanvas.height / 2 + motion.y * renderCanvas.height);
      renderContext.rotate(motion.rotation * Math.PI / 180);
      renderContext.scale(motion.scale * transition.scale * exportMediaScale, motion.scale * transition.scale * exportMediaScale);
      if (reveal < 1) {
        renderContext.beginPath();
        renderContext.rect(-renderCanvas.width / 2, -renderCanvas.height / 2, renderCanvas.width, renderCanvas.height * reveal);
        renderContext.clip();
      }
      renderContext.drawImage(videoPreview, -renderCanvas.width / 2, -renderCanvas.height / 2, renderCanvas.width, renderCanvas.height);
      renderContext.restore();
      drawEffectOverlays(renderContext, renderCanvas.width, renderCanvas.height, videoPreview.currentTime);
      renderContext.save();
      renderContext.globalAlpha = videoTransition === 'fade' ? transition.opacity : 1;
      drawVideoTitle(renderContext, renderCanvas.width, renderCanvas.height);
      drawTextOverlays(renderContext, renderCanvas.width, renderCanvas.height, videoPreview.currentTime);
      renderContext.restore();
      renderContext.globalAlpha = 1;
      animationFrame = requestAnimationFrame(drawFrame);
    };
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      recorderFailed = true;
      status.textContent = 'The browser could not record this clip.';
      if (recorder.state !== 'inactive') recorder.stop();
    };
    recorder.onstop = () => {
      videoPreview.removeEventListener('timeupdate', stopAtEnd);
      videoPreview.removeEventListener('ended', stopAtEnd);
      cancelAnimationFrame(animationFrame);
      outputStream.getVideoTracks().forEach(track => track.stop());
      sourceStream.getTracks().forEach(track => track.stop());
      videoAudioSource?.disconnect();
      videoAudioGain?.disconnect();
      activeRecorder = null;
      button.disabled = false;
      if (recorderFailed) { status.textContent = 'Video export failed in this browser.'; return; }
      if (!chunks.length) { status.textContent = 'No video data was recorded.'; return; }
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const clipSuffix = selectedClipNumber ? `-clip-${selectedClipNumber}` : '';
      link.download = `${originalFile.name.replace(/\.[^.]+$/, '')}${clipSuffix}-trimmed.webm`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status.textContent = 'Trimmed WebM downloaded.';
    };
    const stopAtEnd = () => {
      const progress = Math.min(100, ((videoPreview.currentTime - start) / (end - start)) * 100);
      status.textContent = `Recording clip… ${Math.round(progress)}%`;
      if (videoPreview.currentTime >= end) {
        videoPreview.pause();
        if (recorder.state !== 'inactive') recorder.stop();
      }
    };
    recorder.start(250);
    drawFrame();
    videoPreview.addEventListener('timeupdate', stopAtEnd);
    videoPreview.addEventListener('ended', stopAtEnd);
    await videoPreview.play();
    status.textContent = 'Recording clip…';
  } catch (error) {
    recorderFailed = true;
    if (activeRecorder && activeRecorder.state !== 'inactive') activeRecorder.stop();
    button.disabled = false;
    status.textContent = 'Could not start video export. Try playing the clip first.';
  }
});

$('#zoomButton').addEventListener('click', () => showToast('Preview is fitted to the workspace.'));
updatePreview();
resetHistory();
restoreWorkspace();
window.addEventListener('resize', renderTextItems);
