export class JamClientUI {
	constructor(jamClient, jamConnectParentElementId, onStateChanged) {
		this.jcClient = jamClient;
		this.onStateChanged = onStateChanged;
		let html = `
      <div class="flex flex-wrap items-center gap-2">
        <button id="invite-btn" data-jamcommand="invite" class="px-4 py-2 hw-btn text-emerald-800 font-black rounded-lg text-xs sm:text-sm flex items-center gap-2 hover:bg-white">
          <i data-lucide="radio" class="w-4 h-4 fill-emerald-700"></i> INVITE
        </button>
        <button id="join-btn" data-jamcommand="join" class="px-4 py-2 hw-btn text-emerald-800 font-black rounded-lg text-xs sm:text-sm flex items-center gap-2 hover:bg-white">
          <i data-lucide="plug-zap" class="w-4 h-4 fill-emerald-700"></i> JOIN
        </button>
        <button id="resync-btn" data-jamcommand="resync" class="px-4 py-2 hw-btn text-emerald-800 font-black rounded-lg text-xs sm:text-sm flex items-center gap-2 hover:bg-white">
          <i data-lucide="cloud-sync" class="w-4 h-4 fill-emerald-700"></i> RESYNC
        </button>
      </div>`;
		document.getElementById(jamConnectParentElementId).innerHTML += html;
		
		this.btnInvite = document.querySelector("button[data-jamcommand='invite']");
		this.btnJoin = document.querySelector("button[data-jamcommand='join']");
		this.btnResync = document.querySelector("button[data-jamcommand='resync']")
		this.btnPlay = document.querySelector("button[data-jamcommand='play']");
		this.btnStop = document.querySelector("button[data-jamcommand='stop']");
		
		this.btnInvite.addEventListener('click', async () => {
			await this.jcClient.invite();
		});
		
		this.btnJoin.addEventListener('click', async () => {
			await this.jcClient.join();
		});
		
		this.btnResync.addEventListener('click', () => {
			this.jcClient.connector.resync();
		});
	}
	
	onStateChanged(state) {
		if (this.prevState && JSON.stringify(this.prevState) == JSON.stringify(state)) {
			//console.log("onStateChanged: state unchanged", state, this.prevState);
			return;
		}
		//console.log("onStateChanged", JSON.stringify(state));
		this.prevState = state;
		
		this.btnInvite.disabled = !state.canInvite || state.isInviting;
		this.btnInvite.classList.toggle("active", state.userRole === "Host");
		this.btnJoin.disabled = !state.canJoin || state.isJoining;
		this.btnJoin.classList.toggle("active", state.userRole === "Guest");
		this.btnResync.style.display = state.userRole === "Host" && state.isPlaying ? "flex" : "none";
		this.btnPlay.disabled = !state.canStart;
		
		this.audio.setBpm(state.bpm);
		
		this.onStateChanged(state);
	}
}