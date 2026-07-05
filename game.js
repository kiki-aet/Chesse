// Major feature upgrade: multiple animatronics, nights progression, difficulty, sound toggle, improved visuals, localStorage best-night.

const ROOMS = ["Show Stage","Dining Room","Kitchen","Hallway","Office"]

let state = {
  night: 1,
  time: 0,
  power: 100,
  selectedCam: null,
  cameraPutDown: false,
  doorLeftClosed: false,
  doorRightClosed: false,
  animatronics: [], // array of { name, pos, speedMod }
  running: true,
  sound: true,
}

const BASE_TICKS_TO_WIN = 60
const TICK_MS = 1000

// audio (WebAudio synths)
let audioCtx = null
let ambientGain = null
let ambientOsc = null

function ensureAudio(){
  if(audioCtx) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  ambientOsc = audioCtx.createOscillator()
  ambientOsc.type = 'sine'
  ambientOsc.frequency.value = 55
  ambientGain = audioCtx.createGain()
  ambientGain.gain.value = 0.02
  ambientOsc.connect(ambientGain)
  ambientGain.connect(audioCtx.destination)
  ambientOsc.start()
}

function playSound(type){
  if(!state.sound) return
  if(!audioCtx) ensureAudio()
  const now = audioCtx.currentTime
  if(type === 'foot'){
    const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.value = 200
    const g = audioCtx.createGain(); g.gain.value = 0.06
    o.connect(g); g.connect(audioCtx.destination)
    o.start(now); o.stop(now + 0.06)
  } else if(type === 'knock'){
    const o = audioCtx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 260
    const g = audioCtx.createGain(); g.gain.value = 0.14
    o.connect(g); g.connect(audioCtx.destination)
    o.start(now); o.frequency.exponentialRampToValueAtTime(80, now + 0.25); o.stop(now + 0.35)
  } else if(type === 'jump'){
    const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.value = 120
    const g = audioCtx.createGain(); g.gain.value = 0.7
    o.connect(g); g.connect(audioCtx.destination)
    o.start(now); o.frequency.exponentialRampToValueAtTime(900, now + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7); o.stop(now + 0.8)
  }
}

// elements
const nightEl = document.getElementById('night')
const timeEl = document.getElementById('time')
const powerEl = document.getElementById('power')
const bestEl = document.getElementById('best-night')
const camsEl = document.getElementById('cams')
const view = document.getElementById('view')
const viewContent = document.getElementById('view-content')
const msgEl = document.getElementById('message')
const doorLeftBtn = document.getElementById('door-left')
const doorRightBtn = document.getElementById('door-right')
const restartBtn = document.getElementById('restart')
const toggleDeskBtn = document.getElementById('toggle-desk')
const soundToggleBtn = document.getElementById('sound-toggle')
const difficultySelect = document.getElementById('difficulty')

// initialize animatronics for the current night
function initAnimatronics(){
  state.animatronics = []
  const baseCount = 1 + Math.min(3, Math.floor(state.night/2))
  for(let i=0;i<baseCount;i++){
    state.animatronics.push({ name: 'Anim'+(i+1), pos: 0, speedMod: 1 + Math.random()*0.4 })
  }
}

// load best night from storage
function loadBest(){
  const b = parseInt(localStorage.getItem('chesse_best_night') || '0', 10)
  bestEl.textContent = b
}
function saveBest(){
  const curBest = parseInt(localStorage.getItem('chesse_best_night') || '0', 10)
  if(state.night > curBest) localStorage.setItem('chesse_best_night', String(state.night))
  loadBest()
}

// keyboard
window.addEventListener('keydown', (e)=>{
  if(e.key.toLowerCase() === 'd') toggleDeskView()
  if(e.key === ' '){ if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume() }
})

soundToggleBtn.onclick = ()=>{ state.sound = !state.sound; soundToggleBtn.textContent = 'Sound: ' + (state.sound? 'On':'Off'); if(state.sound) ensureAudio(); }

difficultySelect.onchange = ()=>{ /* difficulty affects movement base in ticks */ }

function renderCams(){
  camsEl.innerHTML = ''
  ROOMS.forEach((r, i) =>{
    const d = document.createElement('div')
    d.className = 'cam-thumb' + (state.selectedCam===i? ' selected':'')
    d.style.backgroundImage = `url('assets/cam_frame.svg')`
    d.innerHTML = `<div style="padding:6px; color:#bfe; font-size:12px">Cam ${i+1}<br/><small>${r}</small></div>`

    d.onclick = ()=>{
      if(!state.running) return
      if(state.selectedCam === i){
        // toggle
        state.cameraPutDown = !state.cameraPutDown
        if(state.cameraPutDown) state.selectedCam = null
        renderAll()
        return
      }
      state.cameraPutDown = false
      if(state.power <= 0){ renderMessage('No power — cameras offline'); return }
      state.selectedCam = i
      renderAll()
    }

    // show if any anim is in this room
    if(state.animatronics.some(a=>a.pos===i)) d.style.borderColor = '#f66'
    camsEl.appendChild(d)
  })
}

