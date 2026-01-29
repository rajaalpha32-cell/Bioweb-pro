// --- BIO WEB PRO: LOCAL JSON ENGINE ---

const state = {
    currentIdx: 0,
    score: 0,
    currentSub: '',
    activeQuestions: [],
    reviews: [],
    timer: null,
    // We will cache the questions here so we don't load the file 5 times
    questionBank: null 
};

// --- DATA FETCHING (LOCAL) ---
async function loadQuestionBank() {
    if (state.questionBank) return state.questionBank;
    
    try {
        // This looks for questions.json in the same folder
        const response = await fetch('questions.json'); 
        const data = await response.json();
        state.questionBank = data;
        return data;
    } catch (error) {
        console.error("Could not load questions:", error);
        alert("Error loading question bank. Make sure questions.json is in the folder!");
        return {};
    }
}

async function getQuestionsLocal(subject, limit = 50) {
    const data = await loadQuestionBank();
    let questions = data[subject] || [];
    
    // Shuffle and slice
    return questions.sort(() => 0.5 - Math.random()).slice(0, limit);
}

// --- EXAM LOGIC ---
async function startSubjectExam(subject) {
    const container = document.getElementById(`${subject}-container`);
    container.innerHTML = `<div class="timer-banner">Loading ${subject} Module...</div>`;
    
    // Artificial delay to make it feel professional
    await new Promise(r => setTimeout(r, 500)); 

    const questions = await getQuestionsLocal(subject, 50);
    
    if(questions.length === 0) {
        container.innerHTML = `<p>No questions found for ${subject}. check JSON file.</p>`;
        return;
    }
    
    initExam(subject, questions);
    // Standard subject exam time (e.g., 60 mins) or infinite? 
    // Usually subject practice doesn't have a strict timer, but let's add one if you want.
}

async function startMegaMock() {
    const container = document.getElementById(`mega-mock-container`);
    container.innerHTML = `<div class="timer-banner">INITIALIZING CEE SIMULATION...</div>`;

    const data = await loadQuestionBank();

    // Safe fetching function
    const getSet = (sub, count) => (data[sub] || []).sort(() => 0.5 - Math.random()).slice(0, count);

    const p = getSet('physics', 50);
    const c = getSet('chemistry', 50);
    const b = getSet('botany', 40);
    const z = getSet('zoology', 40);
    const m = getSet('mat', 20);

    const mockSet = [...p, ...c, ...b, ...z, ...m];

    if(mockSet.length === 0) {
         container.innerHTML = `<div class="results-card">Error: No questions found in JSON.</div>`;
         return;
    }
    
    initExam('mega-mock', mockSet);
    startTimer(180); // 3 Hours
}

// --- CORE ENGINE (UNCHANGED LOGIC) ---
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
    
    // Shuffle options so A, B, C, D aren't always the same
    // We create a copy of options to shuffle, but keep track of the correct answer string
    const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());

    container.innerHTML = `
        <div class="question-card fade-in">
            <div class="q-header">
                <span class="badge">Q: ${state.currentIdx + 1} / ${state.activeQuestions.length}</span>
                <span class="score-label">Score: ${state.score.toFixed(2)}</span>
            </div>
            <h3 class="q-text">${q.q}</h3>
            <div class="options-grid">
                ${shuffledOptions.map(opt => `
                    <button class="organelle-btn" onclick="processAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.a.replace(/'/g, "\\'")}')">${opt}</button>
                `).join('')}
            </div>
        </div>`;
}

function processAnswer(btn, selected, correct) {
    const btns = btn.parentElement.querySelectorAll('button');
    btns.forEach(b => b.style.pointerEvents = 'none');
    
    // Save for review
    state.reviews.push({ 
        question: state.activeQuestions[state.currentIdx].q, 
        selected: selected, 
        correct: correct 
    });

    if(selected === correct) {
        btn.classList.add('correct-selected');
        state.score += 1;
    } else {
        btn.classList.add('wrong-selected');
        state.score -= 0.25;
        // Highlight the correct one
        btns.forEach(b => { 
            if(b.innerText === correct) b.classList.add('correct-glow'); 
        });
    }

    state.currentIdx++;
    setTimeout(renderQuestion, 1000); // 1 second delay to see answer
}

// --- UTILS ---
function showPage(pageId) {
    stopTimer();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active-page');
    if(pageId === 'home') { updateGoldenPoint(); renderStats(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStats() {
    const best = localStorage.getItem('bioweb_pb') || "0.00";
    const el = document.getElementById('best-score');
    if(el) el.innerText = best;
}

function toggleTheme() { document.body.classList.toggle('dark-theme'); }

function startTimer(mins) {
    let time = mins * 60;
    const display = document.createElement('div');
    display.id = 'timer-display';
    display.className = 'timer-banner';
    document.getElementById(`${state.currentSub}-container`).prepend(display);
    
    state.timer = setInterval(() => {
        let m = Math.floor(time / 60);
        let s = time % 60;
        display.innerText = `⏳ Time Remaining: ${m}:${s < 10 ? '0' + s : s}`;
        if (time <= 300) display.style.color = '#ff4444'; // Red alert last 5 mins
        if (--time < 0) endExam();
    }, 1000);
}

function stopTimer() {
    clearInterval(state.timer);
    const t = document.getElementById('timer-display');
    if(t) t.remove();
}

function endExam() {
    stopTimer();
    // Save Personal Best
    const currentPb = parseFloat(localStorage.getItem('bioweb_pb') || 0);
    if(state.score > currentPb) {
        localStorage.setItem('bioweb_pb', state.score.toFixed(2));
    }

    const container = document.getElementById(`${state.currentSub}-container`);
    container.innerHTML = `
        <div class="results-card">
            <h2>Exam Submitted</h2>
            <div class="final-score">${state.score.toFixed(2)}</div>
            <p>${state.score >= 40 ? "Great job! Keep pushing." : "Review your mistakes below."}</p>
            <button class="cta-btn" onclick="showReview()">View Detailed Analysis</button>
            <br><br>
            <button class="cta-btn secondary" onclick="showPage('home')">Return Home</button>
        </div>`;
}

function showReview() {
    const container = document.getElementById(`${state.currentSub}-container`);
    let html = `<div class="review-container"><h2>Performance Analysis</h2>`;
    
    state.reviews.forEach((r, i) => {
        const isCorrect = r.selected === r.correct;
        html += `
        <div class="review-box ${isCorrect ? 'rev-up' : 'rev-down'}">
            <p><strong>Q${i+1}:</strong> ${r.question}</p>
            <div class="review-details">
                <span class="you-chose">You: ${r.selected}</span>
                <span class="correct-ans">Correct: ${r.correct}</span>
            </div>
        </div>`;
    });
    
    html += `<button class="cta-btn" onclick="showPage('home')">Back to Dashboard</button></div>`;
    container.innerHTML = html;
}

// --- GOLDEN POINTS TICKER ---
const goldenPoints = [
    "Botany: C4 plants have Kranz Anatomy.",
    "Zoology: SA Node is the pacemaker.",
    "Chem: Fluorine is most electronegative.",
    "Physics: Isothermal process means ΔT = 0.",
    "MAT: Check numerical series differences.",
    "Cell: Mitochondria = Powerhouse.",
    "Genetics: 9:3:3:1 is Dihybrid ratio."
];

function updateGoldenPoint() {
    const el = document.getElementById('golden-point-text');
    if(el) el.innerText = goldenPoints[Math.floor(Math.random() * goldenPoints.length)];
}

// Start
window.onload = () => { 
    renderStats(); 
    updateGoldenPoint(); 
};
