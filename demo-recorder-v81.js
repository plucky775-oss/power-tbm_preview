(() => {
  'use strict';

  const button = document.getElementById('demoRecord');
  const dialog = document.getElementById('demoRecordDialog');
  if (!button || !dialog) return;
  // Feature detection also keeps the iPad / phone layout unchanged.
  if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) return;

  const label = document.getElementById('demoRecordLabel');
  const title = document.getElementById('demoRecordTitle');
  const message = document.getElementById('demoRecordMessage');
  const errorText = document.getElementById('demoRecordError');
  const startButton = document.getElementById('demoRecordStart');
  const closeButton = document.getElementById('demoRecordClose');
  const download = document.getElementById('demoRecordDownload');
  const preview = document.getElementById('demoRecordPreview');
  const metadata = document.getElementById('demoRecordMeta');
  const status = document.getElementById('demoRecordStatus');
  let state = 'idle';
  let session = null;
  let result = null;
  let clock = null;

  const elapsedText = (ms) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
  const updateButton = () => {
    const recording = state === 'recording';
    button.classList.toggle('is-recording', recording);
    button.disabled = state === 'selecting' || state === 'finishing';
    button.setAttribute('aria-pressed', String(recording));
    label.textContent = recording ? '중지' : '녹화';
    button.title = recording
      ? `녹화 중 ${elapsedText(performance.now() - session.startedAt)} · 클릭하여 종료 및 저장`
      : '시연 영상 녹화';
    button.setAttribute('aria-label', recording ? '녹화 중지 및 영상 저장' : '시연 영상 녹화');
  };
  const showError = (text) => {
    errorText.textContent = text;
    errorText.hidden = !text;
  };
  const openDialog = () => {
    if (!dialog.open) dialog.showModal();
  };
  const showSetup = (error = '') => {
    title.textContent = '시연 영상 녹화';
    message.textContent = '다음 창에서 이 Power TBM 탭을 선택하고 ‘탭 오디오 공유’를 켜 주세요. 전체 시연을 처음부터 녹화하고, 마지막 장면이 끝나면 자동으로 종료합니다.';
    startButton.hidden = false;
    startButton.disabled = false;
    startButton.textContent = '녹화 시작';
    closeButton.disabled = false;
    closeButton.textContent = '닫기';
    preview.hidden = true;
    metadata.hidden = true;
    download.hidden = true;
    showError(error);
    openDialog();
  };
  const discardResult = () => {
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
    download.removeAttribute('href');
    if (result) URL.revokeObjectURL(result.url);
    result = null;
  };
  const showResult = () => {
    title.textContent = '녹화 영상 준비 완료';
    message.textContent = '화면과 소리를 확인한 뒤 영상을 저장하세요. 이 창을 닫아도 녹화 버튼으로 다시 열 수 있습니다.';
    preview.hidden = false;
    metadata.hidden = false;
    metadata.textContent = `${elapsedText(result.duration)} · ${(result.size / 1024 / 1024).toFixed(1)} MB · ${result.extension.toUpperCase()}`;
    download.hidden = false;
    download.textContent = `영상 저장 (${result.extension.toUpperCase()})`;
    startButton.hidden = false;
    startButton.disabled = false;
    startButton.textContent = '새로 녹화';
    closeButton.disabled = false;
    closeButton.textContent = '닫기';
    showError(result.warning);
    openDialog();
  };
  const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop());
  const finish = (run) => {
    if (session !== run) return;
    window.clearInterval(clock);
    clock = null;
    stopTracks(run.stream);
    session = null;
    state = 'idle';
    document.body.classList.remove('demo-recording');
    updateButton();
    const type = run.recorder.mimeType || run.chunks[0]?.type;
    if (!run.chunks.length || !type || !/video\/(mp4|webm)/i.test(type)) {
      status.textContent = '녹화 영상을 만들지 못했습니다.';
      showSetup('녹화된 영상이 없습니다. 화면과 탭 오디오를 공유한 뒤 다시 시도해 주세요.');
      return;
    }
    const blob = new Blob(run.chunks, { type });
    run.chunks.length = 0;
    if (!blob.size) {
      showSetup('녹화된 영상이 없습니다. 조금 더 재생한 뒤 녹화를 종료해 주세요.');
      return;
    }
    discardResult();
    const extension = /video\/mp4/i.test(type) ? 'mp4' : 'webm';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    result = {
      url: URL.createObjectURL(blob), extension, size: blob.size,
      duration: (run.stoppedAt || performance.now()) - run.startedAt,
      warning: run.warning
    };
    preview.src = result.url;
    download.href = result.url;
    download.download = `Power_TBM_${stamp}.${extension}`;
    status.textContent = '녹화가 끝났습니다. 영상 저장 버튼을 눌러 저장하세요.';
    showResult();
  };
  const stopRecording = (warning = '') => {
    if (state !== 'recording' || !session) return;
    const run = session;
    run.warning = warning;
    run.stoppedAt = performance.now();
    state = 'finishing';
    window.clearInterval(clock);
    updateButton();
    status.textContent = '녹화 영상을 준비하고 있습니다.';
    if (run.recorder.state !== 'inactive') run.recorder.stop();
    // An inactive recorder already has its final data/stop events queued.
  };
  const createRecorder = (stream) => {
    const types = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const mimeType of types) {
      if (!MediaRecorder.isTypeSupported(mimeType)) continue;
      try {
        return new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000, audioBitsPerSecond: 192000 });
      } catch (_) { /* Try the next format if an encoder is unavailable. */ }
    }
    throw new Error('이 브라우저에서 지원하는 녹화 형식이 없습니다. PC의 최신 Chrome 또는 Edge에서 열어 주세요.');
  };
  const startRecording = async () => {
    if (state !== 'idle') return;
    state = 'selecting';
    startButton.disabled = true;
    closeButton.disabled = true;
    showError('');
    updateButton();
    let stream;
    let run;
    try {
      // Called directly from the start button: the native picker requires a user gesture.
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', width: { ideal: 1920 }, height: { ideal: 1440 }, frameRate: { ideal: 30, max: 30 } },
        audio: { suppressLocalAudioPlayback: false },
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        monitorTypeSurfaces: 'exclude',
        systemAudio: 'exclude'
      });
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') throw new Error('공유할 화면을 찾지 못했습니다. 이 Power TBM 탭을 선택해 주세요.');
      const surface = videoTrack.getSettings().displaySurface;
      if (surface && surface !== 'browser') throw new Error('이 Power TBM 탭을 선택해 주세요. 탭을 선택해야 시연 화면과 소리를 함께 녹화할 수 있습니다.');
      if (!audioTrack || audioTrack.readyState !== 'live') throw new Error('탭 소리가 공유되지 않았습니다. 이 Power TBM 탭을 선택하고 ‘탭 오디오 공유’를 켜 주세요.');
      const recorder = createRecorder(stream);
      run = { stream, recorder, chunks: [], startedAt: performance.now(), warning: '' };
      session = run;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) run.chunks.push(event.data);
      });
      recorder.addEventListener('stop', () => finish(run), { once: true });
      recorder.addEventListener('error', () => {
        run.warning = '녹화가 중간에 끊겼습니다. 저장하기 전에 영상의 끝부분을 확인해 주세요.';
        stopRecording(run.warning);
      });
      videoTrack.addEventListener('ended', () => stopRecording(), { once: true });
      audioTrack.addEventListener('ended', () => stopRecording('소리 공유가 종료되어 녹화를 멈췄습니다. 종료 전까지의 영상을 확인한 뒤 저장하세요.'), { once: true });
      preview.pause();
      dialog.close();
      recorder.start(1000);
      state = 'recording';
      document.body.classList.add('demo-recording');
      updateButton();
      clock = window.setInterval(updateButton, 1000);
      status.textContent = '화면과 소리 녹화를 시작했습니다.';
      document.dispatchEvent(new CustomEvent('power-tbm:recording-start'));
    } catch (error) {
      // Do not leave a screen/audio sharing session alive after cancel or setup failure.
      session = null;
      if (run && run.recorder.state !== 'inactive') run.recorder.stop();
      stopTracks(stream);
      state = 'idle';
      window.clearInterval(clock);
      document.body.classList.remove('demo-recording');
      updateButton();
      const text = error.name === 'NotAllowedError' || error.name === 'AbortError'
        ? '화면 공유가 취소되었거나 허용되지 않았습니다. 녹화 시작을 눌러 다시 선택할 수 있습니다.'
        : error.name === 'NotReadableError'
          ? '화면을 공유하지 못했습니다. 브라우저의 화면 기록 권한을 확인해 주세요.'
          : error.message || '녹화를 시작하지 못했습니다. PC Chrome에서 다시 시도해 주세요.';
      showSetup(text);
    }
  };

  button.hidden = false;
  button.closest('header')?.classList.add('has-demo-recorder');
  button.addEventListener('click', () => {
    if (state === 'recording') stopRecording();
    else if (state === 'idle') result ? showResult() : showSetup();
  });
  startButton.addEventListener('click', () => {
    if (result && !preview.hidden) showSetup();
    else startRecording();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => {
    if (state === 'selecting') event.preventDefault();
  });
  dialog.addEventListener('close', () => preview.pause());
  document.addEventListener('power-tbm:sequence-complete', (event) => {
    if (state !== 'recording') return;
    event.preventDefault();
    stopRecording();
  });
  window.addEventListener('beforeunload', (event) => {
    if (state !== 'recording' && state !== 'finishing') return;
    event.preventDefault();
    event.returnValue = '';
  });
  window.addEventListener('pagehide', () => {
    stopRecording();
    stopTracks(session?.stream);
  });
})();
