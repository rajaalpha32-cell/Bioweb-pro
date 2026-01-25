// --- FIREBASE INITIALIZATION (Based on your image) ---
const firebaseConfig = {
  apiKey: "AIzaSyB-I8ywYVNqtKORC_gg-AWH", // truncated for safety, ensure full key is here
  authDomain: "bioweb-pro1.firebaseapp.com",
  projectId: "bioweb-pro1",
  storageBucket: "bioweb-pro1.firebasestorage.app",
  messagingSenderId: "474478594127",
  appId: "1:474478594127:web:bf8571904e",
  measurementId: "G-Z1P4PEYRBC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const state = {
    currentIdx: 0,
    score: 0,
    currentSub: '',
    activeQuestions: [],
    reviews: [],
    timer: null
};

// --- CLOUD DATA FETCHING ---
async function getQuestionsFromCloud(subject, limit = 50) {
    try {
        const snapshot = await db.collection("questions")
            .where("subject", "==", subject)
            .get();
        
        let questions = [];
        snapshot.forEach(doc => {
            questions.push(doc.data());
        });
        
        // Return shuffled questions
        return questions.sort(() => 0.5 - Math.random()).slice(0, limit);
    } catch (error) {
        console.error("Cloud Fetch Error: ", error);
        return [];
    }
}

// --- UPDATED EXAM START LOGIC ---
async function startSubjectExam(subject) {
    const container = document.getElementById(`${subject}-container`);
    container.innerHTML = `<div class="timer-banner">Syncing with Cloud...</div>`;
    
    const questions = await getQuestionsFromCloud(subject, 50);
    if(questions.length === 0) {
        container.innerHTML = `<p>No questions found in Cloud for ${subject}. Please check Firestore collection 'questions'.</p>`;
        return;
    }
    
    initExam(subject, questions);
}

async function startMegaMock() {
    const container = document.getElementById(`mega-mock-container`);
    container.innerHTML = `<div class="timer-banner">Assembling Mega Mock from Cloud...</div>`;

    const p = await getQuestionsFromCloud('physics', 50);
    const c = await getQuestionsFromCloud('chemistry', 50);
    const b = await getQuestionsFromCloud('botany', 40);
    const z = await getQuestionsFromCloud('zoology', 40);
    const m = await getQuestionsFromCloud('mat', 20);

    const mockSet = [...p, ...c, ...b, ...z, ...m].sort(() => 0.5 - Math.random());
    
    initExam('mega-mock', mockSet);
    startTimer(180);
}

// --- CORE ENGINE ---
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
    document.getElementById('best-score').innerText = best;
}

function toggleTheme() { document.body.classList.toggle('dark-theme'); }

function startTimer(mins) {
    let time = mins * 60;
    const display = document.createElement('div');
    display.id = 'timer-display';
    display.className = 'timer-banner';
    document.getElementById(`${state.currentSub}-container`).prepend(display);
    state.timer = setInterval(() => {
        let m = Math.floor(time / 60), s = time % 60;
        display.innerText = `⏳ Time: ${m}:${s < 10 ? '0' + s : s}`;
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
    const pb = localStorage.getItem('bioweb_pb') || 0;
    if(state.score > pb) localStorage.setItem('bioweb_pb', state.score.toFixed(2));
    const container = document.getElementById(`${state.currentSub}-container`);
    container.innerHTML = `
        <div class="results-card">
            <h2>Exam Complete</h2>
            <div class="final-score">${state.score.toFixed(2)}</div>
            <button class="cta-btn" onclick="showReview()">Review Analysis</button>
        </div>`;
}

function showReview() {
    const container = document.getElementById(`${state.currentSub}-container`);
    let html = `<div class="review-container"><h2>Analysis</h2>`;
    state.reviews.forEach((r, i) => {
        const isCorrect = r.selected === r.correct;
        html += `<div class="review-box ${isCorrect ? 'rev-up' : 'rev-down'}">
            <p><strong>Q${i+1}:</strong> ${r.question}</p>
            <small>You: ${r.selected} | Correct: ${r.correct}</small>
        </div>`;
    });
    html += `<button class="cta-btn" onclick="showPage('home')">Finish</button></div>`;
    container.innerHTML = html;
}

// --- GOLDEN POINTS ---
const goldenPoints = ["C4 plants: Kranz Anatomy", "SA Node: Pacemaker", "Fluorine: Max EN", "Isothermal: ΔT = 0"];
function updateGoldenPoint() {
    const el = document.getElementById('golden-point-text');
    if(el) el.innerText = goldenPoints[Math.floor(Math.random() * goldenPoints.length)];
}

window.onload = () => { renderStats(); updateGoldenPoint(); };
