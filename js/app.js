import { supabase, AppState } from 'https://cdn.doruklu.com/supabase-config.js';
import { ui } from 'https://cdn.doruklu.com/ui.js';

export function loadUserLinks() {
    const appsContainer = document.getElementById('apps-container');
    const perms = AppState.profile.permissions || {};
    const isSuper = AppState.profile.role === 'super_admin';
    
    appsContainer.innerHTML = '';
    
    const appGroups = [
        { 
            name: 'Toprak Platformu', 
            url: 'https://toprak.doruklu.com',
            key: 'toprak_game',
            pages: [
                { name: 'Bilgi Kartı Oyunu', url: 'https://toprak.doruklu.com' },
                { name: 'Skor Tablosu', url: 'https://toprak.doruklu.com/#leaderboard' }
            ]
        },
        { 
            name: 'Özgür Platformu', 
            url: 'https://ozgur.doruklu.com',
            key: 'ozgur_dashboard',
            pages: [
                { name: 'Admin Kontrol Paneli', url: 'https://ozgur.doruklu.com' }
            ]
        },
        { 
            name: 'Nurcan Platformu', 
            url: 'https://nurcan.doruklu.com',
            key: 'nurcan_app',
            pages: [
                { name: 'Ana Uygulama', url: 'https://nurcan.doruklu.com' }
            ]
        }
    ];
    
    appGroups.forEach(group => {
        const hasAccess = isSuper || perms[group.key] === true;
        const opacity = hasAccess ? '1' : '0.5';
        const badge = hasAccess ? '<span class="badge success">Erişim Açık</span>' : '<span class="badge danger">Yetki Yok</span>';
        
        let pagesHTML = '';
        if (hasAccess) {
            pagesHTML = group.pages.map(page => `
                <a href="${page.url}" class="sub-page-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                    ${page.name}
                </a>
            `).join('');
        }

        appsContainer.innerHTML += `
            <div class="app-group-card" style="opacity: ${opacity}">
                <div class="app-group-header">
                    <a href="${hasAccess ? group.url : '#'}" style="text-decoration:none; color:inherit; flex:1;">
                        <h3 style="margin:0;">${group.name}</h3>
                    </a>
                    ${badge}
                </div>
                <div class="app-pages-list">
                    ${hasAccess ? pagesHTML : '<p style="font-size:0.85rem; color:rgba(255,255,255,0.4); margin: 0 0.5rem;">Erişmek için yöneticiden yetki almalısınız.</p>'}
                </div>
            </div>
        `;
    });
}

