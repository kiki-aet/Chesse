// Simple browser-based FNAF-like mini-game.
// Rules (simple): survive 60 seconds. Cameras and doors use power. An animatronic moves closer each tick.

const ROOMS = ["Show Stage","Dining Room","Kitchen","Hallway","Office"]
let state = {
  time: 0,
  power: 100,
  selectedCam: null,
  doorLeftClosed: false,
  doorRightClosed: false,
  animPos: 0, // 0..4, 4 == office
  running: true,
}

const TICKS_TO_WIN = 60
const TICK_MS = 1000

// elements
const timeEl = document.getElementById('time')
const powerEl = document.getElementById('power')
const camsEl = document.getElementById('cams')
const viewContent = document.getElementById('view-content')
const msgEl = document.getElementById('message')
const doorLeftBtn = document.getElementById('door-left')
const doorRightBtn = document.getElementById('door-right')
const restartBtn = document.getElementById('restart')

function renderCams(){
  camsEl.innerHTML = ''
  ROOMS.forEach((r, i) =>{
    const d = document.createElement('div')
    d.className = 'cam-thumb' + (state.selectedCam===i? ' selected':'')
    d.textContent = `Cam ${i+1} — ${r}`
    d.onclick = ()=>{
      if(!state.running) return
      state.selectedCam = (state.selectedCam===i? null : i)
      renderAll()
    }
    camsEl.appendChild(d)
  })
}

function renderView(){
  if(state.selectedCam==null){
    viewContent.textContent = 'Select a camera'
    return
  }
  const room = ROOMS[state.selectedCam]
  let s = `${room}`
  if(state.selectedCam === state.animPos){
    s += ' — ANIMATRONIC HERE!'
  }
  viewContent.textContent = s
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

function toggleLeft(){ if(!state.running) return; state.doorLeftClosed = !state.doorLeftClosed; renderAll() }
function toggleRight(){ if(!state.running) return; state.doorRightClosed = !state.doorRightClosed; renderAll() }

doorLeftBtn.onclick = toggleLeft
doorRightBtn.onclick = toggleRight
restartBtn.onclick = ()=>{ location.reload() }

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
    // if it reached the office
    if(state.animPos === ROOMS.length-1){
      // if any door is open -> instant attack
      if(!state.doorLeftClosed && !state.doorRightClosed){
        gameOver('The animatronic entered the office while doors were open. You were caught!')
      } else {
        // doors closed: it bangs until you open a door (consume power)
        renderMessage('The animatronic is at your office door! Keep the doors closed to survive.')
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
}

function win(){
  state.running = false
  renderMessage('You survived the night! Congrats!')
  viewContent.textContent = 'YOU WIN'
}

function renderAll(){
  renderCams()
  renderView()
  renderHud()
}

renderAll()
// start ticks
setInterval(gameTick, TICK_MS)
// small random additional checks to keep UI reactive
setInterval(renderAll, 300)
