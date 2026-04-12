import { supabase, AppState } from 'https://cdn.doruklu.com/supabase-config.js';
import { ui } from 'https://cdn.doruklu.com/ui.js';

export function loadUserLinks() {
    const appsContainer = document.getElementById('apps-container');
    const perms = AppState.profile.permissions || {};
    const isSuper = AppState.profile.role === 'super_admin';
    
    appsContainer.innerHTML = '';
    
    const appGroups = [
        { 
            name: 'Toprak Game', 
            url: 'https://toprak.doruklu.com',
            key: 'toprak_game',
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
            desc: 'Bilgi kartı tabanlı eğitici oyun platformu.'
        },
        { 
            name: 'Özgür Dashboard', 
            url: 'https://ozgur.doruklu.com',
            key: 'ozgur_dashboard',
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
            desc: 'Veri analizi ve sistem izleme paneli.'
        },
        { 
            name: 'Nurcan App', 
            url: 'https://nurcan.doruklu.com',
            key: 'nurcan_app',
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
            desc: 'Kişisel yönetim ve planlama uygulaması.'
        }
    ];
    
    appGroups.forEach(group => {
        const hasAccess = isSuper || perms[group.key] === true;
        const opacity = hasAccess ? '1' : '0.6';
        const badge = hasAccess ? '<span class="badge success">Erişim Açık</span>' : '<span class="badge danger">Yetki Bekliyor</span>';
        
        const cardHTML = `
            <a href="${hasAccess ? group.url : '#'}" class="app-card" style="opacity: ${opacity}; display:flex; flex-direction:column; gap:15px; border: 1px solid ${hasAccess ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; color:var(--primary);">${group.icon}</div>
                    ${badge}
                </div>
                <div>
                    <h3 style="margin:0 0 5px 0; font-size:1.1rem;">${group.name}</h3>
                    <p style="margin:0; font-size:0.85rem; color:var(--text-secondary); height:40px; overflow:hidden;">${group.desc}</p>
                </div>
                <div style="margin-top:auto; display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:700; color:var(--primary);">
                    ${hasAccess ? 'UYGULAMAYA GİT <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' : 'KİLİTLİ'}
                </div>
            </a>
        `;
        appsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// ==== ADMIN PANEL ====
export async function initAdminPanel() {
    document.getElementById('back-to-dash-btn').onclick = () => {
        ui.showScreen('dashboard-screen');
    };

    // User management load
    if (AppState.profile.role === 'super_admin') {
        ui.setLoading(true);
        const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        ui.setLoading(false);

        if (users) {
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = users.map(user => {
                const p = user.permissions || {};
                const isSuper = user.role === 'super_admin';
                return `
                    <tr>
                        <td>
                            <div style="font-weight:700; color:white;">${user.display_name || user.email.split('@')[0]}</div>
                            <div style="font-size:0.75rem; color:rgba(255,255,255,0.4);">ID: ${user.id.substring(0,8)}... | ${user.role}</div>
                        </td>
                        <td><label class="toggle"><input type="checkbox" onchange="window.updatePerm('${user.id}', 'toprak_game', this.checked)" ${p.toprak_game || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}><span class="slider"></span></label></td>
                        <td><label class="toggle"><input type="checkbox" onchange="window.updatePerm('${user.id}', 'ozgur_dashboard', this.checked)" ${p.ozgur_dashboard || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}><span class="slider"></span></label></td>
                        <td><label class="toggle"><input type="checkbox" onchange="window.updatePerm('${user.id}', 'nurcan_app', this.checked)" ${p.nurcan_app || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}><span class="slider"></span></label></td>
                    </tr>
                `;
            }).join('');
        }
    } else {
        document.getElementById('nav-users').style.display = 'none';
        document.getElementById('users-section').style.display = 'none';
        document.getElementById('nav-cards').click();
    }
}

window.updatePerm = async (userId, permKey, newValue) => {
    const { data: profile } = await supabase.from('profiles').select('permissions').eq('id', userId).single();
    let perms = profile?.permissions || {};
    perms[permKey] = newValue;
    
    await supabase.from('profiles').update({ permissions: perms }).eq('id', userId);
    ui.showSuccess("Yetki güncellendi.");
};

// ==== CARDS (FLASHCARDS) ====
export async function initCardManager() {
    // Tab switching
    const tabs = {
        'nav-users': 'users-section',
        'nav-cards': 'cards-section'
    };
    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).onclick = () => {
            Object.keys(tabs).forEach(t => {
                document.getElementById(t).classList.toggle('active', t === tabId);
                document.getElementById(tabs[t]).style.display = (t === tabId) ? 'block' : 'none';
            });
        };
    });

    document.getElementById('open-add-card-btn').onclick = () => {
        const container = document.getElementById('add-card-container');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    };

    document.getElementById('cancel-add-btn').onclick = () => {
        document.getElementById('add-card-container').style.display = 'none';
        document.getElementById('add-card-form').reset();
    };

    document.getElementById('q-type').onchange = (e) => {
        document.getElementById('options-group').style.display = e.target.value === 'free_text' ? 'none' : 'block';
    };

    document.getElementById('add-card-form').onsubmit = handleSaveCard;

    loadCards();
}

