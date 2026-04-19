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
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
        },
        { 
            name: 'Özgür Dashboard', 
            url: 'https://ozgur.doruklu.com',
            key: 'ozgur_dashboard',
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`
        },
        { 
            name: 'Nurcan App', 
            url: 'https://nurcan.doruklu.com',
            key: 'nurcan_app',
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
        }
    ];
    
    appGroups.forEach(group => {
        const hasAccess = isSuper || perms[group.key] === true;
        
        const cardHTML = `
            <a href="${hasAccess ? group.url : '#'}" class="mini-app-card" style="opacity: ${hasAccess ? '1' : '0.5'}; cursor: ${hasAccess ? 'pointer' : 'not-allowed'};">
                <div class="mini-app-icon">${group.icon}</div>
                <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.95rem; margin-bottom:2px;">${group.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary);">${hasAccess ? 'Erişim Aktif' : 'Yetki Gerekli'}</div>
                </div>
                ${hasAccess ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' : ''}
            </a>
        `;
        appsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// ==== ADMIN SUITE (Integrated Management) ====
export async function initAdminPanel() {
    const mgmtBtn = document.getElementById('go-to-mgmt-btn');
    const closeBtn = document.getElementById('close-mgmt-btn');
    const suite = document.getElementById('admin-suite');

    mgmtBtn.onclick = () => {
        suite.style.display = 'block';
        mgmtBtn.style.display = 'none';
        initCardManager(); // Ensure listeners and data are ready
        loadUsersTable();
    };

    closeBtn.onclick = () => {
        suite.style.display = 'none';
        mgmtBtn.style.display = 'block';
    };

    // Tab switching inside suite
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
}

async function loadUsersTable() {
    if (AppState.profile.role !== 'super_admin') {
        document.getElementById('nav-users').style.display = 'none';
        document.getElementById('nav-cards').click();
        return;
    }

    ui.setLoading(true);
    const { data: users } = await supabase.from('profiles').select('*').order('role', { ascending: false });
    ui.setLoading(false);

    if (users) {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = users.map(user => {
            const p = user.permissions || {};
            const isSuper = user.role === 'super_admin';
            return `
                <tr>
                    <td>
                        <div style="font-weight:700; color:var(--text-main);">${user.display_name || (user.email ? user.email.split('@')[0] : 'User ' + user.id.substring(0,8))}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${user.role}</div>
                    </td>
                    <td><label class="toggle"><input type="checkbox" onchange="window.updatePerm('${user.id}', 'toprak_game', this.checked)" ${p.toprak_game || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}><span class="slider"></span></label></td>
                    <td><label class="toggle"><input type="checkbox" onchange="window.updatePerm('${user.id}', 'ozgur_dashboard', this.checked)" ${p.ozgur_dashboard || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}><span class="slider"></span></label></td>
                    <td><label class="toggle"><input type="checkbox" onchange="window.updatePerm('${user.id}', 'nurcan_app', this.checked)" ${p.nurcan_app || isSuper ? 'checked' : ''} ${isSuper ? 'disabled' : ''}><span class="slider"></span></label></td>
                </tr>
            `;
        }).join('');
    }
}

window.updatePerm = async (userId, permKey, newValue) => {
    const { data: profile } = await supabase.from('profiles').select('permissions').eq('id', userId).single();
    let perms = profile?.permissions || {};
    perms[permKey] = newValue;
    
    await supabase.from('profiles').update({ permissions: perms }).eq('id', userId);
}

// ==== CARDS (FLASHCARDS) ====
export function initCardManager() {
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
            const typeColor = { 'single_choice': '#818cf8', 'multi_choice': '#c084fc', 'free_text': '#4ade80' }[card.question_type];
            
            const cardHTML = `
                <div class="code-card">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="color:var(--text-secondary); font-size:0.7rem;">// id: ${card.id.substring(0,8)}</span>
                        <div style="background:${typeColor}22; color:${typeColor}; font-size:0.6rem; padding:2px 6px; border-radius:4px; border:1px solid ${typeColor}44;">${card.question_type}</div>
                    </div>
                    <div style="color:var(--text-main); line-height:1.4;">
                        ${card.content}<br>
                        ${card.options ? `<span style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-top:5px;">Opts: [${card.options.join(', ')}]</span>` : ''}
                        <span style="color:#10b981; font-size:0.8rem; display:block; margin-top:5px;">Ans: ${card.correct_answer}</span>
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:10px;">
                         <button style="background:none; border:none; color:var(--danger); cursor:pointer;" onclick="window.deleteCard('${card.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                         </button>
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
