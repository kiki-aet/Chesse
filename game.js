// Simple browser-based FNAF-like mini-game with textures.
// Added: office 'put down' camera view when clicking the same camera twice.

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
    // use the cam_frame texture as background
    d.style.backgroundImage = `url('assets/cam_frame.svg')`
    d.innerHTML = `<div style="padding:6px; color:#bfe; font-size:12px">Cam ${i+1}<br/><small>${r}</small></div>`
    d.onclick = ()=>{
      if(!state.running) return
      // If clicking the same camera while it's selected -> put down camera (office view)
      if(state.selectedCam === i){
        // deselect camera and put it down
        state.selectedCam = null
        state.cameraPutDown = true
        renderAll()
        return
      }

      // Selecting a different camera clears put-down state
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
  // If camera is put down: show office interior so player can watch the door
  if(state.cameraPutDown){
    // if power is out, show static
    if(state.power <= 0){
      viewContent.innerHTML = `<img src="assets/static.svg" alt="static" style="max-width:100%; max-height:100%"/>`
      return
    }

    // show office interior
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="assets/office_interior.svg" alt="office" style="max-width:100%; height:auto;"/>`;

    // if animatronic is at the office door, overlay an anim image and message
    if(state.animPos === ROOMS.length - 1){
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

  // if animatronic is at this camera, show the anim image
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

function toggleLeft(){ if(!state.running) return; state.doorLeftClosed = !state.doorLeftClosed; state.cameraPutDown = false; renderAll() }
function toggleRight(){ if(!state.running) return; state.doorRightClosed = !state.doorRightClosed; state.cameraPutDown = false; renderAll() }

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