async function loadCards() {
    const { data: cards } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '';

    if (cards) {
        cards.forEach(card => {
            const typeLabel = { 'single_choice': 'SINGLE', 'multi_choice': 'MULTI', 'free_text': 'TEXT' }[card.question_type];
            const typeColor = { 'single_choice': '#818cf8', 'multi_choice': '#c084fc', 'free_text': '#4ade80' }[card.question_type];
            
            const cardHTML = `
                <div class="question-card-code">
                    <div class="q-header">
                        <span style="color: ${typeColor}">// UUID: ${card.id.substring(0,8)}...</span>
                        <div class="q-type-badge" style="border-color: ${typeColor}44; color: ${typeColor}">${typeLabel}</div>
                    </div>
                    <div class="q-body">
                        <span style="color: #6366f1">const</span> question = <span style="color: #eab308">"${card.content}"</span>;<br>
                        ${card.options ? `<span style="color: #6366f1">const</span> options = [<span style="color: #94a3b8">${card.options.map(o => `"${o}"`).join(', ')}</span>];` : ''}
                    </div>
                    <div class="q-footer">
                        <div style="font-size: 0.75rem; color: #4ade80">Correct: ${Array.isArray(card.correct_answer) ? `[${card.correct_answer}]` : `"${card.correct_answer}"`}</div>
                        <div class="q-actions">
                            <button class="q-btn delete" onclick="window.deleteCard('${card.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
}

async function handleSaveCard(e) {
    e.preventDefault();
    ui.setLoading(true);
    
    const type = document.getElementById('q-type').value;
    const content = document.getElementById('q-content').value;
    const optionsRaw = document.getElementById('q-options').value;
    const answerRaw = document.getElementById('q-answer').value;

    let options = null; 
    let correctAnswer = null;

    if (type !== 'free_text') options = optionsRaw.split(',').map(s => s.trim());
    if (type === 'multi_choice') correctAnswer = answerRaw.split(',').map(s => s.trim());
    else correctAnswer = answerRaw.trim();

    const { error } = await supabase.from('flashcards').insert({
        question_type: type,
        content: content,
        options: options,
        correct_answer: correctAnswer
    });

    ui.setLoading(false);
    if (!error) {
        ui.showSuccess("Soru başarıyla eklendi.");
        document.getElementById('add-card-container').style.display = 'none';
        document.getElementById('add-card-form').reset();
        loadCards();
    } else {
        ui.showError("Hata: " + error.message);
    }
}

window.deleteCard = async (id) => {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    await supabase.from('flashcards').delete().eq('id', id);
    ui.showSuccess("Soru silindi.");
    loadCards();
};

import { initAuth } from './auth.js';
document.addEventListener('DOMContentLoaded', () => initAuth());