function renderView(){
  view.classList.remove('view-danger')
  removeWarning()

  if(state.cameraPutDown){
    if(state.power <= 0){ viewContent.innerHTML = `<img src="assets/static.svg" alt="static" style="max-width:100%; max-height:100%"/>`; return }
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="assets/office_interior.svg" alt="office" style="max-width:100%; height:auto;"/>`
    // if any anim at the office
    const atOffice = state.animatronics.filter(a=>a.pos===ROOMS.length-1)
    if(atOffice.length){
      view.classList.add('view-danger')
      addWarning(atOffice.length>1? 'Multiple animatronics at your door!':'Animatronic at your door!')
      if(state.sound) playSound('knock')
      html += `<div style="position:relative;margin-top:-240px; pointer-events:none; display:flex;flex-direction:column;align-items:center"><img src='assets/anim_face.svg' alt='anim' style='max-height:220px; width:auto; mix-blend-mode:screen; opacity:0.95'/><div style='color:#f88; font-weight:700; margin-top:6px'>${atOffice.length>1? 'They are at your door!':'It's at your door!'}</div></div>`
    }
    html += `</div>`
    viewContent.innerHTML = html
    return
  }

  if(state.selectedCam==null){ viewContent.textContent = 'Select a camera'; return }
  const room = ROOMS[state.selectedCam]
  if(state.power <= 0){ viewContent.innerHTML = `<img src="assets/static.svg" alt="static" style="max-width:100%; max-height:100%"/>`; return }
  const found = state.animatronics.find(a=>a.pos===state.selectedCam)
  if(found){ viewContent.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="assets/anim_face.svg" alt="anim" style="max-height:180px; width:auto"/><div style="color:#f88">${room} — ${found.name} HERE!</div></div>`; return }
  viewContent.textContent = room
}

function renderHud(){
  nightEl.textContent = state.night
  timeEl.textContent = state.time
  powerEl.textContent = Math.max(0, Math.round(state.power))
}

function renderMessage(t){ msgEl.textContent = t||'' }

function addWarning(text){ removeWarning(); const w=document.createElement('div'); w.className='warning-overlay'; w.innerHTML=`<div class="badge">${text}</div>`; view.appendChild(w) }
function removeWarning(){ const old = view.querySelector('.warning-overlay'); if(old) old.remove() }

function toggleDeskView(){ if(state.power<=0){ renderMessage('No power — cannot toggle desk view'); return } state.cameraPutDown = !state.cameraPutDown; if(state.cameraPutDown) state.selectedCam = null; renderAll() }
function toggleLeft(){ if(!state.running) return; state.doorLeftClosed = !state.doorLeftClosed; state.cameraPutDown=false; renderAll() }
function toggleRight(){ if(!state.running) return; state.doorRightClosed = !state.doorRightClosed; state.cameraPutDown=false; renderAll() }

doorLeftBtn.onclick = toggleLeft; doorRightBtn.onclick = toggleRight; restartBtn.onclick = ()=>{ startNewNight(1) }; toggleDeskBtn.onclick = ()=>{ toggleDeskView(); if(state.sound) ensureAudio() }

function animMoveTick(){ if(!state.running) return
  const difficulty = difficultySelect.value
  const diffMult = difficulty === 'easy'? 0.85 : difficulty==='hard'? 1.25 : 1.0
  state.animatronics.forEach(a=>{
    // base probability
    let base = (0.02 + state.time*0.003) * a.speedMod * diffMult * (1 + (state.night-1)*0.05)
    // watching camera slows them
    if(state.selectedCam === a.pos) base *= 0.3
    // power out increases aggression
    if(state.power <=0) base *= 2.5
    if(Math.random() < base){
      a.pos = Math.min(ROOMS.length-1, a.pos+1)
      if(state.sound) playSound('foot')
      // if reached office
      if(a.pos === ROOMS.length-1){
        if(!state.doorLeftClosed && !state.doorRightClosed){
          if(state.sound) playSound('jump')
          document.body.classList.add('screen-shake')
          setTimeout(()=> document.body.classList.remove('screen-shake'), 700)
          gameOver(`${a.name} entered the office while doors were open. You were caught!`)
        } else {
          renderMessage(`${a.name} is at your office door! Keep the doors closed.`)
          if(state.sound) playSound('knock')
        }
      }
    }
  })
}

function powerTick(){ if(!state.running) return
  // camera drain: if any camera selected
  if(state.selectedCam != null) state.power -= 0.5
  // doors
  if(state.doorLeftClosed) state.power -= 1
  if(state.doorRightClosed) state.power -= 1
  // natural drain
  state.power -= 0.05
  if(state.power <= 0){ state.power = 0; renderMessage('Power out! Cameras and doors disabled!'); state.selectedCam=null; state.cameraPutDown=false; state.doorLeftClosed=false; state.doorRightClosed=false }
}

function startNewNight(n){ state.night = n||state.night; state.time = 0; state.power = 100; state.selectedCam=null; state.cameraPutDown=false; state.doorLeftClosed=false; state.doorRightClosed=false; state.running = true; initAnimatronics(); loadBest(); renderAll(); }

function gameTick(){ if(!state.running) return; state.time += 1; renderHud(); powerTick(); animMoveTick(); renderAll(); const TICKS_TO_WIN = Math.max(20, BASE_TICKS_TO_WIN - (state.night-1)*6); if(state.time >= TICKS_TO_WIN){ // survive
    state.running = false; renderMessage('You survived the night! Proceeding to next night...'); saveBest(); setTimeout(()=>{ state.night += 1; startNewNight(state.night); }, 1200); } }

function gameOver(reason){ state.running=false; renderMessage(reason||'Game over'); viewContent.textContent = 'GAME OVER'; saveBest(); }

function renderAll(){ renderCams(); renderView(); renderHud(); }

// init
loadBest(); startNewNight(1)
setInterval(gameTick, TICK_MS)
setInterval(renderAll, 300)
