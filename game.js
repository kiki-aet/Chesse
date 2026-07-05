// Extended game with audio (WebAudio synth), desk toggle button/keyboard, stronger visuals and jumpscare effects.

const ROOMS = ["Show Stage","Dining Room","Kitchen","Hallway","Office"]
let state = {
  time: 0,
  power: 100,
  selectedCam: null,
  cameraPutDown: false,
  doorLeftClosed: false,
  doorRightClosed: false,
  animPos: 0, // 0..4, 4 == office
  running: true,
}

const TICKS_TO_WIN = 60
const TICK_MS = 1000

// audio using WebAudio (no external files)
let audioCtx = null
let ambientGain = null
let ambientOsc = null

function ensureAudio(){
  if(audioCtx) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  // ambient drone
  ambientOsc = audioCtx.createOscillator()
  ambientOsc.type = 'sine'
  ambientOsc.frequency.value = 55
  ambientGain = audioCtx.createGain()
  ambientGain.gain.value = 0.02
  ambientOsc.connect(ambientGain)
  ambientGain.connect(audioCtx.destination)
  ambientOsc.start()
}

function playFootstep(){
  if(!audioCtx) ensureAudio()
  const g = audioCtx.createGain(); g.gain.value = 0.08
  const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.value = 120
  o.connect(g); g.connect(audioCtx.destination)
  o.start(); o.stop(audioCtx.currentTime + 0.08)
}

function playKnock(){
  if(!audioCtx) ensureAudio()
  const g = audioCtx.createGain(); g.gain.value = 0.14
  const o = audioCtx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 220
  o.connect(g); g.connect(audioCtx.destination)
  const now = audioCtx.currentTime
  o.start(now); o.frequency.exponentialRampToValueAtTime(80, now + 0.25)
  o.stop(now + 0.3)
}

function playJumpscare(){
  if(!audioCtx) ensureAudio()
  const g = audioCtx.createGain(); g.gain.value = 0.6
  const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.value = 120
  o.connect(g); g.connect(audioCtx.destination)
  const now = audioCtx.currentTime
  o.start(now); o.frequency.exponentialRampToValueAtTime(800, now + 0.12)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)
  o.stop(now + 0.75)
}

// elements
const timeEl = document.getElementById('time')
const powerEl = document.getElementById('power')
const camsEl = document.getElementById('cams')
const view = document.getElementById('view')
const viewContent = document.getElementById('view-content')
const msgEl = document.getElementById('message')
const doorLeftBtn = document.getElementById('door-left')
const doorRightBtn = document.getElementById('door-right')
const restartBtn = document.getElementById('restart')
const toggleDeskBtn = document.getElementById('toggle-desk')

// keyboard: D toggles desk view, Space to resume audio context if needed
window.addEventListener('keydown', (e)=>{
  if(e.key.toLowerCase() === 'd'){
    toggleDeskView()
  }
  if(e.key === ' '){
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
  }
})

function renderCams(){
  camsEl.innerHTML = ''
  ROOMS.forEach((r, i) =>{
    const d = document.createElement('div')
    d.className = 'cam-thumb' + (state.selectedCam===i? ' selected':'')
    d.style.backgroundImage = `url('assets/cam_frame.svg')`
    d.innerHTML = `<div style="padding:6px; color:#bfe; font-size:12px">Cam ${i+1}<br/><small>${r}</small></div>`

    d.onclick = ()=>{
      if(!state.running) return

      // clicking same camera toggles desk view on/off
      if(state.selectedCam === i){
        // toggle: if already in desk-view, pick up; else put down
        if(state.cameraPutDown){
          state.cameraPutDown = false
          state.selectedCam = i // keep camera focused
        } else {
          state.selectedCam = null
          state.cameraPutDown = true
        }
        renderAll()
        return
      }

      // selecting a different camera clears put-down state
      state.cameraPutDown = false

      // if no power, prevent selecting cameras
      if(state.power <= 0){
        renderMessage('No power — cameras offline')
        return
      }

      state.selectedCam = i
      renderAll()
    }

    // visually mark the camera where the animatronic currently is
    if(i === state.animPos) d.style.borderColor = '#f66'
    camsEl.appendChild(d)
  })
}

function renderView(){
  // clear any danger visuals
  view.classList.remove('view-danger')
  removeWarning()

  // If camera is put down: show office interior so player can watch the door
  if(state.cameraPutDown){
    // if power is out, show static
    if(state.power <= 0){
      viewContent.innerHTML = `<img src="assets/static.svg" alt="static" style="max-width:100%; max-height:100%"/>`
      return
    }

    // show office interior
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="assets/office_interior.svg" alt="office" style="max-width:100%; height:auto;"/>`;

    // if animatronic is at the office door, overlay an anim image, warning and play knock
    if(state.animPos === ROOMS.length - 1){
      // danger visuals
      view.classList.add('view-danger')
      addWarning('Animatronic at your door!')
      playKnock()

      html += `<div style="position:relative;margin-top:-260px; pointer-events:none; display:flex;flex-direction:column;align-items:center"><img src='assets/anim_face.svg' alt='anim' style='max-height:220px; width:auto; mix-blend-mode:screen; opacity:0.95'/><div style='color:#f88; font-weight:700; margin-top:6px'>Animatronic at your door!</div></div>`
    }

    html += `</div>`
    viewContent.innerHTML = html
    return
  }

  // Normal camera view behavior
  if(state.selectedCam==null){
    viewContent.textContent = 'Select a camera'
    return
  }
  const room = ROOMS[state.selectedCam]

  // if power is out, show static texture
  if(state.power <= 0){
    viewContent.innerHTML = `<img src="assets/static.svg" alt="static" style="max-width:100%; max-height:100%"/>` 
    return
  }

  // if animatronic is at this camera, show the anim image and play a footstep sound when it moves here
  if(state.selectedCam === state.animPos){
    viewContent.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="assets/anim_face.svg" alt="anim" style="max-height:180px; width:auto"/><div style="color:#f88">${room} — ANIMATRONIC HERE!</div></div>`
    return
  }

  // normal camera view
  viewContent.textContent = room
}

