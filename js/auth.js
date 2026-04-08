import { supabase, AppState } from 'https://cdn.doruklu.com/supabase-config.js';
import { ui } from 'https://cdn.doruklu.com/ui.js';
import { initAdminPanel, loadUserLinks, initCardManager } from './app.js';

export async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect_to');
    if (redirectTo) {
        localStorage.setItem('redirect_to', redirectTo);
    }
    
    if (session) {
        await handleLoginSuccess(session.user);
    } else {
        ui.showScreen('auth-screen');
    }

    document.getElementById('google-btn').addEventListener('click', handleGoogleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

async function handleGoogleLogin() {
    const redirectTo = window.location.origin;
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectTo
        }
    });
}

async function handleLoginSuccess(user) {
    const storedRedirect = localStorage.getItem('redirect_to');
    if (storedRedirect) {
        localStorage.removeItem('redirect_to');
        window.location.href = storedRedirect;
        return;
    }

    AppState.user = user;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    AppState.profile = profile || { role: 'player', permissions: {} };
    
    document.getElementById('user-name').textContent = AppState.profile.display_name || user.email;
    
    ui.showScreen('dashboard-screen');
    
    if (AppState.profile.role === 'super_admin' || AppState.profile.role === 'admin') {
        document.getElementById('admin-container').style.display = 'block';
        initAdminPanel();
        initCardManager();
    } else {
        document.getElementById('admin-container').style.display = 'none';
    }
    
    loadUserLinks();
}

async function handleLogout() {
    await supabase.auth.signOut();
    AppState.user = null;
    AppState.profile = null;
    ui.showScreen('auth-screen');
}
