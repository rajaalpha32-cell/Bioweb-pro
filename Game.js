/**
 * BioWeb PRO - High-Performance Exam Engine
 * Optimized for NEB/CEE 2026
 */

const state = {
    currentIdx: 0,
    score: 0,
    currentSub: '',
    activeQuestions: [],
    reviews: [],
    timer: null
};

// --- CORE NAVIGATION ---
function showPage(pageId) {
    stopTimer();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active-page');
    
    if(pageId === 'home') {
        updateGoldenPoint();
        renderStats();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStats() {
    const best = localStorage.getItem('bioweb_pb') || "0.00";
    document.getElementById('best-score').innerText = best;
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
}

// --- EXAM ENGINE ---
async function fetchQuestions() {
    try {
        const response = await fetch('questions.json');
        return await response.json();
    } catch (err) {
        console.error("Data Fetch Error:", err);
        return null;
    }
}

async function startSubjectExam(subject) {
    const data = await fetchQuestions();
    if(!data || !data[subject]) return;
    
    initExam(subject, data[subject].sort(() => 0.5 - Math.random()));
}

async function startMegaMock() {
    const data = await fetchQuestions();
    if(!data) return;

    const mockSet = [
        ...data.physics.sort(() => 0.5 - Math.random()).slice(0, 50),
        ...data.chemistry.sort(() => 0.5 - Math.random()).slice(0, 50),
        ...data.botany.sort(() => 0.5 - Math.random()).slice(0, 40),
        ...data.zoology.sort(() => 0.5 - Math.random()).slice(0, 40),
        ...data.mat.sort(() => 0.5 - Math.random()).slice(0, 20)
    ].sort(() => 0.5 - Math.random());

    initExam('mega-mock', mockSet);
    startTimer(180);
}

function initExam(sub, questions) {
    state.currentSub = sub;
    state.activeQuestions = questions;
    state.currentIdx = 0;
    state.score = 0;
    state.reviews = [];
    renderQuestion();
}

function renderQuestion() {
    const container = document.getElementById(`${state.currentSub}-container`);
    if(state.currentIdx >= state.activeQuestions.length) return endExam();

    const q = state.activeQuestions[state.currentIdx];
    container.innerHTML = `
        <div class="question-card fade-in">
            <div class="q-header">
                <span class="badge">Progress: ${state.currentIdx + 1}/${state.activeQuestions.length}</span>
                <span class="score-label">Points: ${state.score.toFixed(2)}</span>
            </div>
            <h3 class="q-text">${q.q}</h3>
            <div class="options-grid">
                ${q.options.map(opt => `
                    <button class="organelle-btn" onclick="processAnswer(this, '${opt}', '${q.a}')">${opt}</button>
                `).join('')}
            </div>
        </div>`;
}

function processAnswer(btn, selected, correct) {
    const btns = btn.parentElement.querySelectorAll('button');
    btns.forEach(b => b.style.pointerEvents = 'none');

    state.reviews.push({ question: state.activeQuestions[state.currentIdx].q, selected, correct });

    if(selected === correct) {
        btn.classList.add('correct-selected');
        state.score += 1;
    } else {
        btn.classList.add('wrong-selected');
        state.score -= 0.25;
        btns.forEach(b => { if(b.innerText === correct) b.classList.add('correct-glow'); });
    }

    state.currentIdx++;
    setTimeout(renderQuestion, 800);
}

function endExam() {
    stopTimer();
    const pb = localStorage.getItem('bioweb_pb') || 0;
    if(state.score > pb) localStorage.setItem('bioweb_pb', state.score.toFixed(2));

    const container = document.getElementById(`${state.currentSub}-container`);
    container.innerHTML = `
        <div class="results-card">
            <h2>Exam Complete</h2>
            <div class="final-score">${state.score.toFixed(2)}</div>
            <p>Accuracy: ${Math.max(0, Math.round((state.score / state.activeQuestions.length) * 100))}%</p>
            <button class="cta-btn" onclick="showReview()">Review Analysis</button>
            <button class="cta-btn secondary" onclick="showPage('home')">Home</button>
        </div>`;
}

function showReview() {
    const container = document.getElementById(`${state.currentSub}-container`);
    let html = `<div class="review-container"><h2>Analysis</h2>`;
    state.reviews.forEach((r, i) => {
        const isCorrect = r.selected === r.correct;
        html += `
            <div class="review-box ${isCorrect ? 'rev-up' : 'rev-down'}">
                <p><strong>Q${i+1}:</strong> ${r.question}</p>
                <small>Result: <span style="color:${isCorrect?'#10b981':'#ef4444'}">${r.selected}</span> | Correct: ${r.correct}</small>
            </div>`;
    });
    html += `<button class="cta-btn" onclick="showPage('home')">Finish</button></div>`;
    container.innerHTML = html;
}

// --- TIMER & UTILS ---
function startTimer(mins) {
    let time = mins * 60;
    const display = document.createElement('div');
    display.id = 'timer-display';
    display.className = 'timer-banner';
    document.getElementById(`${state.currentSub}-container`).prepend(display);

    state.timer = setInterval(() => {
        let m = Math.floor(time / 60), s = time % 60;
        display.innerText = `⏳ Time Remaining: ${m}:${s < 10 ? '0' + s : s}`;
        if (--time < 0) endExam();
    }, 1000);
}

function stopTimer() {
    clearInterval(state.timer);
    const t = document.getElementById('timer-display');
    if(t) t.remove();
}

// --- LIBRARY ---
const libraryDB = {
    physics: `<h3>Physics Core</h3><ul><li>Lens Maker: 1/f = (μ-1)(1/R1-1/R2)</li><li>De-Broglie: λ = h/mv</li></ul>`,
    chemistry: `<h3>Chemistry Core</h3><ul><li>Reimer-Tiemann: Phenol → Salicylaldehyde</li><li>Trend: Electronegativity F > O > N > Cl</li></ul>`,
    biology: `<h3>Biology Core</h3><ul><li>WBC: Never Let Monkeys Eat Bananas</li><li>Plants: C4 = Kranz Anatomy</li></ul>`,
    mat: `<h3>MAT Logic</h3><ul><li>EJOTY: 5-10-15-20-25</li><li>Series: Check Prime & Squares</li></ul>`
};

function openNote(id) {
    document.getElementById('library-main').style.display = 'none';
    document.getElementById('note-display').style.display = 'block';
    document.getElementById('note-content').innerHTML = libraryDB[id];
}
function closeNote() {
    document.getElementById('library-main').style.display = 'grid';
    document.getElementById('note-display').style.display = 'none';
}

const goldenPoints = [
    "C4 plants avoid photorespiration via Kranz Anatomy.",
    "The SA Node is the heart's natural pacemaker.",
    "Fluorine is the most electronegative element.",
    "Adiabatic expansion causes a decrease in temperature."
];
function updateGoldenPoint() {
    const el = document.getElementById('golden-point-text');
    if(el) el.innerText = goldenPoints[Math.floor(Math.random() * goldenPoints.length)];
}

window.onload = () => { renderStats(); updateGoldenPoint(); };