function renderHud(){
  timeEl.textContent = state.time
  powerEl.textContent = Math.max(0, Math.round(state.power))
  doorLeftBtn.textContent = `Left: ${state.doorLeftClosed? 'Closed':'Open'}`
  doorRightBtn.textContent = `Right: ${state.doorRightClosed? 'Closed':'Open'}`
  doorLeftBtn.className = 'door ' + (state.doorLeftClosed? 'closed':'open')
  doorRightBtn.className = 'door ' + (state.doorRightClosed? 'closed':'open')
}

function renderMessage(t){
  msgEl.textContent = t||''
}

function addWarning(text){
  removeWarning()
  const w = document.createElement('div')
  w.className = 'warning-overlay'
  w.innerHTML = `<div class="badge">${text}</div>`
  view.appendChild(w)
}

function removeWarning(){
  const old = view.querySelector('.warning-overlay')
  if(old) old.remove()
}

function toggleDeskView(){
  // toggle desk view regardless of selected camera (but if no power, show message)
  if(state.power <= 0){ renderMessage('No power — cannot toggle desk view'); return }
  state.cameraPutDown = !state.cameraPutDown
  // deselect cameras when putting down
  if(state.cameraPutDown) state.selectedCam = null
  renderAll()
}

function toggleLeft(){ if(!state.running) return; state.doorLeftClosed = !state.doorLeftClosed; state.cameraPutDown = false; renderAll() }
function toggleRight(){ if(!state.running) return; state.doorRightClosed = !state.doorRightClosed; state.cameraPutDown = false; renderAll() }

doorLeftBtn.onclick = toggleLeft
doorRightBtn.onclick = toggleRight
restartBtn.onclick = ()=>{ location.reload() }
toggleDeskBtn.onclick = ()=>{ toggleDeskView(); if(!audioCtx) ensureAudio() }

function animMoveTick(){
  if(!state.running) return
  // movement probability grows slowly as night goes on
  let base = 0.03 + state.time*0.004
  // cameras slow it down if the animatronic is being watched
  if(state.selectedCam === state.animPos) base *= 0.35
  // power out increases aggression
  if(state.power <= 0) base *= 2.5

  if(Math.random() < base){
    state.animPos = Math.min(ROOMS.length-1, state.animPos+1)
    // play footstep when it moves
    playFootstep()

    // if it reached the office
    if(state.animPos === ROOMS.length-1){
      // if any door is open -> instant attack
      if(!state.doorLeftClosed && !state.doorRightClosed){
        // create stronger visual/sound
        playJumpscare()
        document.body.classList.add('screen-shake')
        setTimeout(()=> document.body.classList.remove('screen-shake'), 700)
        gameOver('The animatronic entered the office while doors were open. You were caught!')
      } else {
        // doors closed: it bangs until you open a door (consume power)
        renderMessage('The animatronic is at your office door! Keep the doors closed to survive.')
        playKnock()
      }
    }
  }
}

function powerTick(){
  if(!state.running) return
  // cameras use a small amount
  if(state.selectedCam != null){ state.power -= 0.5 }
  // doors use power when closed
  if(state.doorLeftClosed) state.power -= 1
  if(state.doorRightClosed) state.power -= 1
  // natural drain
  state.power -= 0.05

  if(state.power <= 0){
    state.power = 0
    renderMessage('Power out! Cameras and doors disabled!')
    // disable features
    state.selectedCam = null
    state.cameraPutDown = false
    state.doorLeftClosed = false
    state.doorRightClosed = false
    // but animatronic becomes more aggressive (handled in move)
  }
}

function gameTick(){
  if(!state.running) return
  state.time += 1
  renderHud()
  powerTick()
  animMoveTick()
  renderAll()

  // check win
  if(state.time >= TICKS_TO_WIN){
    win()
  }
}

function gameOver(reason){
  state.running = false
  renderMessage(reason || 'Game over')
  viewContent.textContent = 'GAME OVER'
  // stop ambient
  if(ambientGain) ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6)
}

function win(){
  state.running = false
  renderMessage('You survived the night! Congrats!')
  viewContent.textContent = 'YOU WIN'
  if(ambientGain) ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6)
}

function renderAll(){
  renderCams()
  renderView()
  renderHud()
}

// start
renderAll()
setInterval(gameTick, TICK_MS)
setInterval(renderAll, 300)
