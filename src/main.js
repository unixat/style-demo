import '/css/core.scss'

let showBtn = document.getElementById('show-btn');

showBtn.addEventListener('click', () => {
    showBtn.innerText = showBtn.innerText === 'Show' ? 'Hide' : 'Show';
    let hiddenContainer = document.getElementById('hidden-container');
    hiddenContainer.classList.toggle('hidden');
})