// ==== USERS TAB ====
export async function initAdminPanel() {
    // Only super_admin or admin can see the management screen
    // Note: Triggered via the global profile badge dropdown
    document.getElementById('back-to-dash-btn').addEventListener('click', () => {
        document.getElementById('management-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'flex';
    });

    // Only super_admin can see the user management tab
    if (AppState.profile.role !== 'super_admin') {
        document.getElementById('nav-users').style.display = 'none';
        document.getElementById('users-section').style.display = 'none';
        document.getElementById('nav-cards').click(); // Switch to cards
        return;
    }

    ui.setLoading(true);
    const { data: users, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    ui.setLoading(false);

    if (error) return;

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    users.forEach(user => {
        const p = user.permissions || {};
        const isSuper = user.role === 'super_admin';
        
        tbody.innerHTML += `
            <tr>
                <td>${user.display_name || user.email || 'Bilinmiyor'}<br><small style="color:rgba(255,255,255,0.5)">Role: ${user.role}</small></td>
                <td>
                    <label class="toggle">
                        <input type="checkbox" onclick="window.updatePerm('${user.id}', 'toprak_game', this.checked)" ${p.toprak_game || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <label class="toggle">
                        <input type="checkbox" onclick="window.updatePerm('${user.id}', 'ozgur_dashboard', this.checked)" ${p.ozgur_dashboard || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <label class="toggle">
                        <input type="checkbox" onclick="window.updatePerm('${user.id}', 'nurcan_app', this.checked)" ${p.nurcan_app || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
            </tr>
        `;
    });
}

window.updatePerm = async (userId, permKey, newValue) => {
    const { data: oldProfile } = await supabase.from('profiles').select('permissions').eq('id', userId).single();
    let currentPerms = oldProfile?.permissions || {};
    currentPerms[permKey] = newValue;
    Object.keys(currentPerms).forEach(k => currentPerms[k] = Boolean(currentPerms[k]));
    
    const { error } = await supabase.from('profiles').update({ permissions: currentPerms }).eq('id', userId);
    if (error) ui.showError("Yetki güncellenemedi!");
    else ui.showSuccess("Yetki kaydedildi.");
};

// ==== CARDS (FLASHCARDS) TAB ====
export async function initCardManager() {
    // Nav Tab Setup
    document.getElementById('nav-users').addEventListener('click', () => {
        document.getElementById('users-section').style.display = 'block';
        document.getElementById('cards-section').style.display = 'none';
        document.getElementById('nav-users').classList.add('active');
        document.getElementById('nav-cards').classList.remove('active');
    });
    document.getElementById('nav-cards').addEventListener('click', () => {
        document.getElementById('users-section').style.display = 'none';
        document.getElementById('cards-section').style.display = 'block';
        document.getElementById('nav-cards').classList.add('active');
        document.getElementById('nav-users').classList.remove('active');
    });

    document.getElementById('q-type').addEventListener('change', handleTypeChange);
    document.getElementById('add-card-form').addEventListener('submit', handleAddCard);

    loadCards();
}

function handleTypeChange() {
    const type = document.getElementById('q-type').value;
    const optionsGroup = document.getElementById('options-group');
    if (type === 'free_text') {
        optionsGroup.style.display = 'none';
        document.getElementById('q-answer').placeholder = 'Doğru cevap (Metin)';
    } else {
        optionsGroup.style.display = 'block';
        document.getElementById('q-answer').placeholder = 'Doğru cevap(lar) (Çoklu ise virgülle ayırın)';
    }
}

async function loadCards() {
    const { data: cards, error } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('cards-table-body');
    tbody.innerHTML = '';
    if (cards) {
        const typeMapping = { 'single_choice': 'Tekli', 'multi_choice': 'Çoklu', 'free_text': 'Metin' };
        cards.forEach(card => {
            tbody.innerHTML += `
                <tr>
                    <td>${typeMapping[card.question_type]}</td>
                    <td>${card.content.substring(0, 30)}...</td>
                    <td>${JSON.stringify(card.correct_answer)}</td>
                    <td><button onclick="window.deleteCard('${card.id}')" class="btn-danger">Sil</button></td>
                </tr>`;
        });
    }
}

async function handleAddCard(e) {
    e.preventDefault();
    const type = document.getElementById('q-type').value;
    const content = document.getElementById('q-content').value;
    const optionsRaw = document.getElementById('q-options').value;
    const answerRaw = document.getElementById('q-answer').value;

    let options = null; let correctAnswer = null;
    if (type !== 'free_text') options = optionsRaw.split(',').map(s => s.trim());
    if (type === 'multi_choice') correctAnswer = answerRaw.split(',').map(s => s.trim());
    else correctAnswer = answerRaw.trim();

    ui.setLoading(true);
    const { error } = await supabase.from('flashcards').insert({ question_type: type, content, options, correct_answer: correctAnswer });
    ui.setLoading(false);
    
    if (error) ui.showError('Soru eklenemedi: ' + error.message);
    else {
        ui.showSuccess('Soru eklendi!');
        document.getElementById('add-card-form').reset();
        loadCards();
    }
}

window.deleteCard = async (id) => {
    if(!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    ui.setLoading(true);
    await supabase.from('flashcards').delete().eq('id', id);
    ui.showSuccess('Soru silindi');
    loadCards();
    ui.setLoading(false);
};

import { initAuth } from './auth.js';
document.addEventListener('DOMContentLoaded', () => initAuth());
