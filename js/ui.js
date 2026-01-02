window.enterApp = function() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardLayout').style.display = 'flex';
    if (!localStorage.getItem('arcShieldTutorial')) document.getElementById('tutorialOverlay').style.display = 'flex';
}
window.navigate = function(pageId, btnElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    const titles = { 'creator': 'Launchpad', 'multisender': 'Multisender', 'locker': 'Locker', 'vesting': 'Vesting', 'bridge': 'Bridge', 'leaderboard': 'Social Hub' };
    document.getElementById('pageTitle').innerText = titles[pageId] || 'Dashboard';
}
window.nextTutorial = function(step) {
    document.querySelectorAll('.tut-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`tutStep${step}`).classList.add('active');
}
window.finishTutorial = function() {
    document.getElementById('tutorialOverlay').style.display = 'none';
    localStorage.setItem('arcShieldTutorial', 'true');
}
window.handleLogoUpload = function(input) {
    if(input.files && input.files[0]) {
        document.getElementById('logoFileName').innerText = input.files[0].name;
        const reader = new FileReader();
        reader.onload = function(e) { window.uploadedLogoData = e.target.result; };
        reader.readAsDataURL(input.files[0]);
    }
}
window.handleFileUpload = function(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { document.getElementById('csvInput').value = e.target.result; };
    reader.readAsText(file);
}
window.copyContractAddr = function() {
    navigator.clipboard.writeText(document.getElementById('newContractAddr').innerText);
    alert("Copiado!");
